-- ═══════════════════════════════════════════════════════════════════════════
-- Arkadaş İstek Sistemi Migration
-- Supabase SQL Editor'da çalıştır
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. friends RLS politikalarını güncelle ───────────────────────────────
-- Mevcut update politikasını sil ve recipient da güncelleyebilsin diye yeniden oluştur
drop policy if exists "friends_update_own" on public.friends;

-- Hem gönderen hem alıcı update edebilir (status değişikliği için)
create policy "friends_update_own" on public.friends
  for update using (auth.uid() = user_id or auth.uid() = friend_id)
  with check (auth.uid() = user_id or auth.uid() = friend_id);

-- ─── 2. friends tablosuna created_at ekle (zaman sıralaması için) ─────────
alter table public.friends add column if not exists created_at timestamptz not null default now();

-- ─── 3. GRANT izinleri (zaten var ama emin olalım) ───────────────────────
grant select on public.friends to authenticated;
grant insert on public.friends to authenticated;
grant update on public.friends to authenticated;
grant delete on public.friends to authenticated;

-- ─── 4. Realtime'e friends tablosunu ekle ─────────────────────────────────
alter publication supabase_realtime add table public.friends;
