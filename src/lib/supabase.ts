import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Cloud sync will be disabled.');
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Table Name
export const GOALS_TABLE = 'goals';

/**
 * SQL Schema for this project (Run this in Supabase SQL Editor):
 * 
 * create table public.goals (
 *   id uuid primary key,
 *   owner_address text not null,
 *   name text not null,
 *   target_amount_usd float8 not null,
 *   vault jsonb not null,
 *   risk_tier text not null,
 *   contributions jsonb default '[]'::jsonb,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * alter table public.goals enable row level security;
 * 
 * -- Simple policy: Anyone can read/write for now (for the hackathon demo)
 * create policy "Enable all access for goals" on public.goals
 *   for all using (true) with check (true);
 */
