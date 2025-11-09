import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BingoCard {
  id: string;
  player_id: string;
  card_data: any[][];
  marked_cells: number[];
}

function checkBingo(card: BingoCard, winCondition: string): boolean {
  const markedSet = new Set(card.marked_cells);
  const cardData = card.card_data;

  if (winCondition === "coverall") {
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
    const corners = [0, 4, 20, 24];
    return corners.every(index => markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree);
  }

  if (winCondition === "block_of_four") {
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
    // For multi-game, this is not used
    return false;
  }

  // Default: straight line (rows, columns, diagonals)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { roomId, callValue } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get game room info
    const { data: room } = await supabaseClient
      .from('game_rooms')
      .select('win_condition')
      .eq('id', roomId)
      .single()

    if (!room) {
      throw new Error('Room not found')
    }

    // Get all AI players in the room (those with names ending in "Bot")
    const { data: aiPlayers } = await supabaseClient
      .from('players')
      .select('id, player_name, score, total_praise_dollars')
      .eq('room_id', roomId)
      .like('player_name', '%Bot')

    if (!aiPlayers || aiPlayers.length === 0) {
      return new Response(JSON.stringify({ message: 'No AI players found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Process each AI player
    for (const aiPlayer of aiPlayers) {
      const { data: cards } = await supabaseClient
        .from('bingo_cards')
        .select('*')
        .eq('player_id', aiPlayer.id)

      if (!cards || cards.length === 0) continue

      for (const card of cards) {
        const cardData = card.card_data as any[][]
        let markedCells = card.marked_cells || []

        // Check if the called value is on this card and mark it
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const cell = cardData[i][j]
            const cellIndex = i * 5 + j
            
            if (cell.value === callValue && !cell.isFree && !markedCells.includes(cellIndex)) {
              markedCells.push(cellIndex)
            }
          }
        }

        // Update the card with marked cells
        await supabaseClient
          .from('bingo_cards')
          .update({ marked_cells: markedCells })
          .eq('id', card.id)

        // Check for BINGO or multi-game progress
        const updatedCard = { ...card, marked_cells: markedCells }
        
        if (room.win_condition === 'multi_game') {
          // Check all four patterns and award prizes for each
          const { data: roomCheck } = await supabaseClient
            .from('game_rooms')
            .select('multi_game_progress, praise_dollar_value, four_corners_winner_id, straight_winner_id, diagonal_winner_id, winner_player_id')
            .eq('id', roomId)
            .single()
          
          if (!roomCheck) continue
          
          const progress = roomCheck.multi_game_progress || { four_corners: false, straight: false, diagonal: false, coverall: false }
          let updatedProgress = { ...progress }
          let prizesWon = 0
          const markedSet = new Set(markedCells)
          const updateData: any = {}
          
          // Check four corners (if not already won)
          if (!progress.four_corners && !roomCheck.four_corners_winner_id) {
            const corners = [0, 4, 20, 24]
            const hasFourCorners = corners.every(index => markedSet.has(index) || cardData[Math.floor(index / 5)][index % 5].isFree)
            if (hasFourCorners) {
              console.log(`${aiPlayer.player_name} completed Four Corners!`)
              updatedProgress.four_corners = true
              updateData.four_corners_winner_id = aiPlayer.id
              prizesWon += 125
            }
          }
          
          // Check straight line (if not already won)
          if (!progress.straight && !roomCheck.straight_winner_id) {
            let hasStraightLine = false
            for (let i = 0; i < 5; i++) {
              let rowComplete = true
              let colComplete = true
              for (let j = 0; j < 5; j++) {
                const rowIndex = i * 5 + j
                const colIndex = j * 5 + i
                if (!markedSet.has(rowIndex) && !cardData[i][j].isFree) rowComplete = false
                if (!markedSet.has(colIndex) && !cardData[j][i].isFree) colComplete = false
              }
              if (rowComplete || colComplete) {
                hasStraightLine = true
                break
              }
            }
            if (hasStraightLine) {
              console.log(`${aiPlayer.player_name} completed Straight Line!`)
              updatedProgress.straight = true
              updateData.straight_winner_id = aiPlayer.id
              prizesWon += 100
            }
          }
          
          // Check diagonal (if not already won)
          if (!progress.diagonal && !roomCheck.diagonal_winner_id) {
            let diag1Complete = true
            let diag2Complete = true
            for (let i = 0; i < 5; i++) {
              const diag1Index = i * 5 + i
              const diag2Index = i * 5 + (4 - i)
              if (!markedSet.has(diag1Index) && !cardData[i][i].isFree) diag1Complete = false
              if (!markedSet.has(diag2Index) && !cardData[i][4 - i].isFree) diag2Complete = false
            }
            if (diag1Complete || diag2Complete) {
              console.log(`${aiPlayer.player_name} completed Diagonal!`)
              updatedProgress.diagonal = true
              updateData.diagonal_winner_id = aiPlayer.id
              prizesWon += 100
            }
          }
          
          // Check coverall (if not already won)
          if (!progress.coverall && !roomCheck.winner_player_id) {
            let hasCoverall = true
            for (let i = 0; i < 5; i++) {
              for (let j = 0; j < 5; j++) {
                const cellIndex = i * 5 + j
                if (!markedSet.has(cellIndex) && !cardData[i][j].isFree) {
                  hasCoverall = false
                  break
                }
              }
              if (!hasCoverall) break
            }
            if (hasCoverall) {
              console.log(`${aiPlayer.player_name} completed Coverall!`)
              updatedProgress.coverall = true
              updateData.winner_player_id = aiPlayer.id
              updateData.winner_announced_at = new Date().toISOString()
              prizesWon += 350
            }
          }
          
          // Update progress if any new patterns were completed
          if (prizesWon > 0) {
            updateData.multi_game_progress = updatedProgress
            await supabaseClient
              .from('game_rooms')
              .update(updateData)
              .eq('id', roomId)
            
            // Award prizes for completed patterns
            await supabaseClient
              .from('players')
              .update({ 
                score: aiPlayer.score + 1,
                total_praise_dollars: (aiPlayer.total_praise_dollars || 0) + prizesWon
              })
              .eq('id', aiPlayer.id)
            
            console.log(`${aiPlayer.player_name} won $${prizesWon} Praise Dollars!`)
          }
        } else {
          // Regular single-pattern bingo
          if (checkBingo(updatedCard as BingoCard, room.win_condition)) {
            console.log(`${aiPlayer.player_name} got BINGO!`)
            
            // Check if there's already a winner
            const { data: roomCheck } = await supabaseClient
              .from('game_rooms')
              .select('winner_player_id, praise_dollar_value')
              .eq('id', roomId)
              .single()
            
            if (roomCheck && !roomCheck.winner_player_id) {
              // Set this AI as the winner
              await supabaseClient
                .from('game_rooms')
                .update({
                  winner_player_id: aiPlayer.id,
                  winner_announced_at: new Date().toISOString(),
                })
                .eq('id', roomId)
              
              const splitPrize = roomCheck.praise_dollar_value || 100
              
              // Update AI player score and prize
              await supabaseClient
                .from('players')
                .update({ 
                  score: aiPlayer.score + 1,
                  total_praise_dollars: splitPrize
                })
                .eq('id', aiPlayer.id)
              
              console.log(`${aiPlayer.player_name} won the game and received $${splitPrize} Praise Dollars!`)
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing AI players:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
