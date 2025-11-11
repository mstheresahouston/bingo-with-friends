-- Create a secure helper to create AI players for the room host
create or replace function public.create_ai_player(
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
  room_host_id uuid;
BEGIN
  -- Ensure the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Basic validations
  IF _room_id IS NULL THEN
    RAISE EXCEPTION 'room_id is required';
  END IF;

  -- Check if the current user is the host of this room
  SELECT host_id INTO room_host_id
  FROM public.game_rooms
  WHERE id = _room_id;

  IF room_host_id IS NULL THEN
    RAISE EXCEPTION 'room not found';
  END IF;

  IF room_host_id != auth.uid() THEN
    RAISE EXCEPTION 'only the room host can create AI players';
  END IF;

  -- Insert AI player (with NULL user_id)
  INSERT INTO public.players (room_id, user_id, player_name, card_count)
  VALUES (_room_id, NULL, COALESCE(NULLIF(_player_name, ''), 'AI Player'), GREATEST(COALESCE(_card_count, 1), 1))
  RETURNING id INTO new_player_id;

  RETURN new_player_id;
END;
$$;

-- Grant execute to authenticated users
revoke all on function public.create_ai_player(uuid, text, integer) from public;
grant execute on function public.create_ai_player(uuid, text, integer) to authenticated;