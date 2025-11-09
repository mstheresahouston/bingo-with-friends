-- Allow host to delete calls in their room
CREATE POLICY "Host can delete calls in their room"
ON game_calls
FOR DELETE
TO authenticated
USING (
  room_id IN (
    SELECT id FROM game_rooms WHERE host_id = auth.uid()
  )
);

-- Allow host to update bingo cards in their room
CREATE POLICY "Host can update cards in their room"
ON bingo_cards
FOR UPDATE
TO authenticated
USING (
  player_id IN (
    SELECT p.id FROM players p
    JOIN game_rooms gr ON gr.id = p.room_id
    WHERE gr.host_id = auth.uid()
  )
);