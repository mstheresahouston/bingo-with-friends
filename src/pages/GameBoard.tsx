import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BingoCard } from "@/components/BingoCard";
import { CallBoard } from "@/components/CallBoard";
import { Leaderboard } from "@/components/Leaderboard";
import Chat from "@/components/Chat";
import { Crown, LogOut } from "lucide-react";

const GameBoard = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameRoom, setGameRoom] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGameData();
    setupRealtimeSubscriptions();
  }, [roomCode]);

  const loadGameData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get game room
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select()
        .eq("room_code", roomCode)
        .single();

      if (roomError || !room) {
        toast({
          title: "Room Not Found",
          description: "This game room doesn't exist",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setGameRoom(room);
      setIsHost(room.host_id === user.id);

      // Get player data
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .single();

      if (playerError || !playerData) {
        toast({
          title: "Player Not Found",
          description: "You're not part of this game",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setPlayer(playerData);

      // Get all players
      const { data: allPlayers } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .order("score", { ascending: false });

      setPlayers(allPlayers || []);

      // Get bingo cards
      const { data: cardsData } = await supabase
        .from("bingo_cards")
        .select()
        .eq("player_id", playerData.id);

      setCards(cardsData || []);

      // Get game calls
      const { data: callsData } = await supabase
        .from("game_calls")
        .select()
        .eq("room_id", room.id)
        .order("call_number", { ascending: true });

      setCalls(callsData || []);

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading game data:", error);
      toast({
        title: "Error",
        description: "Failed to load game data",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscriptions = () => {
    const callsChannel = supabase
      .channel(`calls-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_calls",
        },
        () => {
          loadGameData();
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`players-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
        },
        async (payload) => {
          // Check if score was updated
          if (payload.new.score > payload.old.score) {
            const { data: { user } } = await supabase.auth.getUser();
            // Only show announcement if it's not the current user
            if (user && user.id !== payload.new.user_id) {
              toast({
                title: "🎉 BINGO!",
                description: `${payload.new.player_name} just got BINGO!`,
              });
            }
          }
          loadGameData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(playersChannel);
    };
  };

  const handleLeaveGame = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-heading text-foreground">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl font-heading text-primary flex items-center gap-2">
                  🎟️ GraceBingo
                  {isHost && <Crown className="w-6 h-6 text-accent" />}
                </CardTitle>
                <CardDescription className="text-card-foreground/80">
                  Room Code: <span className="font-bold text-primary">{roomCode}</span> • Player: {player?.player_name}
                </CardDescription>
              </div>
              <Button
                onClick={handleLeaveGame}
                variant="outline"
                className="border-border hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Bingo Cards */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
              <CardHeader>
                <CardTitle className="font-heading text-card-foreground">Your Bingo Cards</CardTitle>
                <CardDescription className="text-card-foreground/80">
                  Tap a square when it's called
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cards.map((card) => (
                  <BingoCard 
                    key={card.id} 
                    card={card} 
                    calls={calls}
                    winCondition={gameRoom.win_condition}
                    playerId={player?.id}
                    playerName={player?.player_name}
                  />
                ))}
              </CardContent>
            </Card>
            <Chat roomId={gameRoom.id} playerName={player?.player_name || "Player"} />
          </div>

          {/* Right Column - Calls and Leaderboard */}
          <div className="space-y-4">
            <CallBoard
              calls={calls}
              isHost={isHost}
              gameRoom={gameRoom}
            />
            <Leaderboard players={players} currentPlayerId={player?.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;