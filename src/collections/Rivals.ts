import type { CollectionConfig } from 'payload'

export const Rivals: CollectionConfig = {
  slug: 'rivals',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    {
      name: 'team_id',
      type: 'number',
      required: true,
    },
    {
      name: 'rival_team_id',
      type: 'number',
      required: true,
    },
    {
      name: 'team',
      type: 'json',
      required: false,
    },
    {
      name: 'rival',
      type: 'json',
      required: false,
    },
  ],
}