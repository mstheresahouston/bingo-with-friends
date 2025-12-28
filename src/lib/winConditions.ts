// Win condition definitions and utilities

export interface WinConditionConfig {
  label: string;
  description: string;
  defaultPrize: number;
  progressivePrize?: number; // Prize when used in progressive mode
  checkPattern: (markedCells: Set<number>, cardData: any[][]) => boolean;
  getCells: () => number[]; // Get cells that are part of this pattern
}

// Check if a cell is free
const isFreeCell = (cardData: any[][], row: number, col: number) => cardData[row][col].isFree;

// Helper to check if cells are marked
const areCellsMarked = (cells: number[], markedSet: Set<number>, cardData: any[][]) => {
  return cells.every(cellIndex => {
    const row = Math.floor(cellIndex / 5);
    const col = cellIndex % 5;
    return markedSet.has(cellIndex) || isFreeCell(cardData, row, col);
  });
};

export const WIN_CONDITIONS: Record<string, WinConditionConfig> = {
  straight: {
    label: "Straight Line (Any Direction)",
    description: "Complete any row, column, or diagonal",
    defaultPrize: 100,
    progressivePrize: 150,
    checkPattern: (markedSet, cardData) => {
      // Check rows
      for (let i = 0; i < 5; i++) {
        const rowCells = Array.from({ length: 5 }, (_, j) => i * 5 + j);
        if (areCellsMarked(rowCells, markedSet, cardData)) return true;
      }
      // Check columns
      for (let j = 0; j < 5; j++) {
        const colCells = Array.from({ length: 5 }, (_, i) => i * 5 + j);
        if (areCellsMarked(colCells, markedSet, cardData)) return true;
      }
      // Check diagonals
      const diag1 = [0, 6, 12, 18, 24];
      const diag2 = [4, 8, 12, 16, 20];
      if (areCellsMarked(diag1, markedSet, cardData)) return true;
      if (areCellsMarked(diag2, markedSet, cardData)) return true;
      return false;
    },
    getCells: () => Array.from({ length: 25 }, (_, i) => i),
  },
  diagonal: {
    label: "Diagonal Only",
    description: "Complete either diagonal line",
    defaultPrize: 100,
    checkPattern: (markedSet, cardData) => {
      const diag1 = [0, 6, 12, 18, 24];
      const diag2 = [4, 8, 12, 16, 20];
      return areCellsMarked(diag1, markedSet, cardData) || areCellsMarked(diag2, markedSet, cardData);
    },
    getCells: () => [0, 4, 6, 8, 12, 16, 18, 20, 24],
  },
  four_corners: {
    label: "Four Corners",
    description: "Mark all four corner squares",
    defaultPrize: 125,
    checkPattern: (markedSet, cardData) => {
      const corners = [0, 4, 20, 24];
      return areCellsMarked(corners, markedSet, cardData);
    },
    getCells: () => [0, 4, 20, 24],
  },
  block_of_four: {
    label: "Block of Four",
    description: "Mark any 2x2 block of squares",
    defaultPrize: 150,
    checkPattern: (markedSet, cardData) => {
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const block = [i * 5 + j, i * 5 + j + 1, (i + 1) * 5 + j, (i + 1) * 5 + j + 1];
          if (areCellsMarked(block, markedSet, cardData)) return true;
        }
      }
      return false;
    },
    getCells: () => Array.from({ length: 25 }, (_, i) => i),
  },
  any_four: {
    label: "Any Four Numbers",
    description: "Mark any four squares to win",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      // Count marked cells (including free space)
      let count = 0;
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const cellIndex = i * 5 + j;
          if (markedSet.has(cellIndex) || isFreeCell(cardData, i, j)) {
            count++;
          }
        }
      }
      return count >= 4;
    },
    getCells: () => Array.from({ length: 25 }, (_, i) => i),
  },
  letter_h: {
    label: "Letter H",
    description: "B column + O column + middle row (row 3)",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      // B column (column 0): cells 0, 5, 10, 15, 20
      // O column (column 4): cells 4, 9, 14, 19, 24
      // Middle row (row 2): cells 10, 11, 12, 13, 14
      const bColumn = [0, 5, 10, 15, 20];
      const oColumn = [4, 9, 14, 19, 24];
      const middleRow = [10, 11, 12, 13, 14];
      const hCells = [...new Set([...bColumn, ...oColumn, ...middleRow])];
      return areCellsMarked(hCells, markedSet, cardData);
    },
    getCells: () => {
      const bColumn = [0, 5, 10, 15, 20];
      const oColumn = [4, 9, 14, 19, 24];
      const middleRow = [10, 11, 12, 13, 14];
      return [...new Set([...bColumn, ...oColumn, ...middleRow])];
    },
  },
  letter_e: {
    label: "Letter E",
    description: "Top row + bottom row + middle row + B column",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      // Top row (row 0): cells 0, 1, 2, 3, 4
      // Bottom row (row 4): cells 20, 21, 22, 23, 24
      // Middle row (row 2): cells 10, 11, 12, 13, 14
      // B column (column 0): cells 0, 5, 10, 15, 20
      const topRow = [0, 1, 2, 3, 4];
      const bottomRow = [20, 21, 22, 23, 24];
      const middleRow = [10, 11, 12, 13, 14];
      const bColumn = [0, 5, 10, 15, 20];
      const eCells = [...new Set([...topRow, ...bottomRow, ...middleRow, ...bColumn])];
      return areCellsMarked(eCells, markedSet, cardData);
    },
    getCells: () => {
      const topRow = [0, 1, 2, 3, 4];
      const bottomRow = [20, 21, 22, 23, 24];
      const middleRow = [10, 11, 12, 13, 14];
      const bColumn = [0, 5, 10, 15, 20];
      return [...new Set([...topRow, ...bottomRow, ...middleRow, ...bColumn])];
    },
  },
  letter_l: {
    label: "Letter L",
    description: "B column + bottom row",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      // B column (column 0): cells 0, 5, 10, 15, 20
      // Bottom row (row 4): cells 20, 21, 22, 23, 24
      const bColumn = [0, 5, 10, 15, 20];
      const bottomRow = [20, 21, 22, 23, 24];
      const lCells = [...new Set([...bColumn, ...bottomRow])];
      return areCellsMarked(lCells, markedSet, cardData);
    },
    getCells: () => {
      const bColumn = [0, 5, 10, 15, 20];
      const bottomRow = [20, 21, 22, 23, 24];
      return [...new Set([...bColumn, ...bottomRow])];
    },
  },
  letter_i: {
    label: "Letter I",
    description: "Top row + bottom row + middle column (N)",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      // Top row (row 0): cells 0, 1, 2, 3, 4
      // Bottom row (row 4): cells 20, 21, 22, 23, 24
      // N column (column 2): cells 2, 7, 12, 17, 22
      const topRow = [0, 1, 2, 3, 4];
      const bottomRow = [20, 21, 22, 23, 24];
      const nColumn = [2, 7, 12, 17, 22];
      const iCells = [...new Set([...topRow, ...bottomRow, ...nColumn])];
      return areCellsMarked(iCells, markedSet, cardData);
    },
    getCells: () => {
      const topRow = [0, 1, 2, 3, 4];
      const bottomRow = [20, 21, 22, 23, 24];
      const nColumn = [2, 7, 12, 17, 22];
      return [...new Set([...topRow, ...bottomRow, ...nColumn])];
    },
  },
  outside_edge: {
    label: "Outside Edge",
    description: "Top row + bottom row + B column + O column",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      // Top row (row 0): cells 0, 1, 2, 3, 4
      // Bottom row (row 4): cells 20, 21, 22, 23, 24
      // B column (column 0): cells 0, 5, 10, 15, 20
      // O column (column 4): cells 4, 9, 14, 19, 24
      const topRow = [0, 1, 2, 3, 4];
      const bottomRow = [20, 21, 22, 23, 24];
      const bColumn = [0, 5, 10, 15, 20];
      const oColumn = [4, 9, 14, 19, 24];
      const edgeCells = [...new Set([...topRow, ...bottomRow, ...bColumn, ...oColumn])];
      return areCellsMarked(edgeCells, markedSet, cardData);
    },
    getCells: () => {
      const topRow = [0, 1, 2, 3, 4];
      const bottomRow = [20, 21, 22, 23, 24];
      const bColumn = [0, 5, 10, 15, 20];
      const oColumn = [4, 9, 14, 19, 24];
      return [...new Set([...topRow, ...bottomRow, ...bColumn, ...oColumn])];
    },
  },
  coverall: {
    label: "Cover All (Full Card)",
    description: "Mark all squares on the card",
    defaultPrize: 350,
    checkPattern: (markedSet, cardData) => {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const cellIndex = i * 5 + j;
          if (!markedSet.has(cellIndex) && !isFreeCell(cardData, i, j)) {
            return false;
          }
        }
      }
      return true;
    },
    getCells: () => Array.from({ length: 25 }, (_, i) => i),
  },
};

// Progressive-eligible win conditions (can be combined by host)
export const PROGRESSIVE_CONDITIONS = [
  'straight',
  'four_corners', 
  'diagonal',
  'coverall',
  'any_four',
  'letter_h',
  'letter_e',
  'letter_l',
  'letter_i',
  'outside_edge',
  'block_of_four',
];

// Calculate total prize for a progressive game
export const calculateProgressivePrize = (selectedPatterns: string[]): number => {
  return selectedPatterns.reduce((total, pattern) => {
    const config = WIN_CONDITIONS[pattern];
    if (!config) return total;
    // Use progressivePrize if available (for straight), otherwise defaultPrize
    const prize = pattern === 'straight' ? 150 : config.defaultPrize;
    return total + prize;
  }, 0);
};

// Get default prize for a win condition
export const getDefaultPrize = (winCondition: string): number => {
  if (winCondition === 'multi_game') {
    // Default multi_game prize (old behavior)
    return 675;
  }
  return WIN_CONDITIONS[winCondition]?.defaultPrize || 100;
};
