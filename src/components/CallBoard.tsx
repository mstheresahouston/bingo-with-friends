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
}

export const CallBoard = ({ calls, isHost, gameRoom, voiceGender, isAutoCall, callSpeed, voiceVolume }: CallBoardProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllCalls, setShowAllCalls] = useState(false);
  const { toast } = useToast();
  const autoCallTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateCall = async () => {
    setIsGenerating(true);
    try {
      let items: string[] = [];
      
      if (gameRoom.game_type === "numbers") {
        items = Array.from({ length: 75 }, (_, i) => (i + 1).toString());
      } else {
        items = [
          "Grace", "Faith", "Hope", "Love", "Joy",
          "Peace", "Mercy", "Trust", "Strength", "Wisdom",
          "Courage", "Prayer", "Blessing", "Light", "Spirit",
          "Heart", "Soul", "Truth", "Life", "Praise",
          "Glory", "Heaven", "Angels", "Miracle", "Goodness"
        ];
      }

      const calledValues = calls.map((c) => c.call_value);
      const availableItems = items.filter((item) => !calledValues.includes(item));

      if (availableItems.length === 0) {
        toast({
          title: "All Items Called",
          description: `All ${gameRoom.game_type} have been called!`,
        });
        setIsGenerating(false);
        return;
      }

      const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];

      const { error } = await supabase.from("game_calls").insert({
        room_id: gameRoom.id,
        call_value: randomItem,
        call_number: calls.length + 1,
      });

      if (error) throw error;

      playCallSound(voiceVolume);
      speakCall(randomItem, gameRoom.game_type, voiceGender, voiceVolume);
      
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
    } catch (error) {
      console.error("Error generating call:", error);
      toast({
        title: "Error",
        description: "Failed to generate call",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-call functionality
  useEffect(() => {
    if (isHost && isAutoCall && calls.length > 0) {
      // Clear any existing timer
      if (autoCallTimerRef.current) {
        clearTimeout(autoCallTimerRef.current);
      }

      // Set up new timer based on speed (speed is in seconds)
      autoCallTimerRef.current = setTimeout(() => {
        if (!isGenerating) {
          generateCall();
        }
      }, callSpeed * 1000);
    }

    // Cleanup timer on unmount or when auto-call is disabled
    return () => {
      if (autoCallTimerRef.current) {
        clearTimeout(autoCallTimerRef.current);
      }
    };
  }, [isHost, isAutoCall, callSpeed, calls.length, isGenerating]);

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-card-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          📣 Live Calls
        </CardTitle>
        <CardDescription className="text-card-foreground/80">
          Watch the called {gameRoom.game_type} appear in real time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isHost && (
          <Button
            onClick={generateCall}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity font-heading"
          >
            {isGenerating ? "Calling..." : "Next Call (Host Only)"}
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
                    {calls[calls.length - 1].call_value}
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
                          <span className="font-heading font-bold">{call.call_value}</span>
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
