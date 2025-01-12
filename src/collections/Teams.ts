import { CollectionConfig } from 'payload'

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
      name: 'country_id',
      type: 'number',
      required: true,
    },
    {
      name: 'logo_path',
      type: 'text',
    },
    {
      name: 'short_code',
      type: 'text',
    },
    {
      name: 'founded',
      type: 'number',
    },
    {
      name: 'coach',
      type: 'text',
    },
    {
      name: 'players',
      type: 'array',
      fields: [
        {
          name: 'player_id',
          type: 'number',
        },
      ],
    },
  ],
}
