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
  praiseDollarValue: number;
}

export const BingoCard = ({ card, calls, winCondition, playerId, playerName, praiseDollarValue }: BingoCardProps) => {
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

      // Get current player data to increment score and praise dollars
      const { data: currentPlayer, error: fetchError } = await supabase
        .from("players")
        .select("score, total_praise_dollars")
        .eq("id", playerId)
        .single();

      if (fetchError) throw fetchError;

      // Update player score and praise dollars
      await supabase
        .from("players")
        .update({ 
          score: (currentPlayer.score || 0) + 1,
          total_praise_dollars: (currentPlayer.total_praise_dollars || 0) + praiseDollarValue
        })
        .eq("id", playerId);

      playBingoSound();

      toast({
        title: "🎉 BINGO CLAIMED! 🎉",
        description: `Congratulations ${playerName}! You won $${praiseDollarValue} Praise Dollars!`,
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
    const markedSet = new Set(marked);
    
    if (winCondition === "coverall") {
      // Check if all 25 cells are marked
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const cellIndex = i * 5 + j;
          if (!markedSet.has(cellIndex) && !cardData[i][j].isFree) {
            return false;
          }
        }
      }
      return true;
    }

    if (winCondition === "four_corners") {
      // Check all four corners: [0,0], [0,4], [4,0], [4,4]
      const corners = [0, 4, 20, 24]; // top-left, top-right, bottom-left, bottom-right
      return corners.every(index => markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree);
    }

    if (winCondition === "block_of_four") {
      // Check for any 2x2 block
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const indices = [
            i * 5 + j,
            i * 5 + j + 1,
            (i + 1) * 5 + j,
            (i + 1) * 5 + j + 1
          ];
          const blockComplete = indices.every(index => 
            markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree
          );
          if (blockComplete) return true;
        }
      }
      return false;
    }

    if (winCondition === "diagonal") {
      // Check both diagonals
      let diag1Complete = true;
      let diag2Complete = true;
      for (let i = 0; i < 5; i++) {
        const diag1Index = i * 5 + i;
        const diag2Index = i * 5 + (4 - i);
        
        if (!markedSet.has(diag1Index) && !cardData[i][i].isFree) {
          diag1Complete = false;
        }
        if (!markedSet.has(diag2Index) && !cardData[i][4 - i].isFree) {
          diag2Complete = false;
        }
      }
      return diag1Complete || diag2Complete;
    }

    if (winCondition === "multi_game") {
      // Progressive: four_corners -> straight line -> diagonal -> coverall
      // Check four corners
      const corners = [0, 4, 20, 24];
      const hasFourCorners = corners.every(index => markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree);
      
      // Check straight line (row or column)
      let hasStraightLine = false;
      for (let i = 0; i < 5; i++) {
        let rowComplete = true;
        let colComplete = true;
        for (let j = 0; j < 5; j++) {
          const rowIndex = i * 5 + j;
          const colIndex = j * 5 + i;
          if (!markedSet.has(rowIndex) && !cardData[i][j].isFree) {
            rowComplete = false;
          }
          if (!markedSet.has(colIndex) && !cardData[j][i].isFree) {
            colComplete = false;
          }
        }
        if (rowComplete || colComplete) {
          hasStraightLine = true;
          break;
        }
      }
      
      // Check diagonal
      let diag1Complete = true;
      let diag2Complete = true;
      for (let i = 0; i < 5; i++) {
        const diag1Index = i * 5 + i;
        const diag2Index = i * 5 + (4 - i);
        
        if (!markedSet.has(diag1Index) && !cardData[i][i].isFree) {
          diag1Complete = false;
        }
        if (!markedSet.has(diag2Index) && !cardData[i][4 - i].isFree) {
          diag2Complete = false;
        }
      }
      const hasDiagonal = diag1Complete || diag2Complete;
      
      // Check coverall
      let hasCoverall = true;
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const cellIndex = i * 5 + j;
          if (!markedSet.has(cellIndex) && !cardData[i][j].isFree) {
            hasCoverall = false;
            break;
          }
        }
        if (!hasCoverall) break;
      }
      
      // Must complete all four in order
      return hasFourCorners && hasStraightLine && hasDiagonal && hasCoverall;
    }

    // Default: straight line (rows, columns, diagonals)
    // Check rows
    for (let i = 0; i < 5; i++) {
      let rowComplete = true;
      for (let j = 0; j < 5; j++) {
        const cellIndex = i * 5 + j;
        if (!markedSet.has(cellIndex) && !cardData[i][j].isFree) {
          rowComplete = false;
          break;
        }
      }
      if (rowComplete) return true;
    }

    // Check columns
    for (let j = 0; j < 5; j++) {
      let colComplete = true;
      for (let i = 0; i < 5; i++) {
        const cellIndex = i * 5 + j;
        if (!markedSet.has(cellIndex) && !cardData[i][j].isFree) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) return true;
    }

    // Check diagonals
    let diag1Complete = true;
    let diag2Complete = true;
    for (let i = 0; i < 5; i++) {
      const diag1Index = i * 5 + i;
      const diag2Index = i * 5 + (4 - i);
      
      if (!markedSet.has(diag1Index) && !cardData[i][i].isFree) {
        diag1Complete = false;
      }
      if (!markedSet.has(diag2Index) && !cardData[i][4 - i].isFree) {
        diag2Complete = false;
      }
    }

    return diag1Complete || diag2Complete;
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

              return (
                <button
                  key={`${card.id}-${rowIndex}-${colIndex}`}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                  className={cn(
                    "aspect-square rounded-lg font-heading text-sm md:text-base font-bold transition-all duration-200",
                    "flex items-center justify-center border-2",
                    cell.isFree
                      ? "bg-accent text-accent-foreground border-accent cursor-default"
                      : isMarked
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-95"
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
