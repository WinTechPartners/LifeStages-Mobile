-- Discovery reuses a church's normal YouTube publishing workflow. No transcript/TDE worker is implied.
begin;
create table if not exists public.church_sermon_sources (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null unique references public.churches(id) on delete cascade,
  kind text not null check(kind in ('youtube_channel','youtube_playlist')),
  source_url text not null,
  source_key text not null,
  enabled boolean not null default false,
  resolved_playlist_id text,
  scan_cursor text,
  last_checked_at timestamptz,
  next_check_at timestamptz not null default clock_timestamp(),
  backfill_complete boolean not null default false,
  backfill_count integer not null default 0 check(backfill_count between 0 and 100),
  sync_status text not null default 'pending' check(sync_status in ('idle','pending','syncing','waiting_configuration','error')),
  last_error_code text,
  lease_id uuid,
  lease_expires_at timestamptz
);
create table if not exists public.church_imported_sermons (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  source_id uuid references public.church_sermon_sources(id) on delete set null,
  source_url text not null,
  external_id text not null check(external_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check(length(title) between 1 and 500),
  published_at timestamptz not null,
  video_url text not null,
  source_description text not null default '' check(length(source_description) <= 5000),
  transcript_status text not null default 'pending' check(transcript_status='pending'),
  analysis_status text not null default 'pending' check(analysis_status='pending'),
  discovered_at timestamptz not null default clock_timestamp(),
  unique(church_id,external_id)
);
create index if not exists church_imported_sermons_chronology on public.church_imported_sermons(church_id,published_at desc);
alter table public.church_sermon_sources enable row level security;
alter table public.church_imported_sermons enable row level security;
revoke all on public.church_sermon_sources,public.church_imported_sermons from public,anon,authenticated;
grant select,insert,update,delete on public.church_sermon_sources to service_role;
grant select,insert,delete on public.church_imported_sermons to service_role;
revoke update on public.church_imported_sermons from service_role;

create or replace function public.save_church_sermon_source(p_church_id uuid,p_admin_id uuid,p_kind text,p_source_url text,p_source_key text,p_enabled boolean)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.church_admins where id=p_admin_id and church_id=p_church_id and role in ('owner','pastor','admin')) then return false; end if;
  if p_kind not in ('youtube_channel','youtube_playlist') or p_source_url !~ '^https://www\.youtube\.com/' then return false; end if;
  insert into public.church_sermon_sources(church_id,kind,source_url,source_key,enabled,sync_status)
    values(p_church_id,p_kind,p_source_url,p_source_key,p_enabled,case when p_enabled then 'pending' else 'idle' end)
  on conflict(church_id) do update set
    kind=excluded.kind,source_url=excluded.source_url,source_key=excluded.source_key,enabled=excluded.enabled,
    resolved_playlist_id=case when church_sermon_sources.kind=excluded.kind and church_sermon_sources.source_key=excluded.source_key then church_sermon_sources.resolved_playlist_id else null end,
    scan_cursor=case when church_sermon_sources.kind=excluded.kind and church_sermon_sources.source_key=excluded.source_key then church_sermon_sources.scan_cursor else null end,
    backfill_count=case when church_sermon_sources.kind=excluded.kind and church_sermon_sources.source_key=excluded.source_key then church_sermon_sources.backfill_count else 0 end,
    backfill_complete=case when church_sermon_sources.kind=excluded.kind and church_sermon_sources.source_key=excluded.source_key then church_sermon_sources.backfill_complete else false end,
    sync_status=excluded.sync_status,last_error_code=null,next_check_at=clock_timestamp(),lease_id=null,lease_expires_at=null;
  return true;
end;
$$;

create or replace function public.claim_church_sermon_sources(p_limit integer default 2)
returns setof public.church_sermon_sources language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  return query
  with due as (
    select id from public.church_sermon_sources where enabled and next_check_at<=clock_timestamp()
      and (lease_expires_at is null or lease_expires_at<clock_timestamp())
    order by next_check_at limit least(greatest(p_limit,1),2) for update skip locked
  )
  update public.church_sermon_sources s set lease_id=gen_random_uuid(),lease_expires_at=clock_timestamp()+interval '2 minutes',sync_status='syncing'
    from due where s.id=due.id returning s.*;
end;
$$;

create or replace function public.complete_church_sermon_scan(p_source_id uuid,p_lease_id uuid,p_items jsonb,p_playlist_id text,p_next_cursor text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare source public.church_sermon_sources%rowtype; inserted_count integer; initial_count integer;
begin
  select * into source from public.church_sermon_sources where id=p_source_id and lease_id=p_lease_id and enabled for update;
  if not found then return jsonb_build_object('inserted',0,'stale',true); end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 then raise exception 'Invalid scan batch'; end if;
  insert into public.church_imported_sermons(church_id,source_id,source_url,external_id,title,published_at,video_url,source_description)
    select source.church_id,source.id,source.source_url,i.external_id,i.title,i.published_at,i.video_url,i.source_description
    from jsonb_to_recordset(p_items) as i(external_id text,title text,published_at timestamptz,video_url text,source_description text)
  on conflict(church_id,external_id) do nothing;
  get diagnostics inserted_count=row_count;
  -- Count new distinct archive rows, never repeat sightings. Freeze the initial count once done.
  initial_count:=case when source.backfill_complete then source.backfill_count else least(100,source.backfill_count+inserted_count) end;
  update public.church_sermon_sources set resolved_playlist_id=p_playlist_id,scan_cursor=p_next_cursor,
    backfill_count=initial_count,backfill_complete=source.backfill_complete or initial_count>=100 or p_next_cursor is null,
    last_checked_at=clock_timestamp(),next_check_at=clock_timestamp()+case when p_next_cursor is null then interval '1 hour' else interval '5 minutes' end,
    sync_status=case when p_next_cursor is null then 'idle' else 'pending' end,last_error_code=null,lease_id=null,lease_expires_at=null where id=source.id;
  return jsonb_build_object('inserted',inserted_count,'stale',false);
end;
$$;

create or replace function public.fail_church_sermon_scan(p_source_id uuid,p_lease_id uuid,p_error_code text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  update public.church_sermon_sources set last_checked_at=clock_timestamp(),next_check_at=clock_timestamp()+interval '1 hour',sync_status='error',last_error_code=p_error_code,
    scan_cursor=case when p_error_code='youtube_cursor_expired' then null else scan_cursor end,lease_id=null,lease_expires_at=null
    where id=p_source_id and lease_id=p_lease_id;
end;
$$;
revoke all on function public.save_church_sermon_source(uuid,uuid,text,text,text,boolean),public.claim_church_sermon_sources(integer),public.complete_church_sermon_scan(uuid,uuid,jsonb,text,text),public.fail_church_sermon_scan(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.save_church_sermon_source(uuid,uuid,text,text,text,boolean),public.claim_church_sermon_sources(integer),public.complete_church_sermon_scan(uuid,uuid,jsonb,text,text),public.fail_church_sermon_scan(uuid,uuid,text) to service_role;
comment on table public.church_imported_sermons is 'Source upload metadata, not analyzed sermons. The original YouTube description is not a generated summary. Stable church/video identity; pending transcript and analysis until a real processor is integrated.';
commit;
