#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function pluralize(str: string): string {
  const irregulars: Record<string, string> = {
    country: 'countries',
    // Add more irregular plurals here as needed
  }

  return irregulars[str] || `${str}s`
}

function createFile(filePath: string, content: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, content)
  console.log(`Created ${filePath}`)
}

function generateSyncHandler(entityName: string) {
  const basePath = path.join(__dirname, '..', 'src')
  const Entity = capitalize(entityName)
  const pluralName = pluralize(entityName)

  // Create collection
  const collectionContent = `import type { CollectionConfig } from 'payload'

export const ${Entity}s: CollectionConfig = {
  slug: '${pluralName}',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    // Add your collection fields here
  ],
}
`
  createFile(path.join(basePath, 'collections', `${Entity}s.ts`), collectionContent)

  // Update types in client/types.ts
  const typesContent = `export interface Sportmonks${Entity} {
  id: number
  // Add your API fields here
}`
  createFile(
    path.join(basePath, 'services', 'sportmonks', 'client', 'types', `${pluralName}.ts`),
    typesContent,
  )

  // Create endpoint
  const endpointContent = `import { SportmonksConfig, Sportmonks${Entity}, FetchParams } from '../types'
import { createSportmonksClient } from '..'

export function create${Entity}Endpoint(config: SportmonksConfig) {
  const client = createSportmonksClient({
    ...config,
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  })

  return {
    getAll: (params?: FetchParams) =>
      client.fetchAllPages<Sportmonks${Entity}>('/${pluralName}', params),
    getById: (id: number, params?: FetchParams) =>
      client.fetchFromApi<Sportmonks${Entity}>(\`/${pluralName}/\${id}\`, params),
  }
}`
  createFile(
    path.join(basePath, 'services', 'sportmonks', 'client', 'endpoints', `${pluralName}.ts`),
    endpointContent,
  )

  // Create transformer
  const transformerContent = `import { Sportmonks${Entity} } from '../client/types'

export function transform${Entity}(${entityName}: Sportmonks${Entity}) {
  return {
    id: ${entityName}.id,
    // Add your transformations here
  }
}`
  createFile(
    path.join(basePath, 'services', 'sportmonks', 'transformers', `${entityName}.transformer.ts`),
    transformerContent,
  )

  // Create sync handler
  const syncHandlerContent = `import { Sportmonks${Entity} } from '../../sportmonks/client/types'
import { create${Entity}Endpoint } from '../../sportmonks/client/endpoints/${pluralName}'
import { transform${Entity} } from '../../sportmonks/transformers/${entityName}.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function create${Entity}Sync(config: SportmonksConfig) {
  const endpoint = create${Entity}Endpoint(config)

  return createSyncService<Sportmonks${Entity}>({
    collection: '${pluralName}',
    fetchData: () => endpoint.getAll(),
    transformData: transform${Entity},
    batchSize: 100,
  })
}`
  createFile(
    path.join(basePath, 'services', 'sync', 'handlers', `${entityName}.sync.ts`),
    syncHandlerContent,
  )

  // Create task handler
  const taskHandlerContent = `import { TaskHandler } from 'payload'
import { create${Entity}Sync } from '@/services/sync/handlers/${entityName}.sync'

export const sync${Entity}sHandler: TaskHandler<'sync${Entity}s'> = async () => {
  const sync = create${Entity}Sync({
    apiKey: process.env.SPORTMONKS_API_KEY || '',
    baseUrl: process.env.SPORTMONKS_BASE_URL,
  })

  try {
    const result = await sync.sync()
    return {
      success: result.success,
      output: {
        message: result.message,
        stats: {
          created: result.stats.created,
          updated: result.stats.updated,
          failed: result.stats.failed,
          errors: result.stats.errors,
          duration: result.stats.endTime ? result.stats.endTime - result.stats.startTime : 0,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      output: {
        message: error instanceof Error ? error.message : 'Unknown error occurred during sync',
      },
    }
  }
}`
  createFile(path.join(basePath, 'tasks', 'handlers', `sync${Entity}s.ts`), taskHandlerContent)

  console.log(`
Next steps:
1. Add your collection fields to collections/${Entity}s.ts
2. Add your API fields to services/sportmonks/client/types/${pluralName}.ts
3. Add your transformations to services/sportmonks/transformers/${entityName}.transformer.ts
4. Register the collection and task in payload.config.ts:

// Add to collections array:
${Entity}s,

// Add to tasks array:
{
  slug: 'sync${Entity}s',
  handler: sync${Entity}sHandler,
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

5. Add the sync task to your route handler if needed:
payload.jobs.queue({
  task: 'sync${Entity}s',
  input: {},
})
`)
}

const entityName = process.argv[2]
if (!entityName) {
  console.error('Please provide an entity name')
  process.exit(1)
}

generateSyncHandler(entityName)
