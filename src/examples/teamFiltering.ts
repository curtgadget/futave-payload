import { createTeamsEndpoint } from '../services/sportmonks/client/endpoints/teams'
import { createFilterString, combineFilterStrings } from '../services/sportmonks/client/utils'
import { TeamStatisticTypeIds } from '../constants/team'

async function exampleTeamFiltering() {
  // Initialize the teams endpoint
  const teamsEndpoint = createTeamsEndpoint({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
  })

  try {
    // Example 1: Using the predefined method for team wins, draws, and losses
    const teamWDL = await teamsEndpoint.getByWinsDrawsLosses()
    console.log(`Found ${teamWDL.length} teams with wins, draws, and losses statistics`)

    // Example 2: Using the predefined method for goal statistics
    const teamGoals = await teamsEndpoint.getByGoalStats()
    console.log(`Found ${teamGoals.length} teams with goal statistics`)

    // Example 3: Using the predefined method for card statistics
    const teamCards = await teamsEndpoint.getByCardStats()
    console.log(`Found ${teamCards.length} teams with card statistics`)

    // Example 4: Using the general filter method with specific statistic types
    const customFilter = createFilterString('teamStatisticDetailTypes', [
      TeamStatisticTypeIds.CLEAN_SHEETS,
      TeamStatisticTypeIds.WINS,
    ])
    const teamsWithFilter = await teamsEndpoint.getWithFilter(customFilter)
    console.log(`Found ${teamsWithFilter.length} teams with clean sheets and wins statistics`)

    // Example 5: Combining statistic filters with other filters
    const statsFilter = createFilterString('teamStatisticDetailTypes', [
      TeamStatisticTypeIds.GOALS_FOR,
      TeamStatisticTypeIds.GOALS_AGAINST,
    ])
    const leagueFilter = createFilterString('league_id', [1])
    const combinedFilter = combineFilterStrings([statsFilter, leagueFilter])

    const teamsWithCombinedFilter = await teamsEndpoint.getWithFilter(combinedFilter)
    console.log(`Found ${teamsWithCombinedFilter.length} teams in league 1 with goal statistics`)

    // Example 6: Get all stats at once
    const allStatsTeams = await teamsEndpoint.getByAllStats()
    console.log(`Found ${allStatsTeams.length} teams with all statistics`)
  } catch (error) {
    console.error('Error fetching teams with filters:', error)
  }
}

// Call the example function
exampleTeamFiltering().catch(console.error)
