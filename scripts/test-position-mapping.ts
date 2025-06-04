import { getDetailedPositionName } from '../src/constants/team'

console.log('Testing CORRECTED position mappings:')

// Test James Tavernier (position_id: 25, detailed_position_id: 154)
console.log('James Tavernier (25, 154):', getDetailedPositionName(25, 154)) // Should be "Right Back"

// Test with basic position only
console.log('Basic defender (25, null):', getDetailedPositionName(25, null)) // Should be "Defender"

// Test goalkeeper
console.log('Goalkeeper (24, 24):', getDetailedPositionName(24, 24)) // Should be "Goalkeeper"

// Test midfielder
console.log('Central Midfielder (26, 153):', getDetailedPositionName(26, 153)) // Should be "Central Midfield"

// Test forward
console.log('Centre Forward (27, 151):', getDetailedPositionName(27, 151)) // Should be "Centre Forward"

console.log('\nPositions for actual players from database:')
const testPlayers = [
  { name: 'James Tavernier', position_id: 25, detailed_position_id: 154 }, // Right Back
  { name: 'Kasper Schmeichel', position_id: 24, detailed_position_id: 24 }, // Goalkeeper  
  { name: 'Steven Davis', position_id: 26, detailed_position_id: 153 }, // Central Midfield
  { name: 'Steven Fletcher', position_id: 27, detailed_position_id: 151 }, // Centre Forward
  { name: 'Winston Reid', position_id: 25, detailed_position_id: 148 }, // Centre Back
  { name: 'Scott Sinclair', position_id: 26, detailed_position_id: 152 }, // Left Wing
  { name: 'Glenn Whelan', position_id: 26, detailed_position_id: 149 }, // Defensive Midfield
]

testPlayers.forEach(player => {
  const position = getDetailedPositionName(player.position_id, player.detailed_position_id)
  console.log(`${player.name}: ${position}`)
})