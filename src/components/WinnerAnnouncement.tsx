import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Confetti from "react-confetti";
import { supabase } from "@/integrations/supabase/client";

interface Winner {
  id: string;
  player_id: string;
  player_name: string;
  prize_amount: number;
}

interface WinnerAnnouncementProps {
  winnerName: string;
  isOpen: boolean;
  onClose: () => void;
  prizeAmount?: number;
  winType?: string;
  showClaimWindow?: boolean;
  roomId?: string;
}

export const WinnerAnnouncement = ({ 
  winnerName, 
  isOpen, 
  onClose,
  prizeAmount,
  winType,
  showClaimWindow = false,
  roomId,
}: WinnerAnnouncementProps) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [claimCountdown, setClaimCountdown] = useState(10);
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch winners when dialog opens and during claim window
  useEffect(() => {
    if (!isOpen || !roomId || !winType) {
      setWinners([]);
      return;
    }

    const fetchWinners = async () => {
      // Get winners from the last 10 seconds for this win type
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      
      const { data: winnersData } = await supabase
        .from("game_winners")
        .select("id, player_id, prize_amount")
        .eq("room_id", roomId)
        .eq("win_type", winType)
        .gte("claimed_at", tenSecondsAgo);

      if (winnersData && winnersData.length > 0) {
        // Fetch player names for all winners
        const playerIds = winnersData.map(w => w.player_id);
        const { data: playersData } = await supabase
          .from("players")
          .select("id, player_name")
          .in("id", playerIds);

        const winnersWithNames = winnersData.map(w => ({
          ...w,
          player_name: playersData?.find(p => p.id === w.player_id)?.player_name || "Unknown"
        }));

        setWinners(winnersWithNames);
      }
    };

    // Fetch immediately and then every second during claim window
    fetchWinners();
    
    if (showClaimWindow && claimCountdown > 0) {
      const pollInterval = setInterval(fetchWinners, 1000);
      return () => clearInterval(pollInterval);
    }
  }, [isOpen, roomId, winType, showClaimWindow, claimCountdown]);

  // Countdown timer for claim window
  useEffect(() => {
    if (!isOpen || !showClaimWindow) {
      setClaimCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setClaimCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, showClaimWindow]);

  // Calculate split prize based on number of winners
  const splitPrize = winners.length > 0 && prizeAmount 
    ? Math.floor(prizeAmount / winners.length) 
    : prizeAmount;

  return (
    <>
      {isOpen && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border-4 border-primary bg-gradient-to-br from-accent/20 to-primary/20 backdrop-blur-lg">
          <DialogTitle className="text-center text-4xl font-heading text-primary mb-4">
            🎉 BINGO! 🎉
          </DialogTitle>
          
          <div className="space-y-6 text-center py-6">
            <div className="text-6xl animate-bounce">🏆</div>
            
            <div className="space-y-2">
              <p className="text-2xl font-heading text-foreground">
                Congratulations!
              </p>
              
              {/* Show all winners */}
              {winners.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-lg text-muted-foreground">
                    {winners.length} Winners!
                  </p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    {winners.map((winner, index) => (
                      <div key={winner.id} className="flex justify-between items-center text-sm">
                        <span className="font-heading font-bold text-primary">
                          {index + 1}. {winner.player_name}
                        </span>
                        {(!showClaimWindow || claimCountdown === 0) && (
                          <span className="text-accent font-bold">
                            ${splitPrize}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-heading font-bold text-primary">
                  {winnerName}
                </p>
              )}
              
              {winType && (
                <p className="text-lg text-muted-foreground">
                  {winType.replace(/_/g, ' ').toUpperCase()} Winner{winners.length > 1 ? 's' : ''}!
                </p>
              )}
              
              {/* Only show prize amount after claim window closes */}
              {prizeAmount && (!showClaimWindow || claimCountdown === 0) && (
                <p className="text-xl font-bold text-accent">
                  {winners.length > 1 
                    ? `$${prizeAmount} split between ${winners.length} winners ($${splitPrize} each)`
                    : `Won $${prizeAmount} Praise Dollars!`
                  }
                </p>
              )}
            </div>

            {/* 10-second claim window indicator */}
            {showClaimWindow && claimCountdown > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  ⏱️ Other players can still claim bingo!
                </p>
                <Progress value={(claimCountdown / 10) * 100} className="h-2" />
                <p className="text-lg font-bold text-accent">
                  {claimCountdown} seconds remaining
                </p>
                <p className="text-xs text-muted-foreground">
                  Valid bingos within this window will split the ${prizeAmount} prize
                </p>
              </div>
            )}

            {showClaimWindow && claimCountdown === 0 && (
              <div className="bg-accent/20 rounded-lg p-4">
                <p className="text-lg font-bold text-accent">
                  ✅ Claim window closed!
                </p>
              </div>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity font-heading text-lg"
              size="lg"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
