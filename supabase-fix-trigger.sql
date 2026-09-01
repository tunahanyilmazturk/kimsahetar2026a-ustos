-- Düzeltme: pgcrypto extension ekle (gen_random_bytes ve encode için)
create extension if not exists pgcrypto;

-- Mevcut trigger'ı drop ve yeniden oluştur (daha güvenli versiyon)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_player_id text;
  begin
    -- Player ID oluştur (SK-XXXXXXXX formatı) — pgcrypto ile
      v_player_id := 'SK-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));

        -- Profile oluştur
          insert into public.profiles (id, username, player_id)
            values (
                new.id,
                    coalesce(new.raw_user_meta_data->>'username', 'Oyuncu'),
                        v_player_id
                          );

                            -- Stats oluştur
                              insert into public.stats (user_id) values (new.id);

                                -- Inventory oluştur
                                  insert into public.inventory (user_id) values (new.id);

                                    return new;
                                    end;
                                    $$;

                                    create trigger on_auth_user_created
                                      after insert on auth.users
                                        for each row execute function public.handle_new_user();
                                        