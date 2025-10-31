-- Create batched_items table for tracking house-made ingredients
-- Run this in your Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.batched_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  batch_size numeric,
  batch_unit text,
  yield_amount numeric,
  yield_unit text,
  cost_per_batch numeric,
  shelf_life_days integer,
  storage_notes text,
  recipe_notes text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS (Row Level Security)
alter table public.batched_items enable row level security;

-- Create policy to allow all operations for authenticated users
-- Adjust this policy based on your security needs
create policy "Allow all operations for authenticated users"
  on public.batched_items
  for all
  using (true)
  with check (true);

-- Create index on name for faster searches
create index if not exists idx_batched_items_name on public.batched_items (name);

-- Create index on is_active for filtering active items
create index if not exists idx_batched_items_is_active on public.batched_items (is_active);

