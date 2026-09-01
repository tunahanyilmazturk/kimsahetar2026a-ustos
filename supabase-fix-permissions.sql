-- ═══════════════════════════════════════════════════════════════════════════
-- Düzeltme: GRANT izinleri + trigger basitleştir
-- "Automatically expose new tables" kapatıldığı için manuel GRANT gerekli
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. GRANT: anon ve authenticated rollerine izin ver ────────────────────

-- profiles: herkes SELECT, sadece kendi satırın INSERT/UPDATE
grant select on public.profiles to anon, authenticated;
grant insert on public.profiles to authenticated;
grant update on public.profiles to authenticated;

-- stats: herkes SELECT, sadece kendi satırın INSERT/UPDATE
grant select on public.stats to anon, authenticated;
grant insert on public.stats to authenticated;
grant update on public.stats to authenticated;

-- inventory: sadece kendi satırın SELECT/INSERT/UPDATE
grant select on public.inventory to authenticated;
grant insert on public.inventory to authenticated;
grant update on public.inventory to authenticated;

-- achievements: sadece kendi satırın SELECT/INSERT/DELETE
grant select on public.achievements to authenticated;
grant insert on public.achievements to authenticated;
grant delete on public.achievements to authenticated;

-- daily_quests: sadece kendi satırın SELECT/INSERT/UPDATE
grant select on public.daily_quests to authenticated;
grant insert on public.daily_quests to authenticated;
grant update on public.daily_quests to authenticated;

-- weekly_quests: sadece kendi satırın SELECT/INSERT/UPDATE
grant select on public.weekly_quests to authenticated;
grant insert on public.weekly_quests to authenticated;
grant update on public.weekly_quests to authenticated;

-- friends: sadece kendi satırın SELECT/INSERT/UPDATE/DELETE
grant select on public.friends to authenticated;
grant insert on public.friends to authenticated;
grant update on public.friends to authenticated;
grant delete on public.friends to authenticated;

-- rooms: herkes SELECT, host INSERT/UPDATE/DELETE
grant select on public.rooms to anon, authenticated;
grant insert on public.rooms to authenticated;
grant update on public.rooms to authenticated;
grant delete on public.rooms to authenticated;

-- room_players: herkes SELECT, kendi satırın INSERT/DELETE
grant select on public.room_players to anon, authenticated;
grant insert on public.room_players to authenticated;
grant delete on public.room_players to authenticated;

-- room_chat: herkes SELECT, kendi satırın INSERT
grant select on public.room_chat to anon, authenticated;
grant insert on public.room_chat to authenticated;

-- room_votes: herkes SELECT, kendi satırın INSERT/DELETE
grant select on public.room_votes to anon, authenticated;
grant insert on public.room_votes to authenticated;
grant delete on public.room_votes to authenticated;

-- leaderboard view: herkes SELECT
grant select on public.leaderboard to anon, authenticated;

-- ─── 2. Trigger basitleştir (pgcrypto kullanma) ────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_player_id text;
  v_hex text;
begin
  -- Basit random player ID (pgcrypto gerektirmez)
  v_hex := md5(random()::text || clock_timestamp()::text);
  v_player_id := 'SK-' || upper(substr(v_hex, 1, 8));

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 3. Email confirmation kapat (oyun, email gerekmez) ────────────────────
-- Bu SQL ile kapatılamaz, Dashboard'dan yapılması gerekir:
-- Authentication → Settings → Email → Confirm email = OFF
