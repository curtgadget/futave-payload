// Debug script to test goal contributions calculation
const playerStats = [
  { player_id: '28581', name: 'Cyriel Dessers', goals: 13, assists: 2 },
  { player_id: '25709', name: 'Václav Černý', goals: 11, assists: 2 },
  { player_id: '37562510', name: 'Igmane Hamza', goals: 11, assists: 1 },
  { player_id: '758', name: 'James Tavernier', goals: 4, assists: 7 },
  { player_id: '2158212', name: 'Nicolas Raskin', goals: 2, assists: 7 },
  { player_id: '5270463', name: 'Danilo Pereira da Silva', goals: 5, assists: 4 },
]

const goalContributions = playerStats
  .filter(
    (p) =>
      (typeof p.goals === 'number' && p.goals > 0) ||
      (typeof p.assists === 'number' && p.assists > 0),
  )
  .map((player) => {
    const goals = player.goals || 0
    const assists = player.assists || 0
    return {
      player_id: player.player_id,
      name: player.name,
      value: goals + assists,
    }
  })
  .sort((a, b) => b.value - a.value)
  .slice(0, 3)

console.log('Top goal contributions:', JSON.stringify(goalContributions, null, 2))
