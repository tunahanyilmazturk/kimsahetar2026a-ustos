-- ═══════════════════════════════════════════════════════════════════════════
-- room_players UPDATE RLS politikasi ekleme
-- Supabase SQL Editor'da çalıştır
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. room_players UPDATE politikasi ─────────────────────────────────────
-- Mevcut update politikasi YOK — upsert ve toggleReady calismiyordu
drop policy if exists "room_players_update_own" on public.room_players;

create policy "room_players_update_own" on public.room_players
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 2. GRANT izinleri (eminsin) ───────────────────────────────────────────
grant update on public.room_players to authenticated;
