-- Allow creating AI players with null user_id
DROP POLICY IF EXISTS "Users can create player records" ON players;

CREATE POLICY "Users can create player records" 
ON players 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  (user_id IS NULL AND room_id IN (
    SELECT id FROM game_rooms WHERE host_id = auth.uid()
  ))
);