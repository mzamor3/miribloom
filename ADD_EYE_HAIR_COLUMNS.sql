-- Run once in Supabase SQL Editor
alter table public.beauty_profiles
  add column if not exists eye_color text,
  add column if not exists hair_color text;
