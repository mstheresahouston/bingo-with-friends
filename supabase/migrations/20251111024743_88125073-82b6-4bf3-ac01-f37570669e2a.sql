-- Create a secure helper to create a player for the current user
create or replace function public.create_player(
  _room_id uuid,
  _player_name text,
  _card_count integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  new_player_id uuid;
BEGIN
  -- Ensure the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Basic validations
  IF _room_id IS NULL THEN
    RAISE EXCEPTION 'room_id is required';
  END IF;

  -- Insert player for the current authenticated user
  INSERT INTO public.players (room_id, user_id, player_name, card_count)
  VALUES (_room_id, auth.uid(), COALESCE(NULLIF(_player_name, ''), 'Player'), GREATEST(COALESCE(_card_count, 1), 1))
  RETURNING id INTO new_player_id;

  RETURN new_player_id;
END;
$$;

-- Grant execute to authenticated users
revoke all on function public.create_player(uuid, text, integer) from public;
grant execute on function public.create_player(uuid, text, integer) to authenticated;