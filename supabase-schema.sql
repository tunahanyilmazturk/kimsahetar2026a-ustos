-- ═══════════════════════════════════════════════════════════════════════════
-- Sahtekar Kim? — Supabase Veritabanı Şeması
-- ═══════════════════════════════════════════════════════════════════════════
-- Bu SQL'i Supabase Dashboard → SQL Editor → New query olarak çalıştır.
-- Sırasıyla: tablolar → trigger → RLS politikaları → view
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. PROFILES ────────────────────────────────────────────────────────────
-- auth.users ile 1:1 — signup'da otomatik oluşturulur (trigger ile)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_id text unique not null default '',
  username text not null default 'Oyuncu',
  avatar text not null default 'avatar_default',
  frame text,
  coins integer not null default 100,
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

-- ─── 2. STATS ───────────────────────────────────────────────────────────────

create table if not exists public.stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_played integer not null default 0,
  wins integer not null default 0,
  wins_as_impostor integer not null default 0,
  wins_as_player integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ─── 3. INVENTORY ───────────────────────────────────────────────────────────

create table if not exists public.inventory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatars text[] not null default '{}',
  frames text[] not null default '{frame_none}',
  equipped_avatar text not null default 'avatar_default',
  equipped_frame text,
  updated_at timestamptz not null default now()
);

-- ─── 4. ACHIEVEMENTS ────────────────────────────────────────────────────────

create table if not exists public.achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ─── 5. DAILY QUESTS ────────────────────────────────────────────────────────

create table if not exists public.daily_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  date text not null, -- YYYY-MM-DD
  progress integer not null default 0,
  completed boolean not null default false,
  claimed boolean not null default false,
  primary key (user_id, quest_id, date)
);

-- ─── 6. WEEKLY QUESTS ───────────────────────────────────────────────────────

create table if not exists public.weekly_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  week_key text not null, -- YYYY-WW
  progress integer not null default 0,
  completed boolean not null default false,
  claimed boolean not null default false,
  primary key (user_id, quest_id, week_key)
);

-- ─── 7. FRIENDS ─────────────────────────────────────────────────────────────

create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | blocked
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ─── 8. ROOMS (online oyun) ─────────────────────────────────────────────────

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'LOBBY', -- LOBBY | PLAYING | VOTING | FINISHED
  settings jsonb not null default '{}',
  current_word text,
  current_category text,
  impostor_id uuid,
  turn_index integer not null default 0,
  round integer not null default 1,
  winner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 9. ROOM PLAYERS ────────────────────────────────────────────────────────

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ─── 10. ROOM CHAT ──────────────────────────────────────────────────────────

create table if not exists public.room_chat (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- ─── 11. ROOM VOTES ─────────────────────────────────────────────────────────

create table if not exists public.room_votes (
  room_id uuid not null references public.rooms(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, voter_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Yeni kullanıcı signup'da profile + stats + inventory oluştur
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Player ID oluştur (SK-XXXXXXXX formatı)
  insert into public.profiles (id, username, player_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Oyuncu'),
    'SK-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8))
  );

  insert into public.stats (user_id) values (new.id);

  insert into public.inventory (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- LEADERBOARD VIEW
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.leaderboard as
select
  p.player_id,
  p.username,
  s.wins,
  p.xp,
  p.level,
  s.games_played,
  s.updated_at as last_played
from public.profiles p
join public.stats s on s.user_id = p.id
order by s.wins desc, p.xp desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) Politikaları
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PROFILES: herkes okuyabilir (leaderboard için), sadece sahibi yazabilir
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- ─── STATS: herkes okuyabilir, sadece sahibi yazabilir
alter table public.stats enable row level security;
create policy "stats_select" on public.stats for select using (true);
create policy "stats_update_own" on public.stats for update using (auth.uid() = user_id);
create policy "stats_insert_own" on public.stats for insert with check (auth.uid() = user_id);

-- ─── INVENTORY: sadece sahibi okuyabilir ve yazabilir
alter table public.inventory enable row level security;
create policy "inventory_select_own" on public.inventory for select using (auth.uid() = user_id);
create policy "inventory_update_own" on public.inventory for update using (auth.uid() = user_id);
create policy "inventory_insert_own" on public.inventory for insert with check (auth.uid() = user_id);

-- ─── ACHIEVEMENTS: sadece sahibi okuyabilir ve yazabilir
alter table public.achievements enable row level security;
create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);
create policy "achievements_insert_own" on public.achievements for insert with check (auth.uid() = user_id);
create policy "achievements_delete_own" on public.achievements for delete using (auth.uid() = user_id);

-- ─── DAILY QUESTS: sadece sahibi okuyabilir ve yazabilir
alter table public.daily_quests enable row level security;
create policy "daily_quests_select_own" on public.daily_quests for select using (auth.uid() = user_id);
create policy "daily_quests_upsert_own" on public.daily_quests for insert with check (auth.uid() = user_id);
create policy "daily_quests_update_own" on public.daily_quests for update using (auth.uid() = user_id);

-- ─── WEEKLY QUESTS: sadece sahibi okuyabilir ve yazabilir
alter table public.weekly_quests enable row level security;
create policy "weekly_quests_select_own" on public.weekly_quests for select using (auth.uid() = user_id);
create policy "weekly_quests_upsert_own" on public.weekly_quests for insert with check (auth.uid() = user_id);
create policy "weekly_quests_update_own" on public.weekly_quests for update using (auth.uid() = user_id);

-- ─── FRIENDS: kullanıcı kendi arkadaşlarını görebilir, ekleyebilir, silebilir
alter table public.friends enable row level security;
create policy "friends_select_own" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friends_insert_own" on public.friends for insert with check (auth.uid() = user_id);
create policy "friends_delete_own" on public.friends for delete using (auth.uid() = user_id);
create policy "friends_update_own" on public.friends for update using (auth.uid() = user_id);

-- ─── ROOMS: oda üyeleri görebilir, host oluşturabilir/güncelleyebilir
alter table public.rooms enable row level security;
create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert_own" on public.rooms for insert with check (auth.uid() = host_id);
create policy "rooms_update_own" on public.rooms for update using (auth.uid() = host_id);
create policy "rooms_delete_own" on public.rooms for delete using (auth.uid() = host_id);

-- ─── ROOM PLAYERS: oda üyeleri görebilir, kendisi katılabilir/ayrılabilir
alter table public.room_players enable row level security;
create policy "room_players_select" on public.room_players for select using (true);
create policy "room_players_insert_own" on public.room_players for insert with check (auth.uid() = user_id);
create policy "room_players_delete_own" on public.room_players for delete using (auth.uid() = user_id);

-- ─── ROOM CHAT: oda üyeleri görebilir, kendisi yazabilir
alter table public.room_chat enable row level security;
create policy "room_chat_select" on public.room_chat for select using (true);
create policy "room_chat_insert_own" on public.room_chat for insert with check (auth.uid() = user_id);

-- ─── ROOM VOTES: oda üyeleri görebilir, kendisi oy verebilir
alter table public.room_votes enable row level security;
create policy "room_votes_select" on public.room_votes for select using (true);
create policy "room_votes_insert_own" on public.room_votes for insert with check (auth.uid() = voter_id);
create policy "room_votes_delete_own" on public.room_votes for delete using (auth.uid() = voter_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME: tabloları realtime'a ekle
-- ═══════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.room_chat;
alter publication supabase_realtime add table public.room_votes;
