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
    {
      name: 'priority',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Display priority in match listings (higher numbers appear first, 0 = default order)',
        position: 'sidebar'
      }
    },
    {
      name: 'tier',
      type: 'select',
      options: [
        { label: 'Tier 1 - Top European', value: 'tier1' },
        { label: 'Tier 2 - Major European', value: 'tier2' }, 
        { label: 'Tier 3 - International/Other', value: 'tier3' },
        { label: 'Tier 4 - Lower/Regional', value: 'tier4' }
      ],
      defaultValue: 'tier4',
      admin: {
        description: 'League tier for automatic prioritization',
        position: 'sidebar'
      }
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Feature this league prominently in match listings',
        position: 'sidebar'
      }
    }
  ],
}
