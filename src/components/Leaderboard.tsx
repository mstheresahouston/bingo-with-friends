import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardProps {
  players: any[];
  currentPlayerId: string;
}

export const Leaderboard = ({ players, currentPlayerId }: LeaderboardProps) => {
  return (
    <Card className="backdrop-blur-sm bg-card/95 border-2 border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-card-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          🏆 Leaderboard
        </CardTitle>
        <CardDescription className="text-card-foreground/80">
          Current standings in the room
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.length === 0 ? (
            <p className="text-center text-card-foreground/60 py-4">No players yet</p>
          ) : (
            players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  player.id === currentPlayerId
                    ? "bg-primary/20 border-primary"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {index === 0 && <Trophy className="w-5 h-5 text-accent" />}
                  {index === 1 && <Medal className="w-5 h-5 text-secondary" />}
                  {index === 2 && <Medal className="w-5 h-5 text-muted-foreground" />}
                  {index > 2 && <span className="w-5 text-center font-bold">{index + 1}</span>}
                  <span className="font-heading font-semibold text-card-foreground">
                    {player.player_name}
                  </span>
                </div>
                <span className="text-lg font-bold text-primary">{player.score}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
