import type { CollectionConfig } from 'payload'

export const LeaguesSeason: CollectionConfig = {
  slug: 'leaguesseason',
  fields: [
    {
      name: 'leagueId',
      type: 'number',
      required: true,
      index: true,
    },
    {
      name: 'seasons',
      type: 'json',
      required: false,
    },
  ],
}