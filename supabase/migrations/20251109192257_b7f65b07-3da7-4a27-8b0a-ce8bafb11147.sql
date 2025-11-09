-- Add multi_game_progress to track completed sub-games in multi-game mode
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS multi_game_progress jsonb DEFAULT '{"four_corners": false, "straight": false, "diagonal": false, "coverall": false}'::jsonb;

-- Add function to get prize value based on win condition
CREATE OR REPLACE FUNCTION get_prize_value_for_condition(condition text)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  CASE condition
    WHEN 'straight' THEN RETURN 100;
    WHEN 'diagonal' THEN RETURN 100;
    WHEN 'four_corners' THEN RETURN 125;
    WHEN 'block_of_four' THEN RETURN 150;
    WHEN 'coverall' THEN RETURN 350;
    WHEN 'multi_game' THEN RETURN 350; -- Full prize for completing all
    ELSE RETURN 100; -- Default
  END CASE;
END;
$$;