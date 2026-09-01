-- ═══════════════════════════════════════════════════════════════════════════
-- Online Oyun Migration: rooms tablosuna ek sütunlar
-- Supabase SQL Editor'da çalıştır
-- ═══════════════════════════════════════════════════════════════════════════

-- Oyuncuların oyladığı sahtekar ID'si
alter table public.rooms add column if not exists voted_impostor_id uuid;

-- Sahtekarın kelime tahmini
alter table public.rooms add column if not exists impostor_guess text;

-- room_chat'e mesaj tipi ekle (hint, system, vote)
alter table public.room_chat add column if not exists message_type text not null default 'hint';

-- room_players'e sıra numarası ekle (turn order için)
alter table public.room_players add column if not exists seat integer not null default 0;

-- room_players'e pas durumu ekle
alter table public.room_players add column if not exists passed boolean not null default false;

-- RLS politikaları zaten var, sadece yeni sütunlar için GRANT ekle
grant select on public.rooms to anon, authenticated;
grant update on public.rooms to authenticated;

-- room_chat için realtime zaten ekli, ek bir şey gerekmez
