-- ═══════════════════════════════════════════════════════════════════════════
-- Sahtekar Kim? — Supabase Veritabanı Şeması (Birleştirilmiş)
-- ═══════════════════════════════════════════════════════════════════════════
-- Bu SQL'i Supabase Dashboard → SQL Editor → New query olarak çalıştır.
-- Tüm tablolar, sütunlar, RLS, trigger, view ve realtime ayarları tek dosyada.
-- idempotent — tekrar çalıştırırsanız hata vermez (if not exists / or replace).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. EXTENSION ──────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLOLAR
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
  points integer not null default 0,          -- puan sistemi (liderlik sıralaması)
  updated_at timestamptz not null default now()
);

-- Eski veritabanlarına points sütunu ekle
alter table public.stats add column if not exists points integer not null default 0;

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
  voted_impostor_id uuid,       -- oyuncuların oyladığı sahtekar ID
  impostor_guess text,           -- sahtekarın kelime tahmini
  turn_index integer not null default 0,
  round integer not null default 1,
  winner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 9. ROOM PLAYERS ────────────────────────────────────────────────────────

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,  -- nullable: botlar için null
  is_bot boolean not null default false,
  bot_name text,                    -- botlar için isim
  bot_avatar text,                  -- botlar için avatar
  bot_difficulty text not null default 'SMART',  -- EASY | SMART | EXPERT
  is_ready boolean not null default false,
  seat integer not null default 0,        -- turn order için sıra numarası
  passed boolean not null default false,   -- pas durumu
  joined_at timestamptz not null default now()
);

-- Eski veritabanlarına bot sütunları ekle
alter table public.room_players add column if not exists id uuid default gen_random_uuid();
alter table public.room_players add column if not exists is_bot boolean not null default false;
alter table public.room_players add column if not exists bot_name text;
alter table public.room_players add column if not exists bot_avatar text;
alter table public.room_players add column if not exists bot_difficulty text not null default 'SMART';

-- Realtime update için replica identity gerekli
alter table public.room_players replica identity full;

-- Eski primary key (room_id, user_id) varsa kaldır — user_id artık nullable (botlar için)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'room_players_pkey'
      and contype = 'p'
      and conrelid = 'public.room_players'::regclass
  ) then
    alter table public.room_players drop constraint room_players_pkey;
  end if;
end $$;

-- id sütunu yoksa ekle ve primary key yap
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where contype = 'p'
      and conrelid = 'public.room_players'::regclass
  ) then
    -- id null olan satırlara uuid ver
    update public.room_players set id = gen_random_uuid() where id is null;
    -- id not null yap
    alter table public.room_players alter column id set not null;
    -- primary key ekle
    alter table public.room_players add primary key (id);
  end if;
end $$;

-- user_id nullable yap (botlar için)
alter table public.room_players alter column user_id drop not null;

-- Gerçek oyuncular için unique constraint (bir oyuncu bir odada bir kez)
create unique index if not exists idx_room_players_user
  on public.room_players(room_id, user_id)
  where is_bot = false and user_id is not null;

-- Botlar için unique constraint (aynı isimde bot bir odada bir kez)
create unique index if not exists idx_room_players_bot
  on public.room_players(room_id, bot_name)
  where is_bot = true;

-- ─── 10. ROOM CHAT ──────────────────────────────────────────────────────────

create table if not exists public.room_chat (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  text text not null,
  message_type text not null default 'hint', -- hint | system | vote
  created_at timestamptz not null default now()
);

-- Eski veritabanlarına message_type sütunu ekle
alter table public.room_chat add column if not exists message_type text not null default 'hint';

-- ─── 11. ROOM VOTES ─────────────────────────────────────────────────────────

create table if not exists public.room_votes (
  room_id uuid not null references public.rooms(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, voter_id)
);

-- ─── 12. ROOM INVITES (oda davet sistemi) ───────────────────────────────────

