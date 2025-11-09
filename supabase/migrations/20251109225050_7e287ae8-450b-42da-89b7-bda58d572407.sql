-- Create a table to track all winners for prize splitting
CREATE TABLE IF NOT EXISTS public.game_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  player_id UUID NOT NULL,
  win_type TEXT NOT NULL, -- 'straight', 'diagonal', 'four_corners', 'block_of_four', 'coverall'
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prize_amount INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.game_winners ENABLE ROW LEVEL SECURITY;

-- Players can view winners in their room
CREATE POLICY "Anyone can view winners in their room"
ON public.game_winners
FOR SELECT
USING (true);

-- Players can create winner records when claiming
CREATE POLICY "Players can create winner records"
ON public.game_winners
FOR INSERT
WITH CHECK (player_id IN (
  SELECT id FROM public.players WHERE user_id = auth.uid()
));

-- Add index for faster queries
CREATE INDEX idx_game_winners_room_id ON public.game_winners(room_id);
CREATE INDEX idx_game_winners_room_win_type ON public.game_winners(room_id, win_type);