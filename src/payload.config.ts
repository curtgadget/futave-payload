// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { CRY } from './app/my-route/route'
import { Leagues } from './collections/Leagues'
import { Matches } from './collections/Matches'
import { Media } from './collections/Media'
import { Teams } from './collections/Teams'
import { Users } from './collections/Users'

import { syncLeaguesHandler, testJobsHandler } from './tasks/syncLeagues'
import { syncTeamsHandler } from './tasks/syncTeams'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Leagues, Matches, Teams],
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
      path: '/cry',
      method: 'get',
      handler: CRY,
    },
  ],
  jobs: {
    tasks: [
      {
        slug: 'syncLeagues',
        handler: syncLeaguesHandler,
        onSuccess: () => {
          console.log('🚀 syncLeagues ~ onSuccess ~ It worked!:')
        },
        onFail: () => {
          console.log('🚀 syncLeagues ~ onFailure ~ Something pooped!:')
        },
      },
      {
        slug: 'testJobs',
        retries: {
          shouldRestore: false,
        },
        outputSchema: [
          {
            name: 'testJobsOutput',
            type: 'text',
          },
        ],
        handler: testJobsHandler,
        onSuccess: () => {
          console.log('🚀 testJobs ~ onSuccess ~ It worked!:')
        },
        onFail: () => {
          console.log('🚀 testJobs ~ onFailure ~ Something pooped!:')
        },
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
    ],
  },
})
