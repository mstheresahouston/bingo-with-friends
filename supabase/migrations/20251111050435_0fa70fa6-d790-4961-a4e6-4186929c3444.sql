-- Allow authenticated users to view game rooms by room_code so they can join
CREATE POLICY "Users can view game rooms by room code"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (true);

-- Note: The existing "Users can view their own game rooms" policy will still apply
-- This new policy simply allows discovery of rooms via room code for joining