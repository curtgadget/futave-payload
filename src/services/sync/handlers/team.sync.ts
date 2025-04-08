import { SportmonksTeam } from '../../sportmonks/client/types'
import { createTeamsEndpoint } from '../../sportmonks/client/endpoints/teams'
import { createStandingsEndpoint } from '../../sportmonks/client/endpoints/standings'
import { transformTeam } from '../../sportmonks/transformers/team.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export function createTeamSync(config: SportmonksConfig) {
  const teamsEndpoint = createTeamsEndpoint(config)
  const standingsEndpoint = createStandingsEndpoint(config)

  async function fetchTeamsWithStandings(): Promise<SportmonksTeam[]> {
    const teams = await teamsEndpoint.getByAllStats()
    const payload = await getPayload({ config: payloadConfig })

    payload.logger.info({
      msg: `Fetched ${teams.length} teams, now processing standings for active seasons`,
      teamsCount: teams.length,
    })

    // Process each team to add standings data
    const teamsWithStandings = await Promise.all(
      teams.map(async (team) => {
        // Create a standings map to store standings data by season ID
        const standingsMap: Record<number, unknown> = {}

        // Check if the team has active seasons
        if (team.activeseasons && Array.isArray(team.activeseasons)) {
          const activeSeasons = team.activeseasons

          payload.logger.info({
            msg: `Processing ${activeSeasons.length} active seasons for team ${team.name} (ID: ${team.id})`,
            teamId: team.id,
            teamName: team.name,
            activeSeasonsCount: activeSeasons.length,
          })

          // Process each active season to fetch standings
          await Promise.all(
            activeSeasons.map(async (activeSeason: any) => {
              try {
                if (activeSeason && activeSeason.id) {
                  const seasonId = activeSeason.id

                  payload.logger.info({
                    msg: `Fetching standings for season ${seasonId} for team ${team.name}`,
                    teamId: team.id,
                    seasonId: seasonId,
                  })

                  // Fetch standings for this season
                  const seasonStandings = await standingsEndpoint.getBySeasonId(seasonId)

                  // Store the standings in the map
                  standingsMap[seasonId] = seasonStandings

                  payload.logger.info({
                    msg: `Successfully fetched standings for season ${seasonId} for team ${team.name}`,
                    teamId: team.id,
                    seasonId: seasonId,
                  })
                }
              } catch (error) {
                payload.logger.error({
                  msg: `Failed to fetch standings for season ${activeSeason?.id} for team ${team.id}: ${error}`,
                  teamId: team.id,
                  seasonId: activeSeason?.id,
                  error,
                })
              }
            }),
          )
        } else {
          payload.logger.info({
            msg: `No active seasons found for team ${team.name} (ID: ${team.id})`,
            teamId: team.id,
            teamName: team.name,
          })
        }

        // Add the standings data to the team
        return {
          ...team,
          standings: standingsMap,
        }
      }),
    )

    payload.logger.info({
      msg: `Completed processing standings for all teams`,
      teamsCount: teams.length,
    })

    return teamsWithStandings
  }

  return createSyncService<SportmonksTeam>({
    collection: 'teams',
    fetchData: fetchTeamsWithStandings,
    transformData: transformTeam,
  })
}
