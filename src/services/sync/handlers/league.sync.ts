import { SportmonksLeague } from '../../sportmonks/client/types'
import { createLeaguesEndpoint } from '../../sportmonks/client/endpoints/leagues'
import { createStandingsEndpoint } from '../../sportmonks/client/endpoints/standings'
import { transformLeague, transformLeagueSeason, transformLeagueStandings } from '../../sportmonks/transformers/league.transformer'
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

  async function sync() {
    const payload = await getPayload({ config: payloadConfig })
    
    try {
      payload.logger.info({
        msg: 'Starting leagues sync with data splitting',
      })

      // Fetch leagues with standings data
      const leaguesWithStandings = await fetchLeaguesWithStandings()
      
      payload.logger.info({
        msg: `Processing ${leaguesWithStandings.length} leagues and splitting data`,
        leaguesCount: leaguesWithStandings.length,
      })

      // Process each league to save to three collections
      for (const league of leaguesWithStandings) {
        try {
          const leagueId = league.id

          // Transform data for each collection
          const transformedLeague = transformLeague(league)
          const transformedSeason = transformLeagueSeason(league)
          const transformedStandings = transformLeagueStandings(league)

          // Save to leagues collection
          const existingLeague = await payload.find({
            collection: 'leagues',
            where: { id: { equals: leagueId } },
            limit: 1,
          })

          if (existingLeague.docs.length > 0) {
            await payload.update({
              collection: 'leagues',
              where: { id: { equals: leagueId } },
              data: transformedLeague,
            })
          } else {
            await payload.create({
              collection: 'leagues',
              data: transformedLeague,
            })
          }

          // Save to leaguesseason collection
          const existingSeason = await payload.find({
            collection: 'leaguesseason',
            where: { leagueId: { equals: leagueId } },
            limit: 1,
          })

          if (existingSeason.docs.length > 0) {
            await payload.update({
              collection: 'leaguesseason',
              where: { leagueId: { equals: leagueId } },
              data: transformedSeason,
            })
          } else {
            await payload.create({
              collection: 'leaguesseason',
              data: transformedSeason,
            })
          }

          // Save to leaguesstandings collection
          const existingStandings = await payload.find({
            collection: 'leaguesstandings',
            where: { leagueId: { equals: leagueId } },
            limit: 1,
          })

          if (existingStandings.docs.length > 0) {
            await payload.update({
              collection: 'leaguesstandings',
              where: { leagueId: { equals: leagueId } },
              data: transformedStandings,
            })
          } else {
            await payload.create({
              collection: 'leaguesstandings',
              data: transformedStandings,
            })
          }

          payload.logger.info({
            msg: `Successfully processed league ${league.name} (ID: ${leagueId})`,
            leagueId,
            leagueName: league.name,
          })

        } catch (error) {
          payload.logger.error({
            msg: `Failed to process league ${league.id}: ${error}`,
            leagueId: league.id,
            error,
          })
        }
      }

      payload.logger.info({
        msg: 'Leagues sync with data splitting completed successfully',
        leaguesCount: leaguesWithStandings.length,
      })

      return {
        success: true,
        message: `Successfully synced ${leaguesWithStandings.length} leagues`,
        stats: {
          created: 0, // TODO: track stats properly
          updated: 0,
          failed: 0,
          errors: [],
          startTime: Date.now(),
          endTime: Date.now(),
        },
      }

    } catch (error) {
      const message = `Failed to sync leagues: ${error}`
      payload.logger.error({
        msg: message,
        error,
      })

      return {
        success: false,
        message,
        stats: {
          created: 0,
          updated: 0,
          failed: 0,
          errors: [],
          startTime: Date.now(),
          endTime: Date.now(),
        },
      }
    }
  }

  return { sync }
}
