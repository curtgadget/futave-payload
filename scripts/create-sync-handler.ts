#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
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

  // Create types
  const typesContent = `
export interface Sportmonks${Entity} {
  id: number
  // Add your API fields here
}
`
  createFile(
    path.join(basePath, 'services', 'sportmonks', 'client', 'types', `${entityName}.ts`),
    typesContent,
  )

  // Create endpoint
  const endpointContent = `import { createSportmonksClient } from '../index'
import { FetchParams, SportmonksConfig, Sportmonks${Entity} } from '../types/${entityName}'

const DEFAULT_INCLUDE = ''  // Add your includes here

export function create${Entity}Endpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  async function getAll(params: FetchParams = {}): Promise<Sportmonks${Entity}[]> {
    return client.fetchAllPages<Sportmonks${Entity}>('/${entityName}s', {
      ...params,
      include: params.include || DEFAULT_INCLUDE,
    })
  }

  return {
    getAll,
  }
}
`
  createFile(
    path.join(basePath, 'services', 'sportmonks', 'client', 'endpoints', `${entityName}.ts`),
    endpointContent,
  )

  // Create transformer
  const transformerContent = `import { Sportmonks${Entity} } from '../client/types/${entityName}'

export interface Transformed${Entity} {
  id: number
  // Add your transformed fields here
}

export function transform${Entity}(${entityName}: Sportmonks${Entity}): Transformed${Entity} {
  return {
    id: ${entityName}.id,
    // Add your transformations here
  }
}
`
  createFile(
    path.join(basePath, 'services', 'sportmonks', 'transformers', `${entityName}.transformer.ts`),
    transformerContent,
  )

  // Create sync handler
  const syncHandlerContent = `import { Sportmonks${Entity} } from '../../sportmonks/client/types/${entityName}'
import { create${Entity}Endpoint } from '../../sportmonks/client/endpoints/${entityName}'
import { transform${Entity} } from '../../sportmonks/transformers/${entityName}.transformer'
import { createSyncService } from '../base.sync'
import { SportmonksConfig } from '../../sportmonks/client/types'

export function create${Entity}Sync(config: SportmonksConfig) {
  const endpoint = create${Entity}Endpoint(config)

  return createSyncService<Sportmonks${Entity}>({
    collection: '${entityName}s',
    fetchData: () => endpoint.getAll(),
    transformData: transform${Entity},
    batchSize: 10,
  })
}
`
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
}
`
  createFile(path.join(basePath, 'tasks', 'handlers', `sync${Entity}s.ts`), taskHandlerContent)

  console.log(`
Next steps:
1. Add your API fields to types/${entityName}.ts
2. Add your includes to endpoints/${entityName}.ts
3. Add your transformations to transformers/${entityName}.transformer.ts
4. Register the task in payload.config.ts:

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
}
`)
}

const entityName = process.argv[2]
if (!entityName) {
  console.error('Please provide an entity name')
  process.exit(1)
}

generateSyncHandler(entityName)
