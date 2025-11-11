-- Fix search_path for get_prize_value_for_condition function
CREATE OR REPLACE FUNCTION public.get_prize_value_for_condition(condition text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  CASE condition
    WHEN 'straight' THEN RETURN 100;
    WHEN 'diagonal' THEN RETURN 100;
    WHEN 'four_corners' THEN RETURN 125;
    WHEN 'block_of_four' THEN RETURN 150;
    WHEN 'coverall' THEN RETURN 350;
    WHEN 'multi_game' THEN RETURN 350;
    ELSE RETURN 100;
  END CASE;
END;
$function$;