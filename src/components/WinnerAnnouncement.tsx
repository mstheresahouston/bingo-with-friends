import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Confetti from "react-confetti";

interface WinnerAnnouncementProps {
  winnerName: string;
  isOpen: boolean;
  onClose: () => void;
  prizeAmount?: number;
  winType?: string;
  showClaimWindow?: boolean;
}

export const WinnerAnnouncement = ({ 
  winnerName, 
  isOpen, 
  onClose,
  prizeAmount,
  winType,
  showClaimWindow = false,
}: WinnerAnnouncementProps) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [claimCountdown, setClaimCountdown] = useState(10);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
              <p className="text-3xl font-heading font-bold text-primary">
                {winnerName}
              </p>
            {winType && (
              <p className="text-lg text-muted-foreground">
                {winType.replace(/_/g, ' ').toUpperCase()} Winner!
              </p>
            )}
            {/* Only show prize amount after claim window closes */}
            {prizeAmount && (!showClaimWindow || claimCountdown === 0) && (
              <p className="text-xl font-bold text-accent">
                Won ${prizeAmount} Praise Dollars!
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
                  Valid bingos within this window will split the prize
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
