import type { CollectionConfig } from 'payload'

export const Players: CollectionConfig = {
  slug: 'players',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
      unique: true,
    },
    {
      name: 'sport_id',
      type: 'number',
      required: true,
    },
    {
      name: 'country_id',
      type: 'number',
      required: false,
    },
    {
      name: 'nationality_id',
      type: 'number',
      required: false,
    },
    {
      name: 'position_id',
      type: 'number',
    },
    {
      name: 'detailed_position_id',
      type: 'number',
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'common_name',
      type: 'text',
    },
    {
      name: 'firstname',
      type: 'text',
    },
    {
      name: 'lastname',
      type: 'text',
    },
    {
      name: 'display_name',
      type: 'text',
    },
    {
      name: 'image_path',
      type: 'text',
    },
    {
      name: 'height',
      type: 'number',
    },
    {
      name: 'weight',
      type: 'number',
    },
    {
      name: 'date_of_birth',
      type: 'date',
    },
    {
      name: 'gender',
      type: 'text',
    },
    // Relations
    {
      name: 'teams',
      type: 'json',
    },
    {
      name: 'statistics',
      type: 'json',
    },
    {
      name: 'lineups',
      type: 'json',
    },
    {
      name: 'transfers',
      type: 'json',
    },
    {
      name: 'pendingtransfers',
      type: 'json',
    },
    {
      name: 'trophies',
      type: 'json',
    },
    {
      name: 'latest',
      type: 'json',
    },
    {
      name: 'metadata',
      type: 'json',
    },
    {
      name: 'nationality',
      type: 'json',
    },
  ],
}
