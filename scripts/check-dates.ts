import { ONE_DAY_MS, NINETY_DAYS_MS } from '../src/constants/time'

console.log('Date Diagnostics:')
console.log('=================')
console.log('Current date (new Date()):', new Date().toISOString())
console.log('Current timestamp:', Date.now())
console.log('System timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone)

console.log('\nDate calculations used in sync:')
const now = Date.now()
const yesterday = new Date(now - ONE_DAY_MS)
const ninetyDaysAhead = new Date(now + NINETY_DAYS_MS)

console.log('Yesterday:', yesterday.toISOString().split('T')[0])
console.log('90 days ahead:', ninetyDaysAhead.toISOString().split('T')[0])

console.log('\nRecommended sync range (30 days each way):')
const thirtyDaysAgo = new Date(now - 30 * ONE_DAY_MS)
const thirtyDaysAhead = new Date(now + 30 * ONE_DAY_MS)
console.log('30 days ago:', thirtyDaysAgo.toISOString().split('T')[0])
console.log('30 days ahead:', thirtyDaysAhead.toISOString().split('T')[0])

console.log('\nTypical football season dates:')
console.log('If current month is June-July: Off-season (few matches)')
console.log('If current month is August-May: Regular season (many matches)')

// Check if we're in off-season
const currentMonth = new Date().getMonth() // 0-11
const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
console.log(`\nCurrent month: ${monthName} (${currentMonth})`)

if (currentMonth === 5 || currentMonth === 6) { // June or July
  console.log('⚠️  WARNING: Currently in off-season. Limited match data available.')
  console.log('Consider syncing from previous season or wait for new season to start.')
}