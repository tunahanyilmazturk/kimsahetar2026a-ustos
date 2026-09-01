-- ═══════════════════════════════════════════════════════════════════════════
-- Oda Davet Sistemi Migration
-- Supabase SQL Editor'da çalıştır
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. room_invites tablosu ───────────────────────────────────────────────
create table if not exists public.room_invites (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  room_code   text not null,
  inviter_id  uuid not null references auth.users(id) on delete cascade,
  invitee_id  uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','rejected','expired')),
  created_at  timestamptz not null default now()
);

-- ─── 2. RLS politikaları ───────────────────────────────────────────────────
alter table public.room_invites enable row level security;

-- Davet eden kendi davetlerini görebilir, davet edilen kendine gelen davetleri görebilir
create policy "room_invites_select" on public.room_invites
  for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- Davet eden yeni davet oluşturabilir
create policy "room_invites_insert" on public.room_invites
  for insert with check (auth.uid() = inviter_id);

-- Davet edilen status'u güncelleyebilir (kabul/red)
create policy "room_invites_update" on public.room_invites
  for update using (auth.uid() = inviter_id or auth.uid() = invitee_id)
  with check (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- Silme: sadece davet eden silebilir
create policy "room_invites_delete" on public.room_invites
  for delete using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- ─── 3. GRANT izinleri ────────────────────────────────────────────────────
grant select on public.room_invites to authenticated;
grant insert on public.room_invites to authenticated;
grant update on public.room_invites to authenticated;
grant delete on public.room_invites to authenticated;

-- ─── 4. Realtime'e ekle ───────────────────────────────────────────────────
alter publication supabase_realtime add table public.room_invites;

-- ─── 5. Index ─────────────────────────────────────────────────────────────
create index if not exists idx_room_invites_invitee on public.room_invites(invitee_id, status);
create index if not exists idx_room_invites_inviter on public.room_invites(inviter_id);
