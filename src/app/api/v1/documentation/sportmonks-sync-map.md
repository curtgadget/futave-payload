# Sportmonks API Sync Map

This document describes how the Futave backend synchronizes data from the Sportmonks API, including which entities are synced, how sync jobs are queued and processed, and how to extend the sync system.

---

## Overview

The Futave backend uses scheduled and on-demand jobs to synchronize football data from the Sportmonks API. This ensures our database stays up-to-date with teams, fixtures, players, leagues, and other core entities. Sync jobs are managed via a task queue and processed by dedicated handlers, allowing for robust, scalable, and fault-tolerant data ingestion.

## Job Queue Architecture (Powered by Payload CMS)

The Futave backend leverages [Payload CMS's Jobs Queue](https://payloadcms.com/docs/jobs-queue/overview) to manage all Sportmonks sync operations. Payload handles job scheduling, execution, retries, and failure handling. Jobs are defined as tasks registered in Payload with specific handlers.

#### Key Components of the Job Queue System:

- **Queue Slots**: Different priority levels for different types of jobs (hourly, nightly, daily)
- **Task Registry**: Set of registered task handlers that can be invoked by the queue
- **Job Scheduling**: Both automated (timer-triggered) and manual (API-triggered) job scheduling
- **Job Progress Tracking**: Monitoring of execution status, errors, and results
- **Retry Logic**: Automatic retry of failed jobs based on configured policies
- **Error Handling**: Comprehensive error capture and reporting

## Entities Synced from Sportmonks

The following entities are synced from the Sportmonks API:

1. **Leagues**: Competition structures (Premier League, La Liga, etc.)
2. **Teams**: Clubs participating in leagues
3. **Matches**: Fixtures/games between teams (including lineups, events, and sidelined players)
4. **Players**: Athletes registered with teams
5. **Metadata Types**: Reference data for various entity attributes
6. **Countries**: Country information used for relationships
7. **Coaches**: Team coaches and managers

### Match Data Enhancement (January 2025)

Matches now include comprehensive data beyond basic fixtures:
- **Lineups**: Starting XI and substitutes with formation data
- **Events**: Goals, cards, substitutions linked to players
- **Sidelined Players**: Injury and unavailability information including:
  - Injury type and category
  - Start and end dates
  - Games missed during the period
  - Completion status

## Sync Schedule

Jobs are organized into queue types based on frequency and priority:

- **Hourly Queue**: High-frequency updates for time-sensitive data
- **Daily Queue**: Daily refreshes of relatively stable data
- **Nightly Queue**: Comprehensive background syncs for large data sets
- **Backfill Queue**: One-time or on-demand historical data imports
- **Dev Queue**: Testing queue for development purposes

## Example Sync Flow: Syncing Teams

1. **Trigger**: Scheduled job or manual trigger enqueues a `syncTeams` job for a league.
2. **Queue**: The job is added to the queue with payload `{ leagueId: 123 }`.
3. **Processing**: When a queue slot is available, Payload invokes the `syncTeamsHandler`.
4. **API Call**: The handler calls the Sportmonks API to fetch team data for the league.
5. **Transformation**: Raw API data is transformed into our database schema.
6. **Storage**: Transformed data is upserted into the database (creating new records or updating existing ones).
7. **Completion**: Handler returns success status and stats to the job queue.

## Example Sync Flow: Syncing Coaches

1. **Trigger**: Scheduled job or manual trigger enqueues a `syncCoaches` job.
2. **Queue**: The job is added to the "dev" or "nightly" queue (configurable).
3. **Processing**: When a queue slot is available, Payload invokes the `syncCoachesHandler`.
4. **API Call**: The handler calls the Sportmonks API endpoint `/coaches` to fetch coach data.
5. **Transformation**: Raw API data is transformed using `coach.transformer.ts` into our database schema.
6. **Storage**: Transformed coach data is upserted into the Coaches collection.
7. **Completion**: Handler returns success/failure status and statistics to the job queue.

## Implementation Details

### Service Pattern

Each entity follows a consistent service pattern:

1. **Client Endpoints**: API wrapper functions in `src/services/sportmonks/client/endpoints/`
2. **Transformers**: Data transformation functions in `src/services/sportmonks/transformers/`
3. **Sync Services**: Sync logic in `src/services/sync/handlers/`
4. **Task Handlers**: Payload job handlers in `src/tasks/handlers/`

### Error Handling

Sync operations capture and report errors at multiple levels:

- **API Call Errors**: Network issues, rate limits, authorization problems
- **Transformation Errors**: Data schema mismatches, invalid formats
- **Database Errors**: Constraint violations, transaction failures
- **General Errors**: Unexpected exceptions in the sync process

### Adding a New Sync Entity

To add synchronization for a new entity (e.g., transfers, venues):

1. Create a collection in `src/collections/`
2. Add type definitions in `src/services/sportmonks/client/types/`
3. Create an endpoint in `src/services/sportmonks/client/endpoints/`
4. Implement a transformer in `src/services/sportmonks/transformers/`
5. Create a sync service in `src/services/sync/handlers/`
6. Add a task handler in `src/tasks/handlers/`
7. Register the task in `src/payload.config.ts`
8. Add it to the appropriate queue in `src/app/api/queue-jobs/sync/route.ts`

## Troubleshooting Sync Issues

Common sync issues and resolutions:

- **404 Errors**: Verify API endpoint paths and ensure your subscription includes access to the entity
- **Rate Limiting**: Check concurrency settings and consider reducing parallel requests
- **Transformation Errors**: Verify schema alignment with Sportmonks API responses
- **Missing Relationships**: Ensure dependent entities are synced first (e.g., countries before teams)
- **Task Timeouts**: For large datasets, consider implementing pagination or chunking
## MongoDB ID Strategy

In Futave, we use the Sportmonks integer IDs directly as MongoDB `_id` fields rather than using MongoDB's default ObjectIds. This design decision has several important implications.

### Implementation

- Each entity synced from Sportmonks uses the Sportmonks ID as both the `_id` field and the `id` field
- We implement this in `src/services/sync/base.sync.ts` by explicitly setting `_id: item.id` during document insertion
- Most collections also include a `sportmonksId` field with the string representation of the ID for compatibility

### Advantages

- **Simplicity**: Using the same ID across systems makes database operations, joins, and lookups more intuitive
- **Storage efficiency**: Integer IDs use less space than ObjectIds (4 bytes vs 12 bytes)
- **Query performance**: Equality queries on integer IDs can be slightly faster than on ObjectIds
- **Readability**: Integer IDs are human-readable and easier to reference in debugging or analytics
- **API integration**: Maintaining the original ID makes integration with Sportmonks API more straightforward

### Drawbacks

- **Loss of timestamp information**: ObjectIds contain an embedded creation timestamp, which we have to track separately
- **Sharding considerations**: If we ever shard MongoDB, integer IDs might not distribute as evenly as ObjectIds
- **No automatic sorting by creation time**: Unlike ObjectIds which naturally sort chronologically
- **Custom creation workflow**: Creating entities outside the sync process requires careful ID management
- **Tool compatibility**: Some MongoDB tools or libraries might have optimizations specifically for ObjectId type

### Troubleshooting

- If you see relationship issues with Payload CMS, verify that the integer IDs are being correctly referenced
- For entities that use a different ID structure, make the appropriate adjustments in both the transformer and sync logic
- If using MongoDB tools like mongodump/mongorestore, test carefully with integer IDs to ensure proper handling

---

*This documentation is maintained by the Futave backend team. For questions or to report issues, please contact the development team.*
