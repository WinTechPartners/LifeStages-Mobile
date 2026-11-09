-- Apply separately with a privileged migration account. This file is not run by the app.
-- Collection is opt-in, disabled by default, and represents consenting installations/devices.
-- No anonymous/authenticated role can read individual events or execute these functions.
begin;

create table if not exists public.church_analytics_events (
  id bigint generated always as identity primary key,
  event_id uuid not null,
  church_id uuid not null references public.churches(id) on delete cascade,
  device_key text not null check (device_key ~ '^[a-f0-9]{64}$'),
  session_key text not null check (session_key ~ '^[a-f0-9]{64}$'),
  view_key text check (view_key ~ '^[a-f0-9]{64}$'),
  contract_version smallint not null check (contract_version = 1),
  consent_version smallint not null check (consent_version = 1),
  consented_at timestamptz not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  kind text not null check (kind in ('app_open','chapter_displayed','verse_selected','explanation_requested','explanation_displayed','lifeline_selected','question_sent','content_displayed','foreground_interval')),
  age_band text check (age_band in ('13-17','18-24','25-34','35-44','45-54','55-64','65-74','75+','legacy-18-23','legacy-24-64','legacy-65+')),
  situation text check (situation in ('general','new_beginnings','struggling','transitions')),
  topic_id text check (length(topic_id) <= 64),
  sermon_id uuid,
  content_type text check (content_type in ('sermon','reflection','context','stories','poetry','imagery','songs','bible')),
  channel text check (channel = 'chat'),
  scripture jsonb,
  active_ms integer check (active_ms between 1 and 300000),
  unique (church_id, device_key, event_id),
  check (occurred_at >= consented_at),
  check ((kind = 'foreground_interval') = (active_ms is not null)),
  check (kind <> 'question_sent' or channel = 'chat')
);
create index if not exists church_analytics_events_time on public.church_analytics_events (church_id, occurred_at);
create index if not exists church_analytics_events_received on public.church_analytics_events (received_at);

-- One row per church/device serializes ingestion and erasure, including concurrent requests.
-- The deletion cutoff survives erasure so delayed requests cannot recreate erased events.
create table if not exists public.church_analytics_device_control (
  church_id uuid not null references public.churches(id) on delete cascade,
  device_key text not null check (device_key ~ '^[a-f0-9]{64}$'),
  blocked_before timestamptz,
  rate_day date not null default (current_timestamp at time zone 'UTC')::date,
  request_count integer not null default 0,
  event_count integer not null default 0,
  primary key (church_id, device_key)
);
alter table public.church_analytics_events enable row level security;
alter table public.church_analytics_device_control enable row level security;
revoke all on public.church_analytics_events, public.church_analytics_device_control from public, anon, authenticated;
revoke all on sequence public.church_analytics_events_id_seq from public, anon, authenticated;
grant select, insert, delete on public.church_analytics_events to service_role;
grant select, insert, update, delete on public.church_analytics_device_control to service_role;
grant usage, select on sequence public.church_analytics_events_id_seq to service_role;

