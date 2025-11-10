-- Drop the overly permissive policy that allows anyone to view all players
DROP POLICY IF EXISTS "Anyone can view players in their room" ON public.players;

-- Create a proper policy that only allows users to view players in rooms they're participating in
CREATE POLICY "Users can view players in their rooms"
ON public.players
FOR SELECT
USING (
  room_id IN (
    SELECT room_id 
    FROM public.players 
    WHERE user_id = auth.uid()
  )
);