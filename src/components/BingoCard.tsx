import { useState, useEffect, useRef } from "react";
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
  multiGameProgress?: {
    four_corners: boolean;
    straight: boolean;
    diagonal: boolean;
    coverall: boolean;
  };
}

export const BingoCard = ({ card, calls, winCondition, playerId, playerName, praiseDollarValue, multiGameProgress }: BingoCardProps) => {
  const [markedCells, setMarkedCells] = useState<number[]>(card.marked_cells || []);
  const { toast } = useToast();
  // Freeze the card layout for the session so numbers/positions never change mid-game
  const initialCardDataRef = useRef<any[][]>(card.card_data);
  const cardData = initialCardDataRef.current;

  const calledValues = calls.map((call) => call.call_value);

  // Update local state when card.marked_cells changes (e.g., after reset)
  useEffect(() => {
    setMarkedCells(card.marked_cells || []);
  }, [card.marked_cells]);

  // Determine which cells are part of the winning pattern
  const isPartOfPattern = (rowIndex: number, colIndex: number): boolean => {
    const cellIndex = rowIndex * 5 + colIndex;
    
    if (winCondition === "four_corners") {
      return cellIndex === 0 || cellIndex === 4 || cellIndex === 20 || cellIndex === 24;
    }
    
    if (winCondition === "diagonal") {
      // Main diagonal (top-left to bottom-right) or anti-diagonal (top-right to bottom-left)
      return rowIndex === colIndex || rowIndex + colIndex === 4;
    }
    
    if (winCondition === "coverall") {
      return true; // All cells
    }
    
    if (winCondition === "multi_game") {
      // Only highlight patterns that haven't been completed yet
      const progress = multiGameProgress || { four_corners: false, straight: false, diagonal: false, coverall: false };
      
      // If coverall not complete, show all cells
      if (!progress.coverall) return true;
      
      // If diagonal not complete, show diagonal cells
      if (!progress.diagonal && (rowIndex === colIndex || rowIndex + colIndex === 4)) return true;
      
      // If four_corners not complete, show corner cells
      if (!progress.four_corners && (cellIndex === 0 || cellIndex === 4 || cellIndex === 20 || cellIndex === 24)) return true;
      
      // If straight not complete, show all cells (any line could win)
      if (!progress.straight) return true;
      
      return false; // All patterns complete
    }
    
    if (winCondition === "block_of_four") {
      // Highlight all possible 2x2 blocks (show that any block works)
      return true; // Show all cells as potential
    }
    
    // For straight line, all cells could be part of a winning line
    return true;
  };

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

    try {
      // Get the room_id from the player first to fetch fresh calls
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("room_id")
        .eq("id", playerId)
        .single();

      if (playerError) throw playerError;

      // Fetch the latest calls from database to avoid race conditions
      const { data: freshCalls, error: callsError } = await supabase
        .from("game_calls")
        .select("call_value")
        .eq("room_id", playerData.room_id);

      if (callsError) throw callsError;

      const freshCalledValues = freshCalls?.map((call) => call.call_value) || [];

      // Verify all marked cells correspond to called values
      const invalidCells: string[] = [];
      const allMarkedValid = markedCells.every((cellIndex) => {
        const row = Math.floor(cellIndex / 5);
        const col = cellIndex % 5;
        const cell = cardData[row][col];
        const isValid = cell.isFree || freshCalledValues.includes(cell.value);
        if (!isValid) {
          invalidCells.push(cell.value);
        }
        return isValid;
      });

      if (!allMarkedValid) {
        toast({
          title: "Invalid Bingo",
          description: `These marked values haven't been called: ${invalidCells.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      // Now proceed with claiming - fetch player data again with full details
      const { data: playerFullData, error: playerFullError } = await supabase
        .from("players")
        .select("room_id, score, total_praise_dollars")
        .eq("id", playerId)
        .single();

      if (playerFullError) throw playerFullError;

      // Get current room state
      const { data: roomCheck } = await supabase
        .from("game_rooms")
        .select("winner_player_id, praise_dollar_value, win_condition, multi_game_progress")
        .eq("id", playerFullData.room_id)
        .single();

      if (!roomCheck) throw new Error("Room not found");

      // For multi-game mode, handle pattern-specific wins
      if (roomCheck.win_condition === 'multi_game') {
        const progress = (roomCheck.multi_game_progress as any) || { four_corners: false, straight: false, diagonal: false, coverall: false };
        const markedSet = new Set(markedCells);
        let patternWon: string | null = null;
        let prizeAmount = 0;
        const updateData: any = {};

        // Fetch current winner states
        const { data: winnerCheck } = await supabase
          .from("game_rooms")
          .select("four_corners_winner_id, straight_winner_id, diagonal_winner_id, winner_player_id")
          .eq("id", playerFullData.room_id)
          .single();

        if (!winnerCheck) throw new Error("Room not found");

        // Determine which pattern was completed
        if (!progress.four_corners && !winnerCheck.four_corners_winner_id) {
          const corners = [0, 4, 20, 24];
          if (corners.every(index => markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree)) {
            patternWon = 'four_corners';
            prizeAmount = 125;
            updateData.four_corners_winner_id = playerId;
          }
        }
        if (!patternWon && !progress.straight && !winnerCheck.straight_winner_id) {
          for (let i = 0; i < 5; i++) {
            let rowComplete = true;
            let colComplete = true;
            for (let j = 0; j < 5; j++) {
              const rowIndex = i * 5 + j;
              const colIndex = j * 5 + i;
              if (!markedSet.has(rowIndex) && !cardData[i][j].isFree) rowComplete = false;
              if (!markedSet.has(colIndex) && !cardData[j][i].isFree) colComplete = false;
            }
            if (rowComplete || colComplete) {
              patternWon = 'straight';
              prizeAmount = 100;
              updateData.straight_winner_id = playerId;
              break;
            }
          }
        }
        if (!patternWon && !progress.diagonal && !winnerCheck.diagonal_winner_id) {
          let diag1Complete = true;
          let diag2Complete = true;
          for (let i = 0; i < 5; i++) {
            const diag1Index = i * 5 + i;
            const diag2Index = i * 5 + (4 - i);
            if (!markedSet.has(diag1Index) && !cardData[i][i].isFree) diag1Complete = false;
            if (!markedSet.has(diag2Index) && !cardData[i][4 - i].isFree) diag2Complete = false;
          }
          if (diag1Complete || diag2Complete) {
            patternWon = 'diagonal';
            prizeAmount = 100;
            updateData.diagonal_winner_id = playerId;
          }
        }
        if (!patternWon && !progress.coverall && !winnerCheck.winner_player_id) {
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
          if (hasCoverall) {
            patternWon = 'coverall';
            prizeAmount = 350;
            updateData.winner_player_id = playerId;
            updateData.winner_announced_at = new Date().toISOString();
          }
        }

        if (patternWon) {
          // Update multi-game progress
          const updatedProgress = { ...progress, [patternWon as string]: true };
          updateData.multi_game_progress = updatedProgress;
          
          await supabase
            .from("game_rooms")
            .update(updateData)
            .eq("id", playerFullData.room_id);

          // Fetch latest player data to ensure accurate prize accumulation
          const { data: latestPlayerData } = await supabase
            .from("players")
            .select("score, total_praise_dollars")
            .eq("id", playerId)
            .single();

          // Award prize with fresh data
          await supabase
            .from("players")
            .update({ 
              score: (latestPlayerData?.score || 0) + 1,
              total_praise_dollars: (latestPlayerData?.total_praise_dollars || 0) + prizeAmount
            })
            .eq("id", playerId);

          playBingoSound();

          const patternNames: Record<string, string> = {
            four_corners: 'Four Corners',
            straight: 'Straight Line',
            diagonal: 'Diagonal',
            coverall: 'Coverall'
          };

          toast({
            title: `🎉 ${patternNames[patternWon]} BINGO! 🎉`,
            description: `Congratulations ${playerName}! You won $${prizeAmount} Praise Dollars!`,
          });
        } else {
          toast({
            title: "Pattern Already Claimed",
            description: "This pattern has already been won by another player!",
            variant: "destructive",
          });
        }
      } else {
        // Single-pattern game mode with prize splitting
        const winType = roomCheck.win_condition;
        
        // Check if this player already claimed
        const { data: existingWin } = await supabase
          .from("game_winners")
          .select("id")
          .eq("room_id", playerFullData.room_id)
          .eq("player_id", playerId)
          .eq("win_type", winType)
          .maybeSingle();

        if (existingWin) {
          toast({
            title: "Already Claimed",
            description: "You've already claimed this bingo!",
            variant: "destructive",
          });
          return;
        }

        // Check existing winners (within last 3 seconds for fair prize splitting)
        const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();
        const { data: recentWinners } = await supabase
          .from("game_winners")
          .select("player_id")
          .eq("room_id", playerFullData.room_id)
          .eq("win_type", winType)
          .gte("claimed_at", threeSecondsAgo);

        const totalPrize = roomCheck.praise_dollar_value || 100;
        const numberOfWinners = (recentWinners?.length || 0) + 1;
        const splitPrize = Math.floor(totalPrize / numberOfWinners);

        // Record this winner
        const { error: winnerError } = await supabase
          .from("game_winners")
          .insert({
            room_id: playerFullData.room_id,
            player_id: playerId,
            win_type: winType,
            prize_amount: splitPrize,
          });

        if (winnerError) throw winnerError;

        // Update the first winner in game_rooms table for display
        if (!roomCheck.winner_player_id) {
          await supabase
            .from("game_rooms")
            .update({
              winner_player_id: playerId,
              winner_announced_at: new Date().toISOString(),
            })
            .eq("id", playerFullData.room_id)
            .is("winner_player_id", null);
        }

        // Fetch latest player data to ensure accurate prize accumulation
        const { data: latestPlayerData } = await supabase
          .from("players")
          .select("score, total_praise_dollars")
          .eq("id", playerId)
          .single();

        // Update player score and prize with fresh data
        await supabase
          .from("players")
          .update({ 
            score: (latestPlayerData?.score || 0) + 1,
            total_praise_dollars: (latestPlayerData?.total_praise_dollars || 0) + splitPrize
          })
          .eq("id", playerId);

        playBingoSound();

        const prizeMessage = numberOfWinners > 1 
          ? `Prize split ${numberOfWinners} ways: $${splitPrize} each!`
          : `You won $${splitPrize} Praise Dollars!`;

        toast({
          title: "🎉 BINGO CLAIMED! 🎉",
          description: `Congratulations ${playerName}! ${prizeMessage}`,
        });
      }
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
      // Check each pattern individually - can win on any pattern
      const progress = multiGameProgress || { four_corners: false, straight: false, diagonal: false, coverall: false };
      
      // Check four corners (if not already won)
      if (!progress.four_corners) {
        const corners = [0, 4, 20, 24];
        const hasFourCorners = corners.every(index => markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree);
        if (hasFourCorners) return true;
      }
      
      // Check straight line (row or column) (if not already won)
      if (!progress.straight) {
        for (let i = 0; i < 5; i++) {
          let rowComplete = true;
          let colComplete = true;
          for (let j = 0; j < 5; j++) {
            const rowIndex = i * 5 + j;
            const colIndex = j * 5 + i;
            if (!markedSet.has(rowIndex) && !cardData[i][j].isFree) rowComplete = false;
            if (!markedSet.has(colIndex) && !cardData[j][i].isFree) colComplete = false;
          }
          if (rowComplete || colComplete) return true;
        }
      }
      
      // Check diagonal (if not already won)
      if (!progress.diagonal) {
        let diag1Complete = true;
        let diag2Complete = true;
        for (let i = 0; i < 5; i++) {
          const diag1Index = i * 5 + i;
          const diag2Index = i * 5 + (4 - i);
          if (!markedSet.has(diag1Index) && !cardData[i][i].isFree) diag1Complete = false;
          if (!markedSet.has(diag2Index) && !cardData[i][4 - i].isFree) diag2Complete = false;
        }
        if (diag1Complete || diag2Complete) return true;
      }
      
      // Check coverall (if not already won)
      if (!progress.coverall) {
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
        if (hasCoverall) return true;
      }
      
      return false;
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

  // Get pattern description
  const getPatternDescription = () => {
    switch (winCondition) {
      case "straight":
        return "Complete any row, column, or diagonal";
      case "four_corners":
        return "Mark all four corner squares";
      case "block_of_four":
        return "Mark any 2x2 block of squares";
      case "diagonal":
        return "Complete either diagonal line";
      case "coverall":
        return "Mark all squares on the card";
      case "multi_game":
        return "Progressive: Corners → Line → Diagonal → Coverall";
      default:
        return "Complete the winning pattern";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-background border-2 border-secondary">
      <CardHeader>
        <CardTitle className="font-heading text-card-foreground flex items-center justify-between">
          <span>{playerName}'s Card</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {getPatternDescription()}
        </p>
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
        <div className="grid grid-cols-5 gap-2 relative">
          {cardData.map((row: any[], rowIndex: number) =>
            row.map((cell: any, colIndex: number) => {
              const cellIndex = rowIndex * 5 + colIndex;
              const isMarked = markedCells.includes(cellIndex) || cell.isFree;
              const isPattern = isPartOfPattern(rowIndex, colIndex);

              return (
                <button
                  key={`${card.id}-${rowIndex}-${colIndex}`}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                  className={cn(
                    "aspect-square rounded-lg font-heading text-sm md:text-base font-bold transition-all duration-200",
                    "flex items-center justify-center border-2 relative",
                    cell.isFree
                      ? "bg-accent text-accent-foreground border-accent cursor-default"
                      : isMarked
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-95"
                      : isPattern && winCondition === "four_corners"
                      ? "bg-card text-card-foreground border-accent/60 hover:border-secondary hover:scale-105 ring-2 ring-accent/30"
                      : isPattern && winCondition === "diagonal"
                      ? "bg-card text-card-foreground border-accent/60 hover:border-secondary hover:scale-105 ring-2 ring-accent/30"
                      : "bg-card text-card-foreground border-border hover:border-secondary hover:scale-105"
                  )}
                  disabled={cell.isFree}
                >
                  {cell.value}
                  {/* Pattern indicator dot for specific patterns */}
                  {!isMarked && isPattern && (winCondition === "four_corners" || winCondition === "diagonal") && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  )}
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
