import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaderboardProps {
  players: any[];
  currentPlayerId: string;
}

export const Leaderboard = ({ players, currentPlayerId }: LeaderboardProps) => {
  // Sort all players by total_praise_dollars (already sorted from GameBoard, but ensure)
  const rankedPlayers = [...players].sort((a, b) => 
    (b.total_praise_dollars || 0) - (a.total_praise_dollars || 0)
  );
  
  return (
    <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-card-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          🏆 Leaderboard
        </CardTitle>
        <CardDescription className="text-card-foreground/80">
          All players ranked by Praise Dollars
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-2">
          <div className="space-y-2">
            {rankedPlayers.length === 0 ? (
              <p className="text-center text-card-foreground/60 py-4">No players yet</p>
            ) : (
              rankedPlayers.map((player, index) => {
                const isAI = player.player_name.endsWith("Bot");
                const rank = index + 1;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      player.id === currentPlayerId
                        ? "bg-primary/20 border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {rank === 1 && <Trophy className="w-5 h-5 text-accent" />}
                      {rank === 2 && <Medal className="w-5 h-5 text-secondary" />}
                      {rank === 3 && <Medal className="w-5 h-5 text-muted-foreground" />}
                      {rank > 3 && <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>}
                      <div className="flex flex-col">
                        <span className="font-heading font-semibold text-card-foreground">
                          {player.player_name}
                          {isAI && <span className="text-xs ml-2 text-muted-foreground">🤖 AI</span>}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="w-3 h-3" />
                          <span>${player.total_praise_dollars || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-primary">{player.score}</span>
                      <span className="text-xs text-muted-foreground">wins</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
