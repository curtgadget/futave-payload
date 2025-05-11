import { syncMatchesBackfillHandler } from '../src/tasks/handlers/syncMatches'

async function main() {
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  const startDate =
    process.env.BACKFILL_START_DATE ||
    new Date(Date.now() - ONE_YEAR_MS).toISOString().split('T')[0]
  const endDate = process.env.BACKFILL_END_DATE || new Date().toISOString().split('T')[0]

  console.log(`Seeding legacy matches from ${startDate} to ${endDate}...`)

  try {
    const result = await syncMatchesBackfillHandler({
      input: { startDate, endDate, backfill: true },
    })
    console.log('Sync result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error during legacy match sync:', error)
    process.exit(1)
  }
}

main()
