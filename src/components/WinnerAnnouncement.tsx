import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Confetti from "react-confetti";

interface WinnerAnnouncementProps {
  winnerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WinnerAnnouncement = ({ winnerName, isOpen, onClose }: WinnerAnnouncementProps) => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          <DialogHeader>
            <DialogTitle className="text-center text-4xl font-heading text-primary mb-4">
              🎉 BINGO! 🎉
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-center py-6">
            <div className="text-6xl animate-bounce">🏆</div>
            
            <div className="space-y-2">
              <p className="text-2xl font-heading text-foreground">
                Congratulations!
              </p>
              <p className="text-3xl font-heading font-bold text-primary">
                {winnerName}
              </p>
              <p className="text-xl text-muted-foreground">
                has won the game!
              </p>
            </div>

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
