-- Create game rooms table
CREATE TABLE public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'playing', 'finished'))
);

-- Create players table
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  card_count INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_card_count CHECK (card_count >= 1 AND card_count <= 4),
  UNIQUE(room_id, user_id)
);

-- Create bingo cards table
CREATE TABLE public.bingo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  card_data JSONB NOT NULL,
  marked_cells JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create game calls table
CREATE TABLE public.game_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  call_value TEXT NOT NULL,
  call_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rooms
CREATE POLICY "Anyone can view game rooms"
  ON public.game_rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create game rooms"
  ON public.game_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their game rooms"
  ON public.game_rooms FOR UPDATE
  USING (auth.uid() = host_id);

-- RLS Policies for players
CREATE POLICY "Anyone can view players in their room"
  ON public.players FOR SELECT
  USING (true);

CREATE POLICY "Users can create player records"
  ON public.players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own player data"
  ON public.players FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for bingo_cards
CREATE POLICY "Players can view their own cards"
  ON public.bingo_cards FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM public.players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create their own cards"
  ON public.bingo_cards FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM public.players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update their own cards"
  ON public.bingo_cards FOR UPDATE
  USING (
    player_id IN (
      SELECT id FROM public.players WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for game_calls
CREATE POLICY "Anyone can view calls in their room"
  ON public.game_calls FOR SELECT
  USING (true);

CREATE POLICY "Host can create calls"
  ON public.game_calls FOR INSERT
  WITH CHECK (
    room_id IN (
      SELECT id FROM public.game_rooms WHERE host_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bingo_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_calls;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for game_rooms
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();