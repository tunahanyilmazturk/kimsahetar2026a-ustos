-- Botların online oyunda host tarafından güvenli şekilde oynatılması.
alter table public.rooms add column if not exists vote_requested boolean not null default false;

drop policy if exists "room_chat_insert_own" on public.room_chat;
drop policy if exists "room_chat_insert_own_or_host_bot" on public.room_chat;
create policy "room_chat_insert_own_or_host_bot" on public.room_chat
  for insert with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.rooms r
      join public.room_players bp on bp.room_id = r.id
      where r.id = room_chat.room_id
        and r.host_id = auth.uid()
        and bp.is_bot = true
        and ('bot-' || bp.bot_name) = room_chat.user_id::text
    )
  );

drop policy if exists "room_votes_insert_own" on public.room_votes;
drop policy if exists "room_votes_insert_own_or_host_bot" on public.room_votes;
create policy "room_votes_insert_own_or_host_bot" on public.room_votes
  for insert with check (
    auth.uid()::text = voter_id
    or exists (
      select 1 from public.rooms r
      join public.room_players bp on bp.room_id = r.id
      where r.id = room_votes.room_id
        and r.host_id = auth.uid()
        and bp.is_bot = true
        and ('bot-' || bp.bot_name) = room_votes.voter_id
    )
  );

drop policy if exists "room_votes_update_own_or_host_bot" on public.room_votes;
create policy "room_votes_update_own_or_host_bot" on public.room_votes
  for update using (
    auth.uid()::text = voter_id
    or exists (
      select 1 from public.rooms r
      join public.room_players bp on bp.room_id = r.id
      where r.id = room_votes.room_id and r.host_id = auth.uid()
        and bp.is_bot = true and ('bot-' || bp.bot_name) = room_votes.voter_id
    )
  ) with check (
    auth.uid()::text = voter_id
    or exists (
      select 1 from public.rooms r
      join public.room_players bp on bp.room_id = r.id
      where r.id = room_votes.room_id and r.host_id = auth.uid()
        and bp.is_bot = true and ('bot-' || bp.bot_name) = room_votes.voter_id
    )
  );

-- Host, başlangıç kararlarını normal oyuncu oylamasından önce temizleyebilsin.
drop policy if exists "room_votes_delete_own_or_host" on public.room_votes;
create policy "room_votes_delete_own_or_host" on public.room_votes
  for delete using (
    auth.uid()::text = voter_id
    or exists (
      select 1 from public.rooms r
      where r.id = room_votes.room_id and r.host_id = auth.uid()
    )
  );
