import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Lobby = () => {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [cardCount, setCardCount] = useState("1");
  const [gameType, setGameType] = useState("words");
  const [winCondition, setWinCondition] = useState("straight");
  const [aiPlayerCount, setAiPlayerCount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [canCreateRoom, setCanCreateRoom] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
        setCanCreateRoom(roleData.role === "host" || roleData.role === "vip");
      }
    };

    checkUserRole();
  }, []);

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
        // Check if user can create rooms
        if (!canCreateRoom) {
          toast({
            title: "Access Restricted",
            description: "Only Host and VIP members can create new rooms. Please enter a room code to join an existing game.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Create new room
        finalRoomCode = generateRoomCode();
        
        // Set prize value based on win condition
        const prizeValues: Record<string, number> = {
          straight: 100,
          diagonal: 100,
          four_corners: 125,
          block_of_four: 150,
          coverall: 350,
          multi_game: 350,
        };
        
        const { data, error } = await supabase
          .from("game_rooms")
          .insert({
            room_code: finalRoomCode,
            host_id: user.id,
            status: "waiting",
            game_type: gameType,
            win_condition: winCondition,
            praise_dollar_value: prizeValues[winCondition] || 100,
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
        const cardData = generateBingoCard(gameRoom.game_type);
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

      // Create AI players if requested and this is a new room (only hosts can add AI)
      if (!roomCode.trim() && parseInt(aiPlayerCount) > 0 && userRole === "host") {
        const aiPlayerNames = ["Grace Bot", "Faith Bot", "Hope Bot"];
        const aiPlayers = [];

        for (let i = 0; i < parseInt(aiPlayerCount); i++) {
          const { data: aiPlayerData, error: aiPlayerError } = await supabase
            .from("players")
            .insert({
              room_id: gameRoom.id,
              user_id: null, // AI players have no user_id
              player_name: aiPlayerNames[i],
              card_count: 1,
            })
            .select()
            .single();

          if (aiPlayerError) throw aiPlayerError;

          // Generate one card for each AI player
          const aiCardData = generateBingoCard(gameType);
          const { error: aiCardError } = await supabase
            .from("bingo_cards")
            .insert({
              player_id: aiPlayerData.id,
              card_data: aiCardData,
              marked_cells: [],
            });

          if (aiCardError) throw aiCardError;
        }
      }

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

  const generateBingoCard = (type: string) => {
    const card = [];
    
    if (type === "numbers") {
      // Traditional BINGO: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
      const columns = [
        Array.from({ length: 15 }, (_, i) => (i + 1).toString()),        // B: 1-15
        Array.from({ length: 15 }, (_, i) => (i + 16).toString()),       // I: 16-30
        Array.from({ length: 15 }, (_, i) => (i + 31).toString()),       // N: 31-45
        Array.from({ length: 15 }, (_, i) => (i + 46).toString()),       // G: 46-60
        Array.from({ length: 15 }, (_, i) => (i + 61).toString()),       // O: 61-75
      ];

      // Shuffle each column
      const shuffledColumns = columns.map(col => [...col].sort(() => Math.random() - 0.5));

      // Build 5x5 card
      for (let i = 0; i < 5; i++) {
        const row = [];
        for (let j = 0; j < 5; j++) {
          if (i === 2 && j === 2) {
            row.push({ value: "FREE", isFree: true });
          } else {
            row.push({ value: shuffledColumns[j][i], isFree: false });
          }
        }
        card.push(row);
      }
    } else {
      // Words version
      const words = [
        "Grace", "Faith", "Hope", "Love", "Joy",
        "Peace", "Mercy", "Trust", "Strength", "Wisdom",
        "Courage", "Prayer", "Blessing", "Light", "Spirit",
        "Heart", "Soul", "Truth", "Life", "Praise",
        "Glory", "Heaven", "Angels", "Miracle", "Goodness"
      ];

      const shuffled = [...words].sort(() => Math.random() - 0.5);
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
    }
    return card;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-card/95 border-2 border-secondary shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Sparkles className="w-12 h-12 text-primary" />
            {userRole && (
              <Badge variant={userRole === "host" ? "default" : "secondary"} className="gap-1">
                <Crown className="w-3 h-3" />
                {userRole.toUpperCase()}
              </Badge>
            )}
          </div>
          <CardTitle className="text-4xl font-heading text-primary">🏠 GraceBingo</CardTitle>
          <CardDescription className="text-card-foreground/80">
            {canCreateRoom 
              ? "Create or join a game room to play with your friends or community"
              : "Join a game room by entering a room code below"}
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
            <Label htmlFor="roomCode">
              {canCreateRoom ? "Room Code (leave blank to create new)" : "Room Code"}
            </Label>
            <Input
              id="roomCode"
              placeholder={canCreateRoom ? "e.g., FAITH23" : "Enter room code to join"}
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

          {!roomCode && canCreateRoom && (
            <>
              <div className="space-y-2">
                <Label htmlFor="gameType">Game Type</Label>
                <Select value={gameType} onValueChange={setGameType}>
                  <SelectTrigger className="bg-background/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="words">Words</SelectItem>
                    <SelectItem value="numbers">Numbers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="winCondition">Win Condition</Label>
                <Select value={winCondition} onValueChange={setWinCondition}>
                  <SelectTrigger className="bg-background/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="straight">Straight Line (any direction)</SelectItem>
                    <SelectItem value="four_corners">Four Corners</SelectItem>
                    <SelectItem value="block_of_four">Block of Four</SelectItem>
                    <SelectItem value="diagonal">Diagonal Only</SelectItem>
                    <SelectItem value="coverall">Cover All (full card)</SelectItem>
                    <SelectItem value="multi_game">Multi-Game (Progressive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {userRole === "host" && (
                <div className="space-y-2">
                  <Label htmlFor="aiPlayerCount">AI Players (0-3) - Host Only</Label>
                  <Select value={aiPlayerCount} onValueChange={setAiPlayerCount}>
                    <SelectTrigger className="bg-background/50 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="0">No AI Players</SelectItem>
                      <SelectItem value="1">1 AI Player</SelectItem>
                      <SelectItem value="2">2 AI Players</SelectItem>
                      <SelectItem value="3">3 AI Players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

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