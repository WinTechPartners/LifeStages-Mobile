-- Apply only after reviewing against the existing churches/church_admins schema.
-- This migration does not enable routes or create an invitation automatically.
begin;
alter table public.churches add column if not exists welcome_message text;
alter table public.churches add column if not exists leadership_contact_name text;
alter table public.churches add column if not exists leadership_contact_email text;
alter table public.churches add column if not exists leadership_contact_phone text;
alter table public.churches add column if not exists leadership_contact_url text;
alter table public.church_admins add column if not exists password_hash text;
-- Password hashes are server-only, including for pre-existing administrator rows.
alter table public.church_admins enable row level security;
revoke all on public.church_admins from public,anon,authenticated;
grant select,insert,update,delete on public.church_admins to service_role;

create table if not exists public.church_published_sermons (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  sermon_date date not null,
  scripture text not null default '' check (length(scripture) <= 300),
  summary text not null default '' check (length(summary) <= 10000),
  video_url text check (length(video_url) <= 2048),
  transcript text check (length(transcript) <= 100000),
  published_at timestamptz not null default clock_timestamp(),
  published_by uuid references public.church_admins(id) on delete set null,
  source_sermon_id uuid references public.church_published_sermons(id),
  analysis_status text not null default 'not_analyzed' check (analysis_status = 'not_analyzed')
);
create index if not exists church_published_sermons_history on public.church_published_sermons (church_id,sermon_date desc,published_at desc);
alter table public.church_published_sermons enable row level security;
revoke all on public.church_published_sermons from public, anon, authenticated;
revoke update on public.church_published_sermons from service_role;
grant select, insert, delete on public.church_published_sermons to service_role;

create table if not exists public.church_management_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  email text not null check (email=lower(email)),
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  used_at timestamptz,
  church_id uuid references public.churches(id) on delete set null
);
alter table public.church_management_invites enable row level security;
revoke all on public.church_management_invites from public, anon, authenticated;
grant select, insert, update, delete on public.church_management_invites to service_role;

create table if not exists public.church_management_auth_limits (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  window_started timestamptz not null default clock_timestamp(),
  attempts integer not null default 0
);
alter table public.church_management_auth_limits enable row level security;
revoke all on public.church_management_auth_limits from public, anon, authenticated;
grant select, insert, update, delete on public.church_management_auth_limits to service_role;

create or replace function public.consume_church_management_attempt(p_key text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare tries integer;
begin
  insert into public.church_management_auth_limits(key,window_started,attempts) values(p_key,clock_timestamp(),1)
  on conflict(key) do update set
    window_started=case when church_management_auth_limits.window_started < clock_timestamp()-interval '15 minutes' then clock_timestamp() else church_management_auth_limits.window_started end,
    attempts=case when church_management_auth_limits.window_started < clock_timestamp()-interval '15 minutes' then 1 else least(church_management_auth_limits.attempts+1,11) end
  returning attempts into tries;
  -- No email/IP stored. Opportunistic removal bounds stale throttle records.
  delete from public.church_management_auth_limits where window_started < clock_timestamp()-interval '1 day';
  return tries <= 10;
end;
$$;

create or replace function public.accept_church_management_invite(p_token_hash text,p_email text,p_password_hash text,p_admin_name text,p_slug text,p_church_name text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare invitation public.church_management_invites%rowtype; new_church uuid:=gen_random_uuid(); new_admin uuid:=gen_random_uuid();
begin
  if p_password_hash !~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$' or p_slug !~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' or length(p_church_name) not between 1 and 160 or length(p_admin_name) not between 1 and 120 then return null; end if;
  select * into invitation from public.church_management_invites
    where token_hash=p_token_hash and email=lower(p_email) and used_at is null and expires_at>clock_timestamp() for update;
  if not found then return null; end if;
  if exists(select 1 from public.churches where slug=p_slug) then return null; end if;
  insert into public.churches(id,slug,name,primary_color,secondary_color,tier,sermon_review_enabled,sermon_prep_enabled,trueteachings_enabled)
    values(new_church,p_slug,p_church_name,'#1e3a5f','#d4a574','starter',true,false,false);
  insert into public.church_admins(id,church_id,email,name,role,password_hash)
    values(new_admin,new_church,lower(p_email),p_admin_name,'owner',p_password_hash);
  update public.church_management_invites set used_at=clock_timestamp(),church_id=new_church where id=invitation.id;
  return jsonb_build_object('church_id',new_church,'admin_id',new_admin);
exception when unique_violation then
  -- Concurrent slug claims roll back this whole registration; invite stays unused.
  return null;
end;
$$;

create or replace function public.publish_church_sermon(p_church_id uuid,p_admin_id uuid,p_sermon jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare edition public.church_published_sermons%rowtype; source_id uuid:=(p_sermon->>'source_sermon_id')::uuid;
begin
  if not exists(select 1 from public.church_admins where id=p_admin_id and church_id=p_church_id and role in ('owner','pastor','admin')) then return null; end if;
  if source_id is not null and not exists(select 1 from public.church_published_sermons where id=source_id and church_id=p_church_id) then return null; end if;
  insert into public.church_published_sermons(id,church_id,title,sermon_date,scripture,summary,video_url,transcript,published_by,source_sermon_id)
  values((p_sermon->>'id')::uuid,p_church_id,p_sermon->>'title',(p_sermon->>'sermon_date')::date,p_sermon->>'scripture',p_sermon->>'summary',nullif(p_sermon->>'video_url',''),p_sermon->>'transcript',p_admin_id,source_id)
  returning * into edition;
  return to_jsonb(edition);
end;
$$;

revoke all on function public.consume_church_management_attempt(text),public.accept_church_management_invite(text,text,text,text,text,text),public.publish_church_sermon(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.consume_church_management_attempt(text),public.accept_church_management_invite(text,text,text,text,text,text),public.publish_church_sermon(uuid,uuid,jsonb) to service_role;
comment on table public.church_published_sermons is 'Immutable manual sermon editions. Original editions remain addressable. No TDE analysis is implied; member public API selects safe published fields.';
commit;
