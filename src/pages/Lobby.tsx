import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

const Lobby = () => {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [cardCount, setCardCount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleStartGame = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your display name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to play",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      let finalRoomCode = roomCode.trim().toUpperCase();
      let gameRoom;

      if (!finalRoomCode) {
        // Create new room
        finalRoomCode = generateRoomCode();
        const { data, error } = await supabase
          .from("game_rooms")
          .insert({
            room_code: finalRoomCode,
            host_id: user.id,
            status: "waiting",
          })
          .select()
          .single();

        if (error) throw error;
        gameRoom = data;
      } else {
        // Join existing room
        const { data, error } = await supabase
          .from("game_rooms")
          .select()
          .eq("room_code", finalRoomCode)
          .single();

        if (error || !data) {
          toast({
            title: "Room Not Found",
            description: "The room code you entered doesn't exist",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        gameRoom = data;
      }

      // Create player record
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: gameRoom.id,
          user_id: user.id,
          player_name: playerName,
          card_count: parseInt(cardCount),
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Generate bingo cards
      const cards = [];
      for (let i = 0; i < parseInt(cardCount); i++) {
        const cardData = generateBingoCard();
        cards.push({
          player_id: playerData.id,
          card_data: cardData,
          marked_cells: [],
        });
      }

      const { error: cardsError } = await supabase
        .from("bingo_cards")
        .insert(cards);

      if (cardsError) throw cardsError;

      toast({
        title: "Success!",
        description: `${finalRoomCode === roomCode.trim().toUpperCase() ? "Joined" : "Created"} room: ${finalRoomCode}`,
      });

      navigate(`/game/${finalRoomCode}`);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBingoCard = () => {
    const words = [
      "Grace", "Faith", "Hope", "Love", "Joy",
      "Peace", "Mercy", "Trust", "Strength", "Wisdom",
      "Courage", "Prayer", "Blessing", "Light", "Spirit",
      "Heart", "Soul", "Truth", "Life", "Praise",
      "Glory", "Heaven", "Angels", "Miracle", "Goodness"
    ];

    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const card = [];
    for (let i = 0; i < 5; i++) {
      const row = [];
      for (let j = 0; j < 5; j++) {
        const index = i * 5 + j;
        if (i === 2 && j === 2) {
          row.push({ value: "FREE", isFree: true });
        } else {
          row.push({ value: shuffled[index > 12 ? index - 1 : index], isFree: false });
        }
      }
      card.push(row);
    }
    return card;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-2 border-secondary shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-4xl font-heading text-primary">🏠 GraceBingo</CardTitle>
          <CardDescription className="text-card-foreground/80">
            Create or join a game room to play with your friends or community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Display Name</Label>
            <Input
              id="playerName"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-background/50 border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code (leave blank to create new)</Label>
            <Input
              id="roomCode"
              placeholder="e.g., FAITH23"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="bg-background/50 border-border text-foreground"
              maxLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardCount">Number of Cards (1-4)</Label>
            <Select value={cardCount} onValueChange={setCardCount}>
              <SelectTrigger className="bg-background/50 border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="1">1 Card</SelectItem>
                <SelectItem value="2">2 Cards</SelectItem>
                <SelectItem value="3">3 Cards</SelectItem>
                <SelectItem value="4">4 Cards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleStartGame}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg font-heading"
            size="lg"
          >
            {isLoading ? "Loading..." : "🎮 Start or Join Game"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Lobby;