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

interface ResetGameDialogProps {
  onReset: (newWinCondition?: string) => void;
  currentWinCondition: string;
}

export const ResetGameDialog = ({ onReset, currentWinCondition }: ResetGameDialogProps) => {
  const [selectedWinCondition, setSelectedWinCondition] = useState(currentWinCondition);
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = () => {
    const newCondition = selectedWinCondition !== currentWinCondition ? selectedWinCondition : undefined;
    onReset(newCondition);
    setIsOpen(false);
  };

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
      <AlertDialogContent className="bg-card border-border">
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
              <SelectContent className="bg-background border-border">
                <SelectItem value="straight" className="text-foreground hover:bg-secondary">
                  Straight Line (Any row or column)
                </SelectItem>
                <SelectItem value="diagonal" className="text-foreground hover:bg-secondary">
                  Diagonal (Any diagonal line)
                </SelectItem>
                <SelectItem value="four_corners" className="text-foreground hover:bg-secondary">
                  Four Corners
                </SelectItem>
                <SelectItem value="block_of_four" className="text-foreground hover:bg-secondary">
                  Block of Four (Any 2x2 block)
                </SelectItem>
                <SelectItem value="coverall" className="text-foreground hover:bg-secondary">
                  Coverall (Full card)
                </SelectItem>
                <SelectItem value="multi_game" className="text-foreground hover:bg-secondary">
                  Progressive (All patterns)
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedWinCondition !== currentWinCondition && (
              <p className="text-sm text-accent">
                Win condition will change from <strong>{currentWinCondition.replace('_', ' ')}</strong> to <strong>{selectedWinCondition.replace('_', ' ')}</strong>
              </p>
            )}
          </div>
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
