-- Drop the overly permissive policy that allows anyone to view all game rooms
DROP POLICY IF EXISTS "Anyone can view game rooms" ON public.game_rooms;

-- Create a proper policy that only allows users to view rooms they're hosting or participating in
CREATE POLICY "Users can view their own game rooms"
ON public.game_rooms
FOR SELECT
USING (
  -- User is the host
  auth.uid() = host_id
  OR
  -- User is a participant in the room
  id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
);