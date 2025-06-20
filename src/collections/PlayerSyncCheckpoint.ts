import type { CollectionConfig } from 'payload'

export const PlayerSyncCheckpoint: CollectionConfig = {
  slug: 'player-sync-checkpoint',
  admin: {
    useAsTitle: 'syncId',
    group: 'System',
  },
  fields: [
    {
      name: 'syncId',
      type: 'text',
      required: true,
      unique: true,
      defaultValue: 'player-sync-main',
      admin: {
        description: 'Unique identifier for this sync process',
      },
    },
    {
      name: 'currentPage',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'Current page being processed',
      },
    },
    {
      name: 'totalPagesDiscovered',
      type: 'number',
      admin: {
        description: 'Total pages discovered from API pagination info',
      },
    },
    {
      name: 'playersProcessed',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Total number of players processed so far',
      },
    },
    {
      name: 'lastSyncTime',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      admin: {
        description: 'When this checkpoint was last updated',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyy h:mm:ss a',
        },
      },
    },
    {
      name: 'syncStartTime',
      type: 'date',
      admin: {
        description: 'When the current sync cycle started',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyy h:mm:ss a',
        },
      },
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'fresh-start',
      options: [
        { label: 'Fresh Start', value: 'fresh-start' },
        { label: 'Resuming', value: 'resuming' },
        { label: 'Completed', value: 'completed' },
        { label: 'Rate Limited', value: 'rate-limited' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        description: 'Current state of the sync process',
      },
    },
    {
      name: 'rateLimit',
      type: 'group',
      fields: [
        {
          name: 'callsUsed',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'API calls used in current hour',
          },
        },
        {
          name: 'resetTime',
          type: 'date',
          admin: {
            description: 'When rate limit resets',
            date: {
              pickerAppearance: 'dayAndTime',
              displayFormat: 'MMM d, yyy h:mm:ss a',
            },
          },
        },
        {
          name: 'lastCallTime',
          type: 'date',
          admin: {
            description: 'Timestamp of last API call',
            date: {
              pickerAppearance: 'dayAndTime',
              displayFormat: 'MMM d, yyy h:mm:ss a',
            },
          },
        },
      ],
    },
    {
      name: 'stats',
      type: 'group',
      fields: [
        {
          name: 'playersCreated',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'playersUpdated',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'playersFailed',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'pagesCompleted',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'lastError',
      type: 'textarea',
      admin: {
        description: 'Last error message if sync failed',
      },
    },
    {
      name: 'nextResumeTime',
      type: 'date',
      admin: {
        description: 'Calculated time when sync can resume after rate limit',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'MMM d, yyy h:mm:ss a',
        },
      },
    },
  ],
}