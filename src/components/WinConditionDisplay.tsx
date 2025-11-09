import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

interface WinConditionDisplayProps {
  winCondition: string;
  multiGameProgress?: {
    four_corners: boolean;
    straight: boolean;
    diagonal: boolean;
    coverall: boolean;
  };
}

const WIN_CONDITION_LABELS: Record<string, string> = {
  straight: "Straight Line (Any Direction)",
  four_corners: "Four Corners",
  block_of_four: "Block of Four",
  diagonal: "Diagonal Only",
  coverall: "Cover All (Full Card)",
  multi_game: "Multi-Game (Progressive)",
};

const WIN_CONDITION_PRIZES: Record<string, number> = {
  straight: 100,
  diagonal: 100,
  four_corners: 125,
  block_of_four: 150,
  coverall: 350,
  multi_game: 675, // Total of all four games: 125 + 100 + 100 + 350
};

export const WinConditionDisplay = ({ winCondition, multiGameProgress }: WinConditionDisplayProps) => {
  const isMultiGame = winCondition === "multi_game";
  const prizeValue = WIN_CONDITION_PRIZES[winCondition] || 100;

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-2 border-accent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading text-card-foreground">
            🎯 Current Game
          </CardTitle>
          <Badge variant="secondary" className="text-lg font-bold">
            ${prizeValue}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {WIN_CONDITION_LABELS[winCondition]}
            </p>
          </div>

          {isMultiGame && multiGameProgress && (
            <div className="space-y-2 pt-3 border-t border-border">
              <p className="text-sm font-medium text-card-foreground/80 text-center">
                Progressive Game Stages
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 p-2 rounded-md ${
                  multiGameProgress.four_corners ? 'bg-accent/20' : 'bg-muted/50'
                }`}>
                  {multiGameProgress.four_corners ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${
                    multiGameProgress.four_corners ? 'text-accent font-semibold' : 'text-card-foreground'
                  }`}>
                    Four Corners
                  </span>
                </div>

                <div className={`flex items-center gap-2 p-2 rounded-md ${
                  multiGameProgress.straight ? 'bg-accent/20' : 'bg-muted/50'
                }`}>
                  {multiGameProgress.straight ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${
                    multiGameProgress.straight ? 'text-accent font-semibold' : 'text-card-foreground'
                  }`}>
                    Straight Line
                  </span>
                </div>

                <div className={`flex items-center gap-2 p-2 rounded-md ${
                  multiGameProgress.diagonal ? 'bg-accent/20' : 'bg-muted/50'
                }`}>
                  {multiGameProgress.diagonal ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${
                    multiGameProgress.diagonal ? 'text-accent font-semibold' : 'text-card-foreground'
                  }`}>
                    Diagonal
                  </span>
                </div>

                <div className={`flex items-center gap-2 p-2 rounded-md ${
                  multiGameProgress.coverall ? 'bg-accent/20' : 'bg-muted/50'
                }`}>
                  {multiGameProgress.coverall ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${
                    multiGameProgress.coverall ? 'text-accent font-semibold' : 'text-card-foreground'
                  }`}>
                    Cover All
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
