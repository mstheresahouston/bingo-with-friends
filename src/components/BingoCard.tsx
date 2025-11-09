import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { playBingoSound } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BingoCardProps {
  card: any;
  calls: any[];
  winCondition: string;
  playerId: string;
  playerName: string;
}

export const BingoCard = ({ card, calls, winCondition, playerId, playerName }: BingoCardProps) => {
  const [markedCells, setMarkedCells] = useState<number[]>(card.marked_cells || []);
  const { toast } = useToast();
  const cardData = card.card_data;

  const calledValues = calls.map((call) => call.call_value);

  const toggleCell = async (rowIndex: number, colIndex: number) => {
    const cellIndex = rowIndex * 5 + colIndex;
    const cell = cardData[rowIndex][colIndex];

    if (cell.isFree) return;

    const newMarkedCells = markedCells.includes(cellIndex)
      ? markedCells.filter((i) => i !== cellIndex)
      : [...markedCells, cellIndex];

    setMarkedCells(newMarkedCells);

    // Update in database
    try {
      const { error } = await supabase
        .from("bingo_cards")
        .update({ marked_cells: newMarkedCells })
        .eq("id", card.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating card:", error);
      toast({
        title: "Error",
        description: "Failed to update card",
        variant: "destructive",
      });
    }
  };

  const handleClaimBingo = async () => {
    // Verify the bingo is correct
    const hasBingo = checkBingo(markedCells);
    
    if (!hasBingo) {
      toast({
        title: "No Bingo Yet",
        description: "You don't have a valid bingo pattern. Keep playing!",
        variant: "destructive",
      });
      return;
    }

    // Verify all marked cells correspond to called values
    const allMarkedValid = markedCells.every((cellIndex) => {
      const row = Math.floor(cellIndex / 5);
      const col = cellIndex % 5;
      const cell = cardData[row][col];
      return cell.isFree || calledValues.includes(cell.value);
    });

    if (!allMarkedValid) {
      toast({
        title: "Invalid Bingo",
        description: "You have marked numbers that haven't been called yet!",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the room_id from the player
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("room_id")
        .eq("id", playerId)
        .single();

      if (playerError) throw playerError;

      // Update the game room with the winner
      const { error: roomError } = await supabase
        .from("game_rooms")
        .update({
          winner_player_id: playerId,
          winner_announced_at: new Date().toISOString(),
        })
        .eq("id", playerData.room_id)
        .is("winner_player_id", null); // Only if no winner yet

      if (roomError) throw roomError;

      // Update player score
      await supabase
        .from("players")
        .update({ score: 1 })
        .eq("id", playerId);

      playBingoSound();

      toast({
        title: "🎉 BINGO CLAIMED! 🎉",
        description: `Congratulations ${playerName}!`,
      });
    } catch (error) {
      console.error("Error claiming bingo:", error);
      toast({
        title: "Error",
        description: "Failed to claim bingo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const checkBingo = (marked: number[]) => {
    if (winCondition === "coverall") {
      // Check if all 25 cells are marked (including free space)
      const allCells = Array.from({ length: 25 }, (_, i) => i);
      return allCells.every((cell) => marked.includes(cell) || cardData[Math.floor(cell / 5)][cell % 5].isFree);
    }

    // Straight line condition (rows, columns, diagonals)
    // Check rows
    for (let i = 0; i < 5; i++) {
      const row = Array.from({ length: 5 }, (_, j) => i * 5 + j);
      if (row.every((cell) => marked.includes(cell) || cardData[Math.floor(cell / 5)][cell % 5].isFree)) {
        return true;
      }
    }

    // Check columns
    for (let i = 0; i < 5; i++) {
      const col = Array.from({ length: 5 }, (_, j) => j * 5 + i);
      if (col.every((cell) => marked.includes(cell) || cardData[Math.floor(cell / 5)][cell % 5].isFree)) {
        return true;
      }
    }

    // Check diagonals
    const diag1 = [0, 6, 12, 18, 24];
    const diag2 = [4, 8, 12, 16, 20];

    if (diag1.every((cell) => marked.includes(cell) || cardData[Math.floor(cell / 5)][cell % 5].isFree)) {
      return true;
    }

    if (diag2.every((cell) => marked.includes(cell) || cardData[Math.floor(cell / 5)][cell % 5].isFree)) {
      return true;
    }

    return false;
  };

  return (
    <Card className="bg-gradient-to-br from-card to-background border-2 border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-card-foreground">
          {playerName}'s Card
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BINGO Header */}
        <div className="grid grid-cols-5 gap-2">
          {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => {
            const colors = [
              'bg-[hsl(280,60%,50%)] border-[hsl(280,60%,50%)]', // B - Purple
              'bg-[hsl(320,60%,55%)] border-[hsl(320,60%,55%)]', // I - Pink
              'bg-[hsl(0,60%,55%)] border-[hsl(0,60%,55%)]',     // N - Red
              'bg-[hsl(40,70%,55%)] border-[hsl(40,70%,55%)]',   // G - Orange
              'bg-[hsl(200,60%,55%)] border-[hsl(200,60%,55%)]', // O - Blue
            ];
            return (
              <div
                key={letter}
                className={`aspect-square rounded-lg font-heading text-xl md:text-2xl font-bold flex items-center justify-center text-white border-2 ${colors[idx]}`}
              >
                {letter}
              </div>
            );
          })}
        </div>
        
        {/* Bingo Grid */}
        <div className="grid grid-cols-5 gap-2">
          {cardData.map((row: any[], rowIndex: number) =>
            row.map((cell: any, colIndex: number) => {
              const cellIndex = rowIndex * 5 + colIndex;
              const isMarked = markedCells.includes(cellIndex) || cell.isFree;
              const isCalled = calledValues.includes(cell.value);

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                  className={cn(
                    "aspect-square rounded-lg font-heading text-sm md:text-base font-bold transition-all duration-200",
                    "flex items-center justify-center border-2",
                    cell.isFree
                      ? "bg-accent text-accent-foreground border-accent cursor-default"
                      : isMarked
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-95"
                      : isCalled
                      ? "bg-secondary/50 text-secondary-foreground border-secondary hover:bg-secondary hover:scale-105"
                      : "bg-card text-card-foreground border-border hover:border-secondary hover:scale-105"
                  )}
                  disabled={cell.isFree}
                >
                  {cell.value}
                </button>
              );
            })
          )}
        </div>

        <Button
          onClick={handleClaimBingo}
          className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity font-heading text-lg py-6"
          size="lg"
        >
          🎉 Claim Bingo! 🎉
        </Button>
      </CardContent>
    </Card>
  );
};
