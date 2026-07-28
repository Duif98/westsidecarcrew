-- ============================================================
-- West Side Car Crew — meet reminders
-- Marks meets as reminded + schedules the reminder push job.
-- Run in Supabase → SQL Editor AFTER deploying the "meet-reminders" function.
-- Safe to re-run.
-- ============================================================

-- Track which meets have already had a reminder sent (so it fires once).
alter table public.events add column if not exists reminder_sent_at timestamptz;

-- Scheduling extensions (available on Supabase).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every 15 minutes, ask the Edge Function to send reminders for meets that are
-- about to start. The function is idempotent (reminder_sent_at guard), so a
-- missed tick just catches up on the next run.
do $$
begin
  perform cron.unschedule('meet-reminders');
exception when others then
  null; -- not scheduled yet
end $$;

select cron.schedule(
  'meet-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://neezyfqzxhpxhjrefuam.supabase.co/functions/v1/meet-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- To stop reminders later:  select cron.unschedule('meet-reminders');
-- To see scheduled jobs:     select * from cron.job;
-- To see recent runs:        select * from cron.job_run_details order by start_time desc limit 20;
