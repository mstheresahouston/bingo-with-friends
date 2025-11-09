-- Allow players to view and update AI bot cards in their room
CREATE POLICY "Players can view AI cards in their room"
ON public.bingo_cards
FOR SELECT
USING (
  player_id IN (
    SELECT p.id
    FROM players p
    JOIN game_rooms gr ON gr.id = p.room_id
    JOIN players my_player ON my_player.room_id = gr.id
    WHERE my_player.user_id = auth.uid()
      AND p.user_id IS NULL  -- AI players only
  )
);

CREATE POLICY "Players can update AI cards in their room"
ON public.bingo_cards
FOR UPDATE
USING (
  player_id IN (
    SELECT p.id
    FROM players p
    JOIN game_rooms gr ON gr.id = p.room_id
    JOIN players my_player ON my_player.room_id = gr.id
    WHERE my_player.user_id = auth.uid()
      AND p.user_id IS NULL  -- AI players only
  )
);
