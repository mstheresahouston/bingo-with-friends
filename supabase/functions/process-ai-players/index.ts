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
      .select('id, player_name, score')
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

        // Check for BINGO
        const updatedCard = { ...card, marked_cells: markedCells }
        if (checkBingo(updatedCard as BingoCard, room.win_condition)) {
          // Update player score
          await supabaseClient
            .from('players')
            .update({ score: aiPlayer.score + 1 })
            .eq('id', aiPlayer.id)

          console.log(`${aiPlayer.player_name} got BINGO!`)
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
