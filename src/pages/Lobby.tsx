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
import logo from "@/assets/logo.png";
import { WIN_CONDITIONS, getDefaultPrize } from "@/lib/winConditions";

const Lobby = () => {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [cardCount, setCardCount] = useState("1");
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
        .maybeSingle();

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
        
        // Get default prize for selected win condition
        const defaultPrize = getDefaultPrize(winCondition);
        
        const { data, error } = await supabase
          .from("game_rooms")
          .insert({
            room_code: finalRoomCode,
            host_id: user.id,
            status: "waiting",
            game_type: "numbers", // Always numbers now
            win_condition: winCondition,
            praise_dollar_value: defaultPrize,
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
        
        // Check room capacity (max 50 players)
        const { data: existingPlayers, error: playersError } = await supabase
          .from("players")
          .select("id")
          .eq("room_id", data.id);

        if (playersError) throw playersError;

        if (existingPlayers && existingPlayers.length >= 50) {
          toast({
            title: "Room Full",
            description: "This room has reached its maximum capacity of 50 players",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        gameRoom = data;
      }

      // Create player record using secure function
      const { data: playerId, error: playerError } = await supabase
        .rpc("create_player", {
          _room_id: gameRoom.id,
          _player_name: playerName,
          _card_count: parseInt(cardCount),
        });

      if (playerError) throw playerError;

      // Fetch the player data we just created
      const { data: playerData, error: fetchError } = await supabase
        .from("players")
        .select()
        .eq("id", playerId)
        .single();

      if (fetchError) throw fetchError;

      // Generate bingo cards (always numbers now)
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

      // Create AI players if requested and this is a new room (only hosts can add AI)
      if (!roomCode.trim() && parseInt(aiPlayerCount) > 0 && userRole === "host") {
        try {
          const aiPlayerNames = ["Grace Bot", "Faith Bot", "Hope Bot"];

          for (let i = 0; i < parseInt(aiPlayerCount); i++) {
            // Create AI player using secure function
            const { data: aiPlayerId, error: aiPlayerError } = await supabase
              .rpc("create_ai_player", {
                _room_id: gameRoom.id,
                _player_name: aiPlayerNames[i],
                _card_count: 1,
              });

            if (aiPlayerError) {
              console.error("AI player insert error:", aiPlayerError);
              toast({
                title: "Error",
                description: `Failed to create ${aiPlayerNames[i]}`,
                variant: "destructive",
              });
              continue; // Skip this AI and continue starting the game
            }

            // Fetch the AI player data we just created
            const { data: aiPlayerData, error: fetchError } = await supabase
              .from("players")
              .select()
              .eq("id", aiPlayerId)
              .single();

            if (fetchError) {
              console.error("AI player fetch error:", fetchError);
              continue;
            }

            // Generate one card for each AI player
            const aiCardData = generateBingoCard();
            const { error: aiCardError } = await supabase
              .from("bingo_cards")
              .insert({
                player_id: aiPlayerData.id,
                card_data: aiCardData,
                marked_cells: [],
              });

            if (aiCardError) {
              console.error("AI card insert error:", aiCardError);
              continue;
            }
          }
        } catch (e) {
          console.error("AI setup error:", e);
          toast({ title: "AI players skipped", description: "Couldn't add AI players due to permissions." });
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

  const generateBingoCard = () => {
    const card = [];
    
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
          <CardTitle className="text-4xl font-heading text-primary flex items-center gap-3">
            <img src={logo} alt="BINGO with Friends" className="w-12 h-12" />
            BINGO with Friends
          </CardTitle>
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
              placeholder={canCreateRoom ? "e.g., BINGO23" : "Enter room code to join"}
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
                <Label htmlFor="winCondition">Win Condition</Label>
                <Select value={winCondition} onValueChange={setWinCondition}>
                  <SelectTrigger className="bg-background/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    <SelectItem value="straight">Straight Line - $100</SelectItem>
                    <SelectItem value="diagonal">Diagonal Only - $100</SelectItem>
                    <SelectItem value="four_corners">Four Corners - $125</SelectItem>
                    <SelectItem value="block_of_four">Block of Four - $150</SelectItem>
                    <SelectItem value="any_four">Any Four Numbers - $350</SelectItem>
                    <SelectItem value="letter_h">Letter H - $350</SelectItem>
                    <SelectItem value="letter_e">Letter E - $350</SelectItem>
                    <SelectItem value="letter_l">Letter L - $350</SelectItem>
                    <SelectItem value="letter_i">Letter I - $350</SelectItem>
                    <SelectItem value="outside_edge">Outside Edge - $350</SelectItem>
                    <SelectItem value="coverall">Coverall (Full card) - $350</SelectItem>
                    <SelectItem value="multi_game">Progressive (All patterns) - $675</SelectItem>
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
