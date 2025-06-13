import type { CollectionConfig } from 'payload'

export const LeaguesStandings: CollectionConfig = {
  slug: 'leaguesstandings',
  fields: [
    {
      name: 'leagueId',
      type: 'number',
      required: true,
      index: true,
    },
    {
      name: 'standings',
      type: 'json',
      required: false,
    },
  ],
}