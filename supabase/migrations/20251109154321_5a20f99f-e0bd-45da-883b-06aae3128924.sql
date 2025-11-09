-- Allow room host to create bingo cards for AI players (players with NULL user_id)
CREATE POLICY "Host can create AI player cards"
ON public.bingo_cards
FOR INSERT
TO authenticated
WITH CHECK (
  player_id IN (
    SELECT p.id
    FROM public.players p
    JOIN public.game_rooms gr ON gr.id = p.room_id
    WHERE gr.host_id = auth.uid() AND p.user_id IS NULL
  )
);