BEGIN;
ALTER TABLE public.church_analytics_events DROP CONSTRAINT IF EXISTS church_analytics_events_age_band_check;
ALTER TABLE public.church_analytics_events ADD CONSTRAINT church_analytics_events_age_band_check CHECK (age_band IN ('13-15','16-17','18-24','25-39','40-54','55-64','65-74','75+','13-17','25-34','35-44','45-54','legacy-18-23','legacy-24-64','legacy-65+'));
ALTER TABLE public.church_analytics_events ADD COLUMN IF NOT EXISTS age_taxonomy_version smallint CHECK(age_taxonomy_version IN(1,2)), ADD COLUMN IF NOT EXISTS life_circumstances text[], ADD COLUMN IF NOT EXISTS circumstance_taxonomy_version smallint CHECK(circumstance_taxonomy_version=2), ADD COLUMN IF NOT EXISTS declarations_updated_at timestamptz;
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
  insert into public.church_analytics_events(event_id,church_id,device_key,session_key,view_key,contract_version,consent_version,consented_at,occurred_at,kind,age_band,situation,topic_id,sermon_id,content_type,channel,scripture,active_ms,age_taxonomy_version,life_circumstances,circumstance_taxonomy_version,declarations_updated_at)
  select event_id,church_id,device_key,session_key,view_key,contract_version,consent_version,consented_at,occurred_at,kind,age_band,situation,topic_id,sermon_id,content_type,channel,scripture,active_ms,age_taxonomy_version,life_circumstances,circumstance_taxonomy_version,declarations_updated_at
  from jsonb_to_recordset(p_events) as e(event_id uuid,church_id uuid,device_key text,session_key text,view_key text,contract_version smallint,consent_version smallint,consented_at timestamptz,occurred_at timestamptz,kind text,age_band text,situation text,topic_id text,sermon_id uuid,content_type text,channel text,scripture jsonb,active_ms integer,age_taxonomy_version smallint,life_circumstances text[],circumstance_taxonomy_version smallint,declarations_updated_at timestamptz)
  on conflict (church_id,device_key,event_id) do nothing;
  get diagnostics newly_inserted = row_count;
  update public.church_analytics_device_control set event_count = event_count + newly_inserted where church_id = p_church_id and device_key = p_device_key;
  return jsonb_build_object('inserted',newly_inserted,'duplicate',batch_size-newly_inserted,'limited',false);
end;
$$;


COMMIT;
