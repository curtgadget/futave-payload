import type { CollectionConfig } from 'payload'

export const SyncMetadata: CollectionConfig = {
  slug: 'sync-metadata',
  admin: {
    useAsTitle: 'syncType',
  },
  fields: [
    {
      name: 'syncType',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier for the sync operation (e.g., "rivals_data", "h2h_data")',
      },
    },
    {
      name: 'lastSyncAt',
      type: 'date',
      required: true,
      admin: {
        description: 'Timestamp of the last successful sync',
      },
    },
    {
      name: 'ttlDays',
      type: 'number',
      required: true,
      admin: {
        description: 'Time-to-live in days before next sync is allowed',
      },
    },
    {
      name: 'description',
      type: 'text',
      admin: {
        description: 'Human-readable description of what this sync does',
      },
    },
  ],
}