-- ═══════════════════════════════════════════════════════════════════════════
-- Oda Otomatik Kapanma + Host Transferi Migration
-- Supabase SQL Editor'da çalıştır
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Trigger: room_players DELETE sonrası oda boşsa sil, host gittiyse transfer ──
-- Bu trigger her room_players silindiğinde çalışır:
--   a) Host ayrılıyorsa ve hala oyuncu varsa → host'u en eski oyuncuya devret
--   b) Oda tamamen boşaldıysa → odayı sil (rooms, room_chat, room_votes cascade ile)

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
  -- O anki oda state'ini al
  select state into room_state from rooms where id = old.room_id;

  -- Oyundan (PLAYING/VOTING) ayrılma: oda hala dolu olabilir, host transferi yap
  -- Kalan oyuncu sayısını say
  select count(*) into remaining_count
  from room_players
  where room_id = old.room_id;

  -- Oda tamamen boş → sil (cascade room_chat, room_votes, room_invites'i de siler)
  if remaining_count = 0 then
    delete from rooms where id = old.room_id;
    return old;
  end if;

  -- Host ayrıldı ve hala oyuncu var → en eski (joined_at en küçük) oyuncuya devret
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

  -- Oyun sırasında (PLAYING/VOTING) oyuncu sayısı 2'ye düştüyse oyun bitir
  if remaining_count < 3 and room_state in ('PLAYING', 'VOTING') then
    update rooms set state = 'FINISHED', winner = 'abandoned', updated_at = now() where id = old.room_id;
  end if;

  return old;
end;
$$;

-- Eski trigger varsa sil
drop trigger if exists trg_room_player_leave on public.room_players;

-- Yeni trigger
create trigger trg_room_player_leave
  after delete on public.room_players
  for each row execute function public.handle_room_player_leave();

-- ─── 2. RLS: rooms update — host transferi için security definer zaten halleder ──
-- (trigger security definer olduğu için RLS'i atlar, sorun yok)

-- ─── 3. Eski/stale odaları temizle (1 saatten eski LOBBY odaları) ──────────
-- Tek seferlik cleanup — eski kalmış odaları siler
delete from rooms
  where state = 'LOBBY'
  and created_at < now() - interval '1 hour';

-- ─── 4. updated_at otomatik güncelleme (opsiyonel) ─────────────────────────
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