create table if not exists public.room_invites (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  room_code   text not null,
  inviter_id  uuid not null references auth.users(id) on delete cascade,
  invitee_id  uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','rejected','expired')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_room_invites_invitee on public.room_invites(invitee_id, status);
create index if not exists idx_room_invites_inviter on public.room_invites(inviter_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER 1: Yeni kullanıcı signup'da profile + stats + inventory oluştur
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_player_id text;
  v_max_id integer;
begin
  -- Sıralı player ID: mevcut max sayısal ID + 1 (ilk kullanıcı = 1)
  select coalesce(max(player_id::integer), 0)
    into v_max_id
    from public.profiles
    where player_id ~ '^[0-9]+$';

  v_player_id := (v_max_id + 1)::text;

  insert into public.profiles (id, username, player_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Oyuncu'),
    v_player_id
  );

  insert into public.stats (user_id) values (new.id);

  insert into public.inventory (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER 2: Oda otomatik kapanma + host transferi
-- Son oyuncu ayrılırsa oda silinir, host ayrılırsa en eski oyuncuya devir
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_room_player_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_count integer;
  new_host_id uuid;
  room_state text;
begin
  select state into room_state from rooms where id = old.room_id;

  select count(*) into remaining_count
  from room_players
  where room_id = old.room_id;

  -- Oda tamamen boş → sil (cascade: chat, votes, invites)
  if remaining_count = 0 then
    delete from rooms where id = old.room_id;
    return old;
  end if;

  -- Host ayrıldı ve hala oyuncu var → en eski oyuncuya devret
  if old.user_id = (select host_id from rooms where id = old.room_id) then
    select user_id into new_host_id
    from room_players
    where room_id = old.room_id
    order by joined_at asc
    limit 1;

    if new_host_id is not null then
      update rooms set host_id = new_host_id, updated_at = now() where id = old.room_id;
    end if;
  end if;

  -- Oyun sırasında oyuncu <3 → FINISHED
  if remaining_count < 3 and room_state in ('PLAYING', 'VOTING') then
    update rooms set state = 'FINISHED', winner = 'abandoned', updated_at = now() where id = old.room_id;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_room_player_leave on public.room_players;
create trigger trg_room_player_leave
  after delete on public.room_players
  for each row execute function public.handle_room_player_leave();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER 3: rooms.updated_at otomatik güncelleme
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.update_room_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_room_timestamp on public.rooms;
create trigger trg_room_timestamp
  before update on public.rooms
  for each row execute function public.update_room_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════
-- LEADERBOARD VIEW
-- ═══════════════════════════════════════════════════════════════════════════

-- Eski view'u tamamen kaldır (sütun değişikliği için drop gerekir)
drop view if exists public.leaderboard;

create view public.leaderboard as
select
  p.player_id,
  p.username,
  p.avatar,
  s.wins,
  s.wins_as_impostor,
  s.wins_as_player,
  s.points,
  p.xp,
  p.level,
  s.games_played,
  s.streak,
  s.best_streak,
  s.updated_at as last_played
from public.profiles p
join public.stats s on s.user_id = p.id
order by s.points desc, s.wins desc, p.xp desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) Politikaları
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PROFILES: herkes okuyabilir (leaderboard için), sadece sahibi yazabilir
alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- ─── STATS: herkes okuyabilir, sadece sahibi yazabilir
alter table public.stats enable row level security;
drop policy if exists "stats_select" on public.stats;
drop policy if exists "stats_update_own" on public.stats;
drop policy if exists "stats_insert_own" on public.stats;
create policy "stats_select" on public.stats for select using (true);
create policy "stats_update_own" on public.stats for update using (auth.uid() = user_id);
create policy "stats_insert_own" on public.stats for insert with check (auth.uid() = user_id);

-- ─── INVENTORY: sadece sahibi okuyabilir ve yazabilir
alter table public.inventory enable row level security;
drop policy if exists "inventory_select_own" on public.inventory;
drop policy if exists "inventory_update_own" on public.inventory;
drop policy if exists "inventory_insert_own" on public.inventory;
create policy "inventory_select_own" on public.inventory for select using (auth.uid() = user_id);
create policy "inventory_update_own" on public.inventory for update using (auth.uid() = user_id);
create policy "inventory_insert_own" on public.inventory for insert with check (auth.uid() = user_id);

-- ─── ACHIEVEMENTS: sadece sahibi okuyabilir ve yazabilir
alter table public.achievements enable row level security;
drop policy if exists "achievements_select_own" on public.achievements;
drop policy if exists "achievements_insert_own" on public.achievements;
drop policy if exists "achievements_delete_own" on public.achievements;
create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);
create policy "achievements_insert_own" on public.achievements for insert with check (auth.uid() = user_id);
create policy "achievements_delete_own" on public.achievements for delete using (auth.uid() = user_id);

-- ─── DAILY QUESTS: sadece sahibi okuyabilir ve yazabilir
alter table public.daily_quests enable row level security;
drop policy if exists "daily_quests_select_own" on public.daily_quests;
drop policy if exists "daily_quests_upsert_own" on public.daily_quests;
drop policy if exists "daily_quests_update_own" on public.daily_quests;
create policy "daily_quests_select_own" on public.daily_quests for select using (auth.uid() = user_id);
create policy "daily_quests_upsert_own" on public.daily_quests for insert with check (auth.uid() = user_id);
create policy "daily_quests_update_own" on public.daily_quests for update using (auth.uid() = user_id);

-- ─── WEEKLY QUESTS: sadece sahibi okuyabilir ve yazabilir
alter table public.weekly_quests enable row level security;
drop policy if exists "weekly_quests_select_own" on public.weekly_quests;
drop policy if exists "weekly_quests_upsert_own" on public.weekly_quests;
drop policy if exists "weekly_quests_update_own" on public.weekly_quests;
create policy "weekly_quests_select_own" on public.weekly_quests for select using (auth.uid() = user_id);
create policy "weekly_quests_upsert_own" on public.weekly_quests for insert with check (auth.uid() = user_id);
create policy "weekly_quests_update_own" on public.weekly_quests for update using (auth.uid() = user_id);

-- ─── FRIENDS: hem gönderen hem alıcı okuyup güncelleyebilir
alter table public.friends enable row level security;
drop policy if exists "friends_select_own" on public.friends;
drop policy if exists "friends_insert_own" on public.friends;
drop policy if exists "friends_delete_own" on public.friends;
drop policy if exists "friends_update_own" on public.friends;
create policy "friends_select_own" on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friends_insert_own" on public.friends for insert with check (auth.uid() = user_id);
create policy "friends_delete_own" on public.friends for delete using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friends_update_own" on public.friends for update using (auth.uid() = user_id or auth.uid() = friend_id)
  with check (auth.uid() = user_id or auth.uid() = friend_id);

-- ─── ROOMS: herkes görebilir, host oluşturabilir/güncelleyebilir/silebilir
alter table public.rooms enable row level security;
drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert_own" on public.rooms;
drop policy if exists "rooms_update_own" on public.rooms;
drop policy if exists "rooms_delete_own" on public.rooms;
create policy "rooms_select" on public.rooms for select using (true);
create policy "rooms_insert_own" on public.rooms for insert with check (auth.uid() = host_id);
create policy "rooms_update_own" on public.rooms for update using (auth.uid() = host_id);
create policy "rooms_delete_own" on public.rooms for delete using (auth.uid() = host_id);

-- ─── ROOM PLAYERS: herkes görebilir, kendisi katılabilir/ayrılabilir/güncelleyebilir
-- Bot ekleme: host odasına bot ekleyebilir (user_id null, is_bot true)
alter table public.room_players enable row level security;
drop policy if exists "room_players_select" on public.room_players;
drop policy if exists "room_players_insert_own" on public.room_players;
drop policy if exists "room_players_update_own" on public.room_players;
drop policy if exists "room_players_delete_own" on public.room_players;
create policy "room_players_select" on public.room_players for select using (true);
-- Gerçek oyuncu: kendi user_id'si ile ekler; Bot: host olarak odasına bot ekler
create policy "room_players_insert_own" on public.room_players for insert
  with check (auth.uid() = user_id or (is_bot = true and user_id is null));
create policy "room_players_update_own" on public.room_players for update
  using (auth.uid() = user_id or is_bot = true)
  with check (auth.uid() = user_id or is_bot = true);
-- Silme: kendi satırını silebilir veya host odasındaki botları silebilir
create policy "room_players_delete_own" on public.room_players for delete
  using (auth.uid() = user_id or is_bot = true);

-- ─── ROOM CHAT: herkes görebilir, kendisi yazabilir
alter table public.room_chat enable row level security;
drop policy if exists "room_chat_select" on public.room_chat;
drop policy if exists "room_chat_insert_own" on public.room_chat;
create policy "room_chat_select" on public.room_chat for select using (true);
create policy "room_chat_insert_own" on public.room_chat for insert with check (auth.uid() = user_id);

-- ─── ROOM VOTES: herkes görebilir, kendisi oy verebilir/silebilir
alter table public.room_votes enable row level security;
drop policy if exists "room_votes_select" on public.room_votes;
drop policy if exists "room_votes_insert_own" on public.room_votes;
drop policy if exists "room_votes_delete_own" on public.room_votes;
create policy "room_votes_select" on public.room_votes for select using (true);
create policy "room_votes_insert_own" on public.room_votes for insert with check (auth.uid() = voter_id);
create policy "room_votes_delete_own" on public.room_votes for delete using (auth.uid() = voter_id);

-- ─── ROOM INVITES: davet eden ve davet edilen okuyup güncelleyebilir
alter table public.room_invites enable row level security;
drop policy if exists "room_invites_select" on public.room_invites;
drop policy if exists "room_invites_insert" on public.room_invites;
drop policy if exists "room_invites_update" on public.room_invites;
drop policy if exists "room_invites_delete" on public.room_invites;
create policy "room_invites_select" on public.room_invites
  for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);
