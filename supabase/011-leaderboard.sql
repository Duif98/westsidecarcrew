-- ============================================================
-- West Side Car Crew — leaderboard
-- Aggregated per-member stats for the ranglisten. Security-definer so it can
-- count across tables, but returns only public-safe totals.
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
-- Requires 007-comments to have run first (references public.comments).
-- ============================================================

create or replace function public.leaderboard()
returns table (
  user_id        uuid,
  username       text,
  member_since   timestamptz,
  photos         bigint,
  likes_received bigint,
  comments       bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.username,
    p.created_at,
    coalesce(ph.cnt, 0),
    coalesce(lk.cnt, 0),
    coalesce(cm.cnt, 0)
  from public.profiles p
  left join (
    select user_id, count(*) cnt
    from public.photos
    where visibility = 'public' and approved
    group by user_id
  ) ph on ph.user_id = p.id
  left join (
    select ph.user_id, count(*) cnt
    from public.likes l
    join public.photos ph on ph.id = l.photo_id
    where ph.visibility = 'public' and ph.approved
    group by ph.user_id
  ) lk on lk.user_id = p.id
  left join (
    select user_id, count(*) cnt
    from public.comments
    group by user_id
  ) cm on cm.user_id = p.id
  order by coalesce(lk.cnt, 0) desc, coalesce(ph.cnt, 0) desc, p.username asc;
$$;

grant execute on function public.leaderboard() to anon, authenticated;
