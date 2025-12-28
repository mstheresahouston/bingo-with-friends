import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { playCallSound, speakCall } from "@/lib/sounds";

interface CallBoardProps {
  calls: any[];
  isHost: boolean;
  gameRoom: any;
  voiceGender: 'male' | 'female';
  isAutoCall: boolean;
  callSpeed: number;
  voiceVolume: number;
  hasWinner: boolean;
  isClaimWindowActive?: boolean;
}

export const CallBoard = ({ calls, isHost, gameRoom, voiceGender, isAutoCall, callSpeed, voiceVolume, hasWinner, isClaimWindowActive = false }: CallBoardProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllCalls, setShowAllCalls] = useState(false);
  const { toast } = useToast();
  const autoCallTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateCall = async () => {
    if (isGenerating) return; // Prevent duplicate calls
    
    setIsGenerating(true);
    try {
      // Check if game already has a winner before making a call
      const { data: roomCheck } = await supabase
        .from("game_rooms")
        .select("winner_player_id")
        .eq("id", gameRoom.id)
        .single();
      
      if (roomCheck?.winner_player_id) {
        setIsGenerating(false);
        return; // Game has ended, don't make more calls
      }
      
      // Fetch the latest calls from DB to avoid race conditions with stale state
      const { data: latestCalls, error: fetchError } = await supabase
        .from("game_calls")
        .select("call_value")
        .eq("room_id", gameRoom.id);
      
      if (fetchError) throw fetchError;
      
      // Always use numbers (1-75)
      const items = Array.from({ length: 75 }, (_, i) => (i + 1).toString());
      const calledValues = (latestCalls || []).map((c) => c.call_value);
      const availableItems = items.filter((item) => !calledValues.includes(item));

      if (availableItems.length === 0) {
        setIsGenerating(false);
        toast({
          title: "All Numbers Called",
          description: "All 75 numbers have been called!",
        });
        return;
      }

      const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
      const isFirstCall = calledValues.length === 0;

      const { error } = await supabase.from("game_calls").insert({
        room_id: gameRoom.id,
        call_value: randomItem,
        call_number: calledValues.length + 1,
      });

      if (error) throw error;

      playCallSound(voiceVolume);
      speakCall(randomItem, "numbers", voiceGender, voiceVolume, isFirstCall);
      
      // Trigger AI player processing
      supabase.functions.invoke('process-ai-players', {
        body: {
          roomId: gameRoom.id,
          callValue: randomItem,
        },
      }).catch(err => console.error('AI player processing error:', err));
      
      toast({
        title: "New Call!",
        description: `"${randomItem}" has been called`,
      });
    } catch (error: any) {
      console.error("Error generating call:", error);
      // Don't show error toast for duplicate key (race condition already handled)
      if (error?.code !== '23505') {
        toast({
          title: "Error",
          description: "Failed to generate call",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-call functionality
  useEffect(() => {
    // Check if all items have been called
    const items = Array.from({ length: 75 }, (_, i) => (i + 1).toString());
    const calledValues = calls.map((c) => c.call_value);
    const availableItems = items.filter((item) => !calledValues.includes(item));
    const allItemsCalled = availableItems.length === 0;

    // Clear any existing timer when auto-call is toggled off, game ends, claim window active, or all items called
    if (!isAutoCall || hasWinner || isClaimWindowActive || !isHost || allItemsCalled) {
      if (autoCallTimerRef.current) {
        clearTimeout(autoCallTimerRef.current);
        autoCallTimerRef.current = null;
      }
      return;
    }

    // Only set up timer if auto-call is enabled, no claim window, and no timer is running
    if (isAutoCall && isHost && !hasWinner && !isClaimWindowActive && !allItemsCalled && !autoCallTimerRef.current) {
      autoCallTimerRef.current = setTimeout(() => {
        generateCall().then(() => {
          // Clear timer reference after call is made
          autoCallTimerRef.current = null;
        });
      }, callSpeed * 1000);
    }

    // Cleanup on unmount
    return () => {
      if (autoCallTimerRef.current) {
        clearTimeout(autoCallTimerRef.current);
        autoCallTimerRef.current = null;
      }
    };
  }, [isHost, isAutoCall, callSpeed, isGenerating, hasWinner, isClaimWindowActive, calls]);

  // Format call display with letter
  const formatCall = (value: string) => {
    const num = parseInt(value);
    let letter = "";
    if (num >= 1 && num <= 15) letter = "B";
    else if (num >= 16 && num <= 30) letter = "I";
    else if (num >= 31 && num <= 45) letter = "N";
    else if (num >= 46 && num <= 60) letter = "G";
    else if (num >= 61 && num <= 75) letter = "O";
    return `${letter}-${num}`;
  };

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-card-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          📣 Live Calls
        </CardTitle>
        <CardDescription className="text-card-foreground/80">
          Watch the called numbers appear in real time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isHost && (
          <Button
            onClick={generateCall}
            disabled={isGenerating || hasWinner}
            className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity font-heading"
          >
            {hasWinner ? "Game Ended - Reset to Continue" : isGenerating ? "Calling..." : "Next Call (Host Only)"}
          </Button>
        )}

        <div className="space-y-2">
          {calls.length === 0 ? (
            <p className="text-center text-card-foreground/60 py-8">
              No calls yet. {isHost ? "Click the button to start!" : "Waiting for host to start..."}
            </p>
          ) : (
            <>
              {/* Show most recent call prominently */}
              <div className="p-4 rounded-lg border-2 bg-accent text-accent-foreground border-accent animate-pulse">
                <div className="flex justify-between items-center">
                  <span className="font-heading font-bold text-xl">
                    {formatCall(calls[calls.length - 1].call_value)}
                  </span>
                  <span className="text-sm opacity-75">
                    Latest Call #{calls[calls.length - 1].call_number}
                  </span>
                </div>
              </div>

              {/* Toggle button for call history */}
              <Button
                variant="outline"
                onClick={() => setShowAllCalls(!showAllCalls)}
                className="w-full border-border text-card-foreground hover:bg-secondary/20"
              >
                {showAllCalls ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Call History ({calls.length} calls)
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Call History ({calls.length} calls)
                  </>
                )}
              </Button>

              {/* Previous calls - shown when expanded */}
              {showAllCalls && calls.length > 1 && (
                <div className="max-h-96 overflow-y-auto space-y-2 pt-2">
                  {calls
                    .slice()
                    .reverse()
                    .slice(1) // Skip the most recent call since it's shown above
                    .map((call) => (
                      <div
                        key={call.id}
                        className="p-3 rounded-lg border-2 bg-card text-card-foreground border-border"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-heading font-bold">{formatCall(call.call_value)}</span>
                          <span className="text-sm opacity-75">#{call.call_number}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
