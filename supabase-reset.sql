-- ═══════════════════════════════════════════════════════════════════════════
-- TAM SIFIRLAMA — tüm kullanıcılar ve veriler silinir
-- ⚠️ DİKKAT: Bu işlem geri alınamaz! Tüm kayıtlar silinir.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tüm tabloları temizle (cascade ile auth.users silince otomatik silinir ama manuel de silelim)
delete from public.room_invites;
delete from public.room_votes;
delete from public.room_chat;
delete from public.room_players;
delete from public.rooms;
delete from public.friends;
delete from public.weekly_quests;
delete from public.daily_quests;
delete from public.achievements;
delete from public.inventory;
delete from public.stats;
delete from public.profiles;

-- 2. Tüm auth kullanıcılarını sil (bu profiles/stats/inventory'yi de cascade siler)
delete from auth.users;

-- 3. Sequence'leri sıfırla (varsa)
alter sequence if exists public.rooms_id_seq restart with 1;

-- 4. Doğrulama — tablolar boş olmalı
select 'profiles' as tablo, count(*) as kayit from public.profiles
union all
select 'stats', count(*) from public.stats
union all
select 'inventory', count(*) from public.inventory
union all
select 'rooms', count(*) from public.rooms
union all
select 'friends', count(*) from public.friends
union all
select 'auth.users', count(*) from auth.users;
