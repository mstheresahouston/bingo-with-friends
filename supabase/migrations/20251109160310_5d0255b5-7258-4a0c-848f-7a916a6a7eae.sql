-- Add winner tracking to game_rooms table
ALTER TABLE public.game_rooms
ADD COLUMN winner_player_id uuid REFERENCES public.players(id),
ADD COLUMN winner_announced_at timestamp with time zone;

-- Update RLS policy to allow hosts to update winner information
DROP POLICY IF EXISTS "Host can update their game rooms" ON public.game_rooms;

CREATE POLICY "Host can update their game rooms"
ON public.game_rooms
FOR UPDATE
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

-- Allow players to update winner information when claiming bingo
CREATE POLICY "Players can claim bingo"
ON public.game_rooms
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
);