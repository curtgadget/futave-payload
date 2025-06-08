// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { syncAllHandler } from '@/app/api/queue-jobs/sync/route'
import { previewHandler } from '@/app/api/queue-jobs/preview/route'
import { Leagues } from './collections/Leagues'
import { Matches } from './collections/Matches'
import { Media } from './collections/Media'
import { MetadataTypes } from './collections/MetadataTypes'
import { Players } from './collections/Players'
import { Teams } from './collections/Teams'
import { Users } from './collections/Users'
import { Countries } from './collections/Countries'
import { Coaches } from './collections/Coaches'
import { Rivals } from './collections/Rivals'
import { SyncMetadata } from './collections/SyncMetadata'

import { syncLeaguesHandler } from './tasks/handlers/syncLeagues'
import { syncTeamsHandler } from './tasks/handlers/syncTeams'
import { syncMatchesHandler } from './tasks/handlers/syncMatches'
import { syncPlayersHandler } from './tasks/handlers/syncPlayers'
import { syncMetadataTypesHandler } from './tasks/handlers/syncMetadataTypes'
import { syncCountriesHandler } from './tasks/handlers/syncCountries'
import { syncCoachesHandler } from './tasks/handlers/syncCoaches'
import { syncRivalsHandler } from './tasks/handlers/syncRivals'

import apiV1 from '@/app/api/v1'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Leagues, Matches, Teams, Players, MetadataTypes, Countries, Coaches, Rivals, SyncMetadata],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
  endpoints: [
    {
      path: '/api/queue-jobs/sync',
      method: 'get',
      handler: syncAllHandler,
    },
    {
      path: '/api/queue-jobs/preview',
      method: 'get',
      handler: previewHandler,
    },
    ...apiV1,
  ],
  jobs: {
    tasks: [
      {
        slug: 'syncLeagues',
        handler: syncLeaguesHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncTeams',
        handler: syncTeamsHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncMatches',
        handler: syncMatchesHandler,
        inputSchema: [
          {
            name: 'startDate',
            type: 'text',
          },
          {
            name: 'endDate',
            type: 'text',
          },
          {
            name: 'backfill',
            type: 'checkbox',
          },
        ],
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncPlayers',
        handler: syncPlayersHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncMetadataTypes',
        handler: syncMetadataTypesHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncCountries',
        handler: syncCountriesHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncCoaches',
        handler: syncCoachesHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
      {
        slug: 'syncRivals',
        handler: syncRivalsHandler,
        outputSchema: [
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'stats',
            type: 'json',
          },
        ],
      },
    ],
  },
})
