import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WIN_CONDITIONS, PROGRESSIVE_CONDITIONS, calculateProgressivePrize } from "@/lib/winConditions";

interface ResetGameDialogProps {
  onReset: (newWinCondition?: string, progressivePatterns?: string[]) => void;
  currentWinCondition: string;
}

export const ResetGameDialog = ({ onReset, currentWinCondition }: ResetGameDialogProps) => {
  const [selectedWinCondition, setSelectedWinCondition] = useState(currentWinCondition);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(['four_corners', 'straight', 'diagonal', 'coverall']);

  const handleReset = () => {
    if (selectedWinCondition === 'custom_progressive') {
      onReset('custom_progressive', selectedPatterns);
    } else {
      const newCondition = selectedWinCondition !== currentWinCondition ? selectedWinCondition : undefined;
      onReset(newCondition);
    }
    setIsOpen(false);
  };

  const togglePattern = (pattern: string) => {
    setSelectedPatterns(prev => {
      if (prev.includes(pattern)) {
        // Don't allow less than 2 patterns
        if (prev.length <= 2) return prev;
        return prev.filter(p => p !== pattern);
      } else {
        // Don't allow more than 4 patterns
        if (prev.length >= 4) return prev;
        return [...prev, pattern];
      }
    });
  };

  const progressivePrize = calculateProgressivePrize(selectedPatterns);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="border-accent text-accent hover:bg-accent/10"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Game
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-card-foreground">Reset Game?</AlertDialogTitle>
          <AlertDialogDescription className="text-card-foreground/80">
            This will clear all calls and marked cells for all players. Scores and players will be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="win-condition" className="text-card-foreground">
              Win Condition for Next Game
            </Label>
            <Select value={selectedWinCondition} onValueChange={setSelectedWinCondition}>
              <SelectTrigger id="win-condition" className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select win condition" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border max-h-[300px]">
                <SelectItem value="straight" className="text-foreground hover:bg-secondary">
                  Straight Line - $100
                </SelectItem>
                <SelectItem value="diagonal" className="text-foreground hover:bg-secondary">
                  Diagonal Only - $100
                </SelectItem>
                <SelectItem value="four_corners" className="text-foreground hover:bg-secondary">
                  Four Corners - $125
                </SelectItem>
                <SelectItem value="block_of_four" className="text-foreground hover:bg-secondary">
                  Block of Four - $150
                </SelectItem>
                <SelectItem value="any_four" className="text-foreground hover:bg-secondary">
                  Any Four Numbers - $350
                </SelectItem>
                <SelectItem value="letter_h" className="text-foreground hover:bg-secondary">
                  Letter H - $350
                </SelectItem>
                <SelectItem value="letter_e" className="text-foreground hover:bg-secondary">
                  Letter E - $350
                </SelectItem>
                <SelectItem value="letter_l" className="text-foreground hover:bg-secondary">
                  Letter L - $350
                </SelectItem>
                <SelectItem value="letter_i" className="text-foreground hover:bg-secondary">
                  Letter I - $350
                </SelectItem>
                <SelectItem value="outside_edge" className="text-foreground hover:bg-secondary">
                  Outside Edge - $350
                </SelectItem>
                <SelectItem value="coverall" className="text-foreground hover:bg-secondary">
                  Coverall (Full card) - $350
                </SelectItem>
                <SelectItem value="multi_game" className="text-foreground hover:bg-secondary">
                  Progressive (Fixed: Corners → Line → Diagonal → Coverall) - $675
                </SelectItem>
                <SelectItem value="custom_progressive" className="text-foreground hover:bg-secondary">
                  Custom Progressive (Pick 2-4 patterns)
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedWinCondition !== currentWinCondition && selectedWinCondition !== 'custom_progressive' && (
              <p className="text-sm text-accent">
                Win condition will change from <strong>{currentWinCondition.replace(/_/g, ' ')}</strong> to <strong>{selectedWinCondition.replace(/_/g, ' ')}</strong>
              </p>
            )}
          </div>

          {selectedWinCondition === 'custom_progressive' && (
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="text-card-foreground">
                Select 2-4 patterns for progressive game
              </Label>
              <p className="text-xs text-muted-foreground">
                Straight pays $150 in progressive, others pay their default prize.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PROGRESSIVE_CONDITIONS.map((pattern) => {
                  const config = WIN_CONDITIONS[pattern];
                  const prize = pattern === 'straight' ? 150 : config?.defaultPrize || 100;
                  return (
                    <div key={pattern} className="flex items-center space-x-2">
                      <Checkbox
                        id={pattern}
                        checked={selectedPatterns.includes(pattern)}
                        onCheckedChange={() => togglePattern(pattern)}
                        disabled={selectedPatterns.includes(pattern) && selectedPatterns.length <= 2}
                      />
                      <label 
                        htmlFor={pattern} 
                        className="text-sm text-card-foreground cursor-pointer"
                      >
                        {config?.label?.split('(')[0].trim() || pattern} (${prize})
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm font-semibold text-accent">
                Total Progressive Prize: ${progressivePrize}
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-background text-foreground border-border">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Reset Game
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