create or replace function public.ingest_church_analytics_events(p_church_id uuid, p_device_key text, p_events jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  control public.church_analytics_device_control%rowtype;
  today date := (clock_timestamp() at time zone 'UTC')::date;
  batch_size integer;
  newly_inserted integer;
  new_count integer;
begin
  if jsonb_typeof(p_events) <> 'array' then raise exception 'Invalid event batch'; end if;
  batch_size := jsonb_array_length(p_events);
  if batch_size < 1 or batch_size > 25 or p_device_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid event batch'; end if;
  if exists (select 1 from jsonb_array_elements(p_events) e where e->>'church_id' is distinct from p_church_id::text or e->>'device_key' is distinct from p_device_key) then raise exception 'Invalid event scope'; end if;

  insert into public.church_analytics_device_control(church_id, device_key) values (p_church_id, p_device_key) on conflict do nothing;
  select * into strict control from public.church_analytics_device_control where church_id = p_church_id and device_key = p_device_key for update;
  if control.rate_day <> today then
    update public.church_analytics_device_control set rate_day = today, request_count = 0, event_count = 0 where church_id = p_church_id and device_key = p_device_key;
    control.request_count := 0;
    control.event_count := 0;
  end if;
  if control.request_count >= 200 then return jsonb_build_object('inserted',0,'duplicate',0,'limited',true); end if;
  update public.church_analytics_device_control set request_count = request_count + 1 where church_id = p_church_id and device_key = p_device_key;
  if control.blocked_before is not null and exists (select 1 from jsonb_array_elements(p_events) e where (e->>'consented_at')::timestamptz <= control.blocked_before) then
    return jsonb_build_object('inserted',0,'duplicate',0,'limited',false,'revoked',true);
  end if;
  select count(*) into new_count from jsonb_array_elements(p_events) e where not exists (
    select 1 from public.church_analytics_events existing where existing.church_id = p_church_id and existing.device_key = p_device_key and existing.event_id = (e->>'event_id')::uuid
  );
  if control.event_count + new_count > 1000 then return jsonb_build_object('inserted',0,'duplicate',0,'limited',true); end if;
  insert into public.church_analytics_events(event_id,church_id,device_key,session_key,view_key,contract_version,consent_version,consented_at,occurred_at,kind,age_band,situation,topic_id,sermon_id,content_type,channel,scripture,active_ms)
  select event_id,church_id,device_key,session_key,view_key,contract_version,consent_version,consented_at,occurred_at,kind,age_band,situation,topic_id,sermon_id,content_type,channel,scripture,active_ms
  from jsonb_to_recordset(p_events) as e(event_id uuid,church_id uuid,device_key text,session_key text,view_key text,contract_version smallint,consent_version smallint,consented_at timestamptz,occurred_at timestamptz,kind text,age_band text,situation text,topic_id text,sermon_id uuid,content_type text,channel text,scripture jsonb,active_ms integer)
  on conflict (church_id,device_key,event_id) do nothing;
  get diagnostics newly_inserted = row_count;
  update public.church_analytics_device_control set event_count = event_count + newly_inserted where church_id = p_church_id and device_key = p_device_key;
  return jsonb_build_object('inserted',newly_inserted,'duplicate',batch_size-newly_inserted,'limited',false);
end;
$$;

create or replace function public.erase_church_analytics_device(p_church_id uuid, p_device_key text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  -- Unknown church/device also returns success without disclosing whether records existed.
  insert into public.church_analytics_device_control(church_id, device_key)
  select id,p_device_key from public.churches where id=p_church_id on conflict do nothing;
  perform 1 from public.church_analytics_device_control where church_id=p_church_id and device_key=p_device_key for update;
  update public.church_analytics_device_control set blocked_before=clock_timestamp() where church_id=p_church_id and device_key=p_device_key;
  delete from public.church_analytics_events where church_id=p_church_id and device_key=p_device_key;
end;
$$;

-- Schedule daily with the platform scheduler before enabling collection.
create or replace function public.prune_church_analytics_events()
returns bigint language plpgsql security invoker set search_path = public, pg_temp as $$
declare removed bigint;
begin
  delete from public.church_analytics_events where occurred_at < clock_timestamp() - interval '90 days';
  get diagnostics removed = row_count;
  -- Preserve erasure cutoffs; ordinary empty control rows can expire after 90 days.
  delete from public.church_analytics_device_control c where c.blocked_before is null and c.rate_day < current_date-90
    and not exists(select 1 from public.church_analytics_events e where e.church_id=c.church_id and e.device_key=c.device_key);
  return removed;
end;
$$;

revoke all on function public.ingest_church_analytics_events(uuid,text,jsonb), public.erase_church_analytics_device(uuid,text), public.prune_church_analytics_events() from public, anon, authenticated;
grant execute on function public.ingest_church_analytics_events(uuid,text,jsonb), public.erase_church_analytics_device(uuid,text), public.prune_church_analytics_events() to service_role;
comment on table public.church_analytics_events is 'Consenting device activity only. No raw questions, audio, account identity, attendance, diagnosis, or congregation prevalence. No direct dashboard/public reads. Future aggregates require church authorization and suppression of small device cohorts.';
commit;
