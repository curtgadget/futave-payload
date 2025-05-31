import type { CollectionConfig } from 'payload'

export const Leagues: CollectionConfig = {
  slug: 'leagues',
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
      required: true,
    },
    {
      name: 'league_type',
      type: 'text',
      required: true,
    },
    {
      name: 'stages',
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
      name: 'inplay',
      type: 'json',
      required: false,
    },
    {
      name: 'today',
      type: 'json',
      required: false,
    },
    {
      name: 'currentseason',
      type: 'json',
      required: false,
    },
    {
      name: 'seasons',
      type: 'json',
      required: false,
    },
    {
      name: 'standings',
      type: 'json',
      required: false,
    },
  ],
}