create policy "room_invites_insert" on public.room_invites
  for insert with check (auth.uid() = inviter_id);
create policy "room_invites_update" on public.room_invites
  for update using (auth.uid() = inviter_id or auth.uid() = invitee_id)
  with check (auth.uid() = inviter_id or auth.uid() = invitee_id);
create policy "room_invites_delete" on public.room_invites
  for delete using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT İZİNLERİ
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant insert on public.profiles to authenticated;

-- Stats
grant select on public.stats to anon, authenticated;
grant update on public.stats to authenticated;
grant insert on public.stats to authenticated;

-- Inventory
grant select on public.inventory to authenticated;
grant update on public.inventory to authenticated;
grant insert on public.inventory to authenticated;

-- Achievements
grant select on public.achievements to authenticated;
grant insert on public.achievements to authenticated;
grant delete on public.achievements to authenticated;

-- Daily Quests
grant select on public.daily_quests to authenticated;
grant insert on public.daily_quests to authenticated;
grant update on public.daily_quests to authenticated;

-- Weekly Quests
grant select on public.weekly_quests to authenticated;
grant insert on public.weekly_quests to authenticated;
grant update on public.weekly_quests to authenticated;

-- Friends
grant select on public.friends to authenticated;
grant insert on public.friends to authenticated;
grant update on public.friends to authenticated;
grant delete on public.friends to authenticated;

