import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BingoCard } from "@/components/BingoCard";
import { CallBoard } from "@/components/CallBoard";
import { Leaderboard } from "@/components/Leaderboard";
import { WinnerAnnouncement } from "@/components/WinnerAnnouncement";
import { WinConditionDisplay } from "@/components/WinConditionDisplay";
import Chat from "@/components/Chat";
import { Crown, LogOut, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { speakCall } from "@/lib/sounds";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [isMuted, setIsMuted] = useState(() => {
    // Load mute preference from localStorage
    const saved = localStorage.getItem("bingo-voice-muted");
    return saved === "true";
  });
  const [showWinner, setShowWinner] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
  const [isAutoCall, setIsAutoCall] = useState(false);
  const [callSpeed, setCallSpeed] = useState(5); // seconds between calls
  const [praiseDollarValue, setPraiseDollarValue] = useState(100);
  const prevCallsLengthRef = useRef(0);
  const [voiceVolume, setVoiceVolume] = useState(() => {
    const saved = localStorage.getItem("bingo-voice-volume");
    return saved ? Number(saved) : 1;
  });

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
      setPraiseDollarValue(room.praise_dollar_value || 100);

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

  // Separate effect to handle voice announcements when new calls arrive
  useEffect(() => {
    // Only announce if:
    // 1. We have calls
    // 2. GameRoom is loaded
    // 3. Sound is not muted
    // 4. A NEW call was added (not initial load)
    if (calls.length > 0 && gameRoom && !isMuted && calls.length > prevCallsLengthRef.current) {
      const latestCall = calls[calls.length - 1];
      speakCall(latestCall.call_value, gameRoom.game_type, voiceGender, voiceVolume);
    }
    
    // Update the ref for next comparison
    prevCallsLengthRef.current = calls.length;
  }, [calls.length, gameRoom, isMuted, voiceGender, voiceVolume]); // Re-run when these change

  const setupRealtimeSubscriptions = () => {
    const callsChannel = supabase
      .channel(`calls-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_calls",
        },
        async (payload) => {
          // Speak new calls for all players
          const newCall = payload.new;
          
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
          loadGameData();
        }
      )
      .subscribe();

    const roomsChannel = supabase
      .channel(`rooms-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
        },
        async (payload) => {
          // Check if a winner was announced
          if (payload.new.winner_player_id && !payload.old.winner_player_id) {
            // Fetch the winner's name
            const { data: winnerData } = await supabase
              .from("players")
              .select("player_name")
              .eq("id", payload.new.winner_player_id)
              .single();

            if (winnerData) {
              setWinnerName(winnerData.player_name);
              setShowWinner(true);
            }
          }
          loadGameData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roomsChannel);
    };
  };

  const handleLeaveGame = () => {
    navigate("/");
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem("bingo-voice-muted", newMutedState.toString());
    
    toast({
      title: newMutedState ? "Voice Muted" : "Voice Unmuted",
      description: newMutedState ? "Call announcements are now muted" : "Call announcements are now active",
    });
  };

  const handleResetGame = async () => {
    try {
      // Stop auto-call
      setIsAutoCall(false);
      
      // Delete all game calls for this room
      const { error: callsError } = await supabase
        .from("game_calls")
        .delete()
        .eq("room_id", gameRoom.id);

      if (callsError) throw callsError;

      // Reset all bingo cards marked_cells for this room (keeps the cards themselves)
      const { data: roomPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", gameRoom.id);

      if (roomPlayers) {
        const playerIds = roomPlayers.map(p => p.id);
        const { error: cardsError } = await supabase
          .from("bingo_cards")
          .update({ marked_cells: [] })
          .in("player_id", playerIds);

        if (cardsError) throw cardsError;
      }

      // Clear winner information and reset multi-game progress
      const { error: roomError } = await supabase
        .from("game_rooms")
        .update({ 
          winner_player_id: null,
          winner_announced_at: null,
          multi_game_progress: {
            four_corners: false,
            straight: false,
            diagonal: false,
            coverall: false
          }
        })
        .eq("id", gameRoom.id);

      if (roomError) throw roomError;

      setShowWinner(false);
      setWinnerName("");

      toast({
        title: "New Game Started",
        description: "All players keep their cards. Ready to play!",
      });

      loadGameData();
    } catch (error) {
      console.error("Error resetting game:", error);
      toast({
        title: "Error",
        description: "Failed to reset game. Please try again.",
        variant: "destructive",
      });
    }
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
      <WinnerAnnouncement 
        winnerName={winnerName}
        isOpen={showWinner}
        onClose={() => setShowWinner(false)}
      />
      
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
              <div className="flex gap-2">
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  className="border-border hover:bg-accent/10"
                  title={isMuted ? "Unmute voice announcements" : "Mute voice announcements"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 mr-2" />
                  ) : (
                    <Volume2 className="w-4 h-4 mr-2" />
                  )}
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
                {isHost && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Game
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-card-foreground">Reset Game?</AlertDialogTitle>
                        <AlertDialogDescription className="text-card-foreground/80">
                          This will clear all calls and marked cells for all players. Scores and players will be kept. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-background text-foreground border-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleResetGame}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          Reset Game
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  onClick={handleLeaveGame}
                  variant="outline"
                  className="border-border hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Bingo Cards */}
          <div className="lg:col-span-2 space-y-4">
            <WinConditionDisplay 
              winCondition={gameRoom.win_condition}
              multiGameProgress={gameRoom.multi_game_progress}
            />
            <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
              <CardHeader>
                <CardTitle className="font-heading text-card-foreground">Your Bingo Cards</CardTitle>
                <CardDescription className="text-card-foreground/80">
                  Mark the squares and claim bingo when you get a winning pattern
                </CardDescription>
              </CardHeader>
              <CardContent className={`grid gap-4 ${
                cards.length === 1 
                  ? 'grid-cols-1' 
                  : cards.length === 2 
                  ? 'grid-cols-1 md:grid-cols-2' 
                  : 'grid-cols-1 md:grid-cols-2'
              }`}>
                {cards.map((card) => (
                  <BingoCard 
                    key={card.id} 
                    card={card} 
                    calls={calls}
                    winCondition={gameRoom.win_condition}
                    playerId={player?.id}
                    playerName={player?.player_name}
                    praiseDollarValue={praiseDollarValue}
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
              voiceGender={voiceGender}
              isAutoCall={isAutoCall}
              callSpeed={callSpeed}
              voiceVolume={voiceVolume}
              hasWinner={!!gameRoom?.winner_player_id}
            />
            {isHost && (
              <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
                <CardHeader>
                  <CardTitle className="font-heading text-card-foreground">🎛️ Caller Controls</CardTitle>
                  <CardDescription className="text-card-foreground/80">
                    Customize the bingo caller settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Voice Gender Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-card-foreground">Caller Voice</label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setVoiceGender('female');
                          // Test the voice
                          speakCall('15', gameRoom.game_type, 'female', voiceVolume);
                        }}
                        variant={voiceGender === 'female' ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        Female
                      </Button>
                      <Button
                        onClick={() => {
                          setVoiceGender('male');
                          // Test the voice
                          speakCall('15', gameRoom.game_type, 'male', voiceVolume);
                        }}
                        variant={voiceGender === 'male' ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        Male
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Click to test voice
                    </p>
                  </div>

                  {/* Volume control */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-card-foreground">Caller Volume</label>
                      <span className="text-sm text-card-foreground/60">{Math.round(voiceVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={voiceVolume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setVoiceVolume(v);
                        localStorage.setItem('bingo-voice-volume', String(v));
                      }}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Auto-Call Toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-card-foreground">Calling Mode</label>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsAutoCall(false)}
                        variant={!isAutoCall ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        Manual
                      </Button>
                      <Button
                        onClick={() => setIsAutoCall(true)}
                        variant={isAutoCall ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        Auto
                      </Button>
                    </div>
                  </div>

                  {/* Speed Slider (only show when auto-call is enabled) */}
                  {isAutoCall && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm font-medium text-card-foreground">Call Speed</label>
                        <span className="text-sm text-card-foreground/60">{callSpeed}s between calls</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="15"
                        step="1"
                        value={callSpeed}
                        onChange={(e) => setCallSpeed(Number(e.target.value))}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-card-foreground/60">
                        <span>Fast (2s)</span>
                        <span>Normal (8s)</span>
                        <span>Slow (15s)</span>
                      </div>
                    </div>
                  )}

                  {/* Praise Dollar Value */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-card-foreground">Game Prize</label>
                      <span className="text-lg font-bold text-accent">${praiseDollarValue}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={praiseDollarValue}
                      onChange={async (e) => {
                        const newValue = Number(e.target.value);
                        setPraiseDollarValue(newValue);
                        // Update in database
                        await supabase
                          .from("game_rooms")
                          .update({ praise_dollar_value: newValue })
                          .eq("id", gameRoom.id);
                      }}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <div className="flex justify-between text-xs text-card-foreground/60">
                      <span>$10</span>
                      <span>Praise Dollars</span>
                      <span>$1000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Leaderboard players={players} currentPlayerId={player?.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;