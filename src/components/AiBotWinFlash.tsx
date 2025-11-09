import { useEffect, useState } from "react";

interface AiBotWinFlashProps {
  botName: string;
  gameType: string;
  isVisible: boolean;
  onComplete: () => void;
}

export const AiBotWinFlash = ({ botName, gameType, isVisible, onComplete }: AiBotWinFlashProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 500); // Wait for fade out
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible && !show) return null;

  const gameTypeDisplay = {
    'four_corners': 'Four Corners',
    'straight': 'Straight Line',
    'diagonal': 'Diagonal',
    'coverall': 'Coverall'
  }[gameType] || gameType;

  return (
    <div
      className={`fixed top-1/3 left-0 right-0 z-50 pointer-events-none transition-all duration-500 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-r from-accent/95 via-primary/95 to-accent/95 backdrop-blur-lg border-4 border-primary shadow-2xl rounded-2xl p-8 animate-pulse">
          <div className="text-center space-y-3">
            <div className="text-5xl font-heading font-bold text-white drop-shadow-lg">
              🤖 AI BOT WIN! 🤖
            </div>
            <div className="text-3xl font-heading text-white/90">
              <span className="font-bold text-accent-foreground">{botName}</span>
            </div>
            <div className="text-2xl font-heading text-white/80">
              completed <span className="font-bold text-accent-foreground">{gameTypeDisplay}</span>!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
