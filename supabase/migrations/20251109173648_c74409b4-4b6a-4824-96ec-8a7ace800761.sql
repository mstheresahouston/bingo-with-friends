-- Add praise dollar value to game rooms
ALTER TABLE public.game_rooms 
ADD COLUMN praise_dollar_value integer NOT NULL DEFAULT 100;

-- Add total praise dollars to players
ALTER TABLE public.players 
ADD COLUMN total_praise_dollars integer NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN game_rooms.praise_dollar_value IS 'The prize money in Praise Dollars for winning this game';
COMMENT ON COLUMN players.total_praise_dollars IS 'Total Praise Dollars earned by this player across all games';