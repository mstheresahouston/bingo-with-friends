-- Add winner columns for multi-game patterns
ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS four_corners_winner_id uuid NULL,
  ADD COLUMN IF NOT EXISTS straight_winner_id uuid NULL,
  ADD COLUMN IF NOT EXISTS diagonal_winner_id uuid NULL;

-- Ensure unique calls per room to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS game_calls_unique_call_per_room
  ON public.game_calls (room_id, call_value);
