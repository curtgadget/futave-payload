import type { CollectionConfig } from 'payload'

export const Teams: CollectionConfig = {
  slug: 'teams',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'logo_path',
      type: 'text',
    },
    {
      name: 'country_id',
      type: 'number',
      required: false,
    },
    {
      name: 'coaches',
      type: 'json',
      required: false,
    },
    {
      name: 'players',
      type: 'json',
      required: false,
    },
    {
      name: 'latest',
      type: 'json',
      required: false,
    },
    {
      name: 'upcoming',
      type: 'json',
      required: false,
    },
    {
      name: 'seasons',
      type: 'json',
      required: false,
    },
    {
      name: 'activeseasons',
      type: 'json',
      required: false,
    },
    {
      name: 'statistics',
      type: 'json',
      required: false,
    },
    {
      name: 'trophies',
      type: 'json',
      required: false,
    },
    {
      name: 'socials',
      type: 'json',
      required: false,
    },
    {
      name: 'rankings',
      type: 'json',
      required: false,
    },
    {
      name: 'standings',
      type: 'json',
      required: false,
    },
    {
      name: 'season_map',
      type: 'json',
      required: false,
    },
  ],
}
