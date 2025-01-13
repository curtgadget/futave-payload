# Services

This directory contains service-related code, primarily focused on syncing data from external APIs.

## Directory Structure

```
services/
├── sportmonks/              # Sportmonks API integration
│   ├── client/             # API client code
│   │   ├── endpoints/      # Endpoint-specific implementations
│   │   └── types.ts        # API types
│   └── transformers/       # Data transformers
├── sync/                   # Generic sync functionality
│   ├── handlers/          # Sync handlers for each collection
│   └── base.sync.ts       # Base sync implementation
```

## Adding a New Sync Handler

To add a new sync handler for a collection, follow these steps:

1. Add API types in `sportmonks/client/types.ts`:
```typescript
export interface SportmonksNewEntity {
  id: number
  // ... other fields from the API
}
```

2. Create an endpoint in `sportmonks/client/endpoints/newEntity.ts`:
```typescript
export function createNewEntityEndpoint(config: SportmonksConfig) {
  const client = createSportmonksClient(config)

  return {
    getAll: (params: FetchParams = {}) =>
      client.fetchAllPages<SportmonksNewEntity>('/endpoint-path', {
        ...params,
        include: params.include || 'related,fields',
      })
  }
}
```

3. Create a transformer in `sportmonks/transformers/newEntity.transformer.ts`:
```typescript
export function transformNewEntity(entity: SportmonksNewEntity) {
  return {
    id: entity.id,
    // ... transform API data to your schema
  }
}
```

4. Create a sync handler in `sync/handlers/newEntity.sync.ts`:
```typescript
export function createNewEntitySync(config: SportmonksConfig) {
  const endpoint = createNewEntityEndpoint(config)

  return createSyncService<SportmonksNewEntity>({
    collection: 'newEntities',
    fetchData: () => endpoint.getAll(),
    transformData: transformNewEntity,
    batchSize: 10,
  })
}
```

5. Add a task handler in `tasks/handlers/syncNewEntity.ts`:
```typescript
export const syncNewEntityHandler: TaskHandler<'syncNewEntity'> = async () => {
  const sync = createNewEntitySync({
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
```

6. Register the task in `payload.config.ts`:
```typescript
{
  slug: 'syncNewEntity',
  handler: syncNewEntityHandler,
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
```

## Sync Process

The sync process:
1. Fetches data from the Sportmonks API
2. Processes items in batches
3. Transforms API data to match your schema
4. Creates or updates records in your database
5. Provides detailed logging and error tracking

## Logging

The sync process provides:
- Start and completion messages
- Batch processing progress
- Summary statistics
- Detailed error reporting when needed
