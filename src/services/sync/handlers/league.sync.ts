import { SportmonksLeague } from '../../sportmonks/client/types'
import { createLeaguesEndpoint } from '../../sportmonks/client/endpoints/leagues'
import { createStandingsEndpoint } from '../../sportmonks/client/endpoints/standings'
import { transformLeague } from '../../sportmonks/transformers/league.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'
import { getPayload } from 'payload'
import payloadConfig from '@/payload.config'

export function createLeagueSync(config: SportmonksConfig) {
  const leaguesEndpoint = createLeaguesEndpoint(config)
  const standingsEndpoint = createStandingsEndpoint(config)

  async function fetchLeaguesWithStandings(): Promise<SportmonksLeague[]> {
    const leagues = await leaguesEndpoint.getAll()
    const payload = await getPayload({ config: payloadConfig })

    payload.logger.info({
      msg: `Fetched ${leagues.length} leagues, now processing standings for seasons`,
      leaguesCount: leagues.length,
    })

    // Process each league to add standings data
    const leaguesWithStandings = await Promise.all(
      leagues.map(async (league) => {
        // Create a standings map to store standings data by season ID
        const standingsMap: Record<number, unknown> = {}

        // Check if the league has seasons
        if (league.seasons && Array.isArray(league.seasons)) {
          const seasons = league.seasons

          payload.logger.info({
            msg: `Processing ${seasons.length} seasons for league ${league.name} (ID: ${league.id})`,
            leagueId: league.id,
            leagueName: league.name,
            seasonsCount: seasons.length,
          })

          // Process each season to fetch standings
          await Promise.all(
            seasons.map(async (season: any) => {
              try {
                if (season && season.id) {
                  const seasonId = season.id

                  payload.logger.info({
                    msg: `Fetching standings for season ${seasonId} for league ${league.name}`,
                    leagueId: league.id,
                    seasonId: seasonId,
                  })

                  // Fetch standings for this season
                  const seasonStandings = await standingsEndpoint.getBySeasonId(seasonId)

                  // Store the standings in the map
                  standingsMap[seasonId] = seasonStandings

                  payload.logger.info({
                    msg: `Successfully fetched standings for season ${seasonId} for league ${league.name}`,
                    leagueId: league.id,
                    seasonId: seasonId,
                  })
                }
              } catch (error) {
                payload.logger.error({
                  msg: `Failed to fetch standings for season ${season?.id} for league ${league.id}: ${error}`,
                  leagueId: league.id,
                  seasonId: season?.id,
                  error,
                })
              }
            }),
          )
        } else {
          payload.logger.info({
            msg: `No seasons found for league ${league.name} (ID: ${league.id})`,
            leagueId: league.id,
            leagueName: league.name,
          })
        }

        // Add the standings data to the league
        return {
          ...league,
          standings: standingsMap,
        }
      }),
    )

    payload.logger.info({
      msg: `Completed processing standings for all leagues`,
      leaguesCount: leagues.length,
    })

    return leaguesWithStandings
  }

  return createSyncService<SportmonksLeague>({
    collection: 'leagues',
    fetchData: fetchLeaguesWithStandings,
    transformData: transformLeague,
  })
}