-- Rooms
grant select on public.rooms to anon, authenticated;
grant insert on public.rooms to authenticated;
grant update on public.rooms to authenticated;
grant delete on public.rooms to authenticated;

-- Room Players
grant select on public.room_players to authenticated;
grant insert on public.room_players to authenticated;
grant update on public.room_players to authenticated;
grant delete on public.room_players to authenticated;

-- Room Chat
grant select on public.room_chat to authenticated;
grant insert on public.room_chat to authenticated;

-- Room Votes
grant select on public.room_votes to authenticated;
grant insert on public.room_votes to authenticated;
grant delete on public.room_votes to authenticated;

-- Room Invites
grant select on public.room_invites to authenticated;
grant insert on public.room_invites to authenticated;
grant update on public.room_invites to authenticated;
grant delete on public.room_invites to authenticated;

-- Leaderboard view
grant select on public.leaderboard to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME: tabloları realtime yayınına ekle
-- (DO bloğu ile zaten ekliyse atla — tekrar çalıştırınca hata vermesin)
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tables text[] := array['public.rooms','public.room_players','public.room_chat','public.room_votes','public.friends','public.room_invites'];
  is_member boolean;
begin
  foreach t in array tables loop
    -- Tablo zaten publication'da mi kontrol et
    select exists(
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname || '.' || tablename = t
    ) into is_member;

    if not is_member then
      execute format('alter publication supabase_realtime add table %s', t);
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CLEANUP: 1 saatten eski LOBBY odalarını sil (stale odalar)
-- ═══════════════════════════════════════════════════════════════════════════

delete from rooms
  where state = 'LOBBY'
  and created_at < now() - interval '1 hour';
