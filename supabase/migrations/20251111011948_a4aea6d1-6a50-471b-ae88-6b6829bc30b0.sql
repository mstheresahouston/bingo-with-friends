-- Fix infinite recursion in players table RLS policy
-- Create security definer function to break recursion cycle
CREATE OR REPLACE FUNCTION public.can_view_player(_player_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM players p1
    JOIN players p2 ON p1.room_id = p2.room_id
    WHERE p1.id = _player_id
      AND p2.user_id = _user_id
  )
$$;

-- Drop and recreate the players policy to fix recursion
DROP POLICY IF EXISTS "Users can view players in their rooms" ON public.players;

CREATE POLICY "Users can view players in their rooms"
ON public.players
FOR SELECT
USING (can_view_player(id, auth.uid()));

-- Fix public data exposure in game_calls table
DROP POLICY IF EXISTS "Anyone can view calls in their room" ON public.game_calls;
DROP POLICY IF EXISTS "Authenticated players can view calls in their room" ON public.game_calls;

CREATE POLICY "Authenticated players can view calls in their room"
ON public.game_calls
FOR SELECT
USING (
  room_id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
);

-- Fix public data exposure in messages table
DROP POLICY IF EXISTS "Anyone can view messages in their room" ON public.messages;
DROP POLICY IF EXISTS "Authenticated players can view messages in their room" ON public.messages;

CREATE POLICY "Authenticated players can view messages in their room"
ON public.messages
FOR SELECT
USING (
  room_id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
);

-- Fix public data exposure in game_winners table
DROP POLICY IF EXISTS "Anyone can view winners in their room" ON public.game_winners;
DROP POLICY IF EXISTS "Authenticated players can view winners in their room" ON public.game_winners;

CREATE POLICY "Authenticated players can view winners in their room"
ON public.game_winners
FOR SELECT
USING (
  room_id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
);