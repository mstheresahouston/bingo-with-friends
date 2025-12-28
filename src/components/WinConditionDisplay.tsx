import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WIN_CONDITIONS } from "@/lib/winConditions";

interface WinConditionDisplayProps {
  winCondition: string;
  gameRoomId?: string;
  customPrize?: number; // The actual prize set by host via slider
  fourCornersWinnerId?: string | null;
  straightWinnerId?: string | null;
  diagonalWinnerId?: string | null;
  multiGameProgress?: Record<string, boolean>;
  progressivePatterns?: string[];
}

export const WinConditionDisplay = ({ 
  winCondition, 
  gameRoomId,
  customPrize,
  fourCornersWinnerId,
  straightWinnerId,
  diagonalWinnerId,
  multiGameProgress,
  progressivePatterns,
}: WinConditionDisplayProps) => {
  const isMultiGame = winCondition === "multi_game" || winCondition === "custom_progressive";
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});

  // Calculate display prize - use custom prize if set, otherwise use default
  const defaultPrize = WIN_CONDITIONS[winCondition]?.defaultPrize || 100;
  const displayPrize = customPrize || defaultPrize;
  const isCustomPrize = customPrize && customPrize !== defaultPrize;

  useEffect(() => {
    const fetchWinnerNames = async () => {
      if (!isMultiGame || !gameRoomId) return;

      const names: Record<string, string> = {};

      if (fourCornersWinnerId) {
        const { data } = await supabase
          .from("players")
          .select("player_name")
          .eq("id", fourCornersWinnerId)
          .single();
        if (data) names.four_corners = data.player_name;
      }

      if (straightWinnerId) {
        const { data } = await supabase
          .from("players")
          .select("player_name")
          .eq("id", straightWinnerId)
          .single();
        if (data) names.straight = data.player_name;
      }

      if (diagonalWinnerId) {
        const { data } = await supabase
          .from("players")
          .select("player_name")
          .eq("id", diagonalWinnerId)
          .single();
        if (data) names.diagonal = data.player_name;
      }

      setWinnerNames(names);
    };

    fetchWinnerNames();
  }, [isMultiGame, gameRoomId, fourCornersWinnerId, straightWinnerId, diagonalWinnerId]);

  const getLabel = () => {
    if (winCondition === "custom_progressive") {
      return "Custom Progressive";
    }
    if (winCondition === "multi_game") {
      return "Multi-Game (Progressive)";
    }
    return WIN_CONDITIONS[winCondition]?.label || winCondition;
  };

  // Get patterns for progressive display
  const patterns = progressivePatterns || ['four_corners', 'straight', 'diagonal', 'coverall'];

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-2 border-accent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading text-card-foreground">
            🎯 Current Game
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCustomPrize && (
              <Badge variant="outline" className="text-xs text-accent border-accent">
                Custom
              </Badge>
            )}
            <Badge variant="secondary" className="text-lg font-bold">
              ${displayPrize}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {getLabel()}
            </p>
            {WIN_CONDITIONS[winCondition]?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {WIN_CONDITIONS[winCondition].description}
              </p>
            )}
          </div>

          {isMultiGame && multiGameProgress && (
            <div className="space-y-2 pt-3 border-t border-border">
              <p className="text-sm font-medium text-card-foreground/80 text-center">
                Progressive Game Stages
              </p>
              <div className="grid grid-cols-2 gap-2">
                {patterns.map((pattern) => {
                  const isComplete = multiGameProgress[pattern];
                  const config = WIN_CONDITIONS[pattern];
                  const prize = pattern === 'straight' ? 150 : config?.defaultPrize || 100;
                  
                  return (
                    <div 
                      key={pattern}
                      className={`flex flex-col gap-1 p-2 rounded-md ${
                        isComplete ? 'bg-accent/20' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-accent" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${
                          isComplete ? 'text-accent font-semibold' : 'text-card-foreground'
                        }`}>
                          {config?.label?.split(' ')[0] || pattern} (${prize})
                        </span>
                      </div>
                      {winnerNames[pattern] && (
                        <span className="text-xs text-accent ml-7">
                          🏆 {winnerNames[pattern]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
