-- Add game configuration fields to game_rooms
ALTER TABLE game_rooms 
ADD COLUMN game_type text NOT NULL DEFAULT 'words',
ADD COLUMN win_condition text NOT NULL DEFAULT 'straight';

-- Create messages table for chat
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES game_rooms(id),
  user_id uuid,
  player_name text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view messages in their room
CREATE POLICY "Anyone can view messages in their room"
ON public.messages
FOR SELECT
USING (true);

-- Authenticated users can create messages
CREATE POLICY "Users can create messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;