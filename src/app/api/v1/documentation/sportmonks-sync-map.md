# Sportmonks API Sync Map

This document describes how the Futave backend synchronizes data from the Sportmonks API, including which entities are synced, how sync jobs are queued and processed, and how to extend the sync system.

---

## Overview

The Futave backend uses scheduled and on-demand jobs to synchronize football data from the Sportmonks API. This ensures our database stays up-to-date with teams, fixtures, players, leagues, and other core entities. Sync jobs are managed via a task queue and processed by dedicated handlers, allowing for robust, scalable, and fault-tolerant data ingestion.

## Job Queue Architecture (Powered by Payload CMS)

The Futave backend leverages [Payload CMS's Jobs Queue](https://payloadcms.com/docs/jobs-queue/overview) to manage all Sportmonks sync operations. Payload's queue system allows us to offload long-running or scheduled syncs from the main API server, ensuring non-blocking, scalable, and reliable data ingestion.

**Key Concepts from Payload Jobs Queue:**
- **Task:** A function that performs a specific sync operation (e.g., syncing teams, fixtures, etc.).
- **Job:** An instance of a task (or workflow) with its own payload and execution context.
- **Workflow:** (Optional) A sequence of tasks that should be run in order, with retry support.
- **Queue:** A logical grouping of jobs (e.g., "sync", "nightly", etc.).

**How We Use It:**
- Each Sportmonks sync (e.g., `syncTeams`, `syncFixtures`) is implemented as a Payload Task.
- Jobs are enqueued via Payload's API, either on a schedule (cron), via admin actions, or in response to events.
- Jobs can be scheduled for future execution, retried on failure, and run in parallel (with concurrency controls).
- All job logic is kept out of request/response cycles, ensuring fast API performance.

**References:**
- [Payload CMS Jobs Queue Documentation](https://payloadcms.com/docs/jobs-queue/overview)

---

## Entities Synced

The following core entities are regularly synchronized from Sportmonks:

- **Leagues**: League metadata, country, and season info
- **Seasons**: Season details for each league
- **Teams**: Team info, logos, stadiums, and league associations
- **Players**: Player profiles, team assignments, and stats
- **Fixtures**: Match schedules, results, and live updates
- **Standings**: League tables and rankings
- **Events**: Match events (goals, cards, substitutions, etc.)
- **Lineups**: Starting lineups and substitutes for fixtures
- **Venues**: Stadium and location data

Each entity may have its own sync handler and job type.

---

## Sync Triggers

Sync jobs can be triggered in several ways:

- **Scheduled Jobs**: Periodic cron jobs (e.g., every hour, daily) for regular updates
- **Manual Triggers**: Admin endpoints or CLI commands to force a sync
- **Event-Driven**: Webhooks or internal events (e.g., after a fixture finishes)

## Triggering Sync Jobs via API Endpoint

You can trigger a full set of Sportmonks sync jobs using the following endpoint:

### Endpoint
```
GET /api/queue-jobs/sync
```

### How it Works
- When you call this endpoint, it attempts to queue jobs for all major sync tasks:
  - `syncLeagues`
  - `syncTeams`
  - `syncMatches` (with a date range)
  - `syncPlayers`
  - `syncMetadataTypes`
  - `syncCountries`
- If a job of the same type is already queued or processing, it will be skipped to avoid duplication.
- You can trigger a special backfill job by adding the `?queue=backfill` query parameter. This will queue a long-range `syncMatches` job for the past year.

### Example Request
```http
GET /api/queue-jobs/sync
```
Or for backfill:
```http
GET /api/queue-jobs/sync?queue=backfill
```

### Example Response
```json
{
  "message": "Sync jobs have been processed",
  "queuedJobs": [
    { "task": "syncLeagues", "queue": null },
    { "task": "syncTeams", "queue": null },
    { "task": "syncMatches", "queue": "hourly" },
    { "task": "syncPlayers", "queue": "nightly" },
    { "task": "syncMetadataTypes", "queue": null },
    { "task": "syncCountries", "queue": null }
  ],
  "skippedJobs": []
}
```
If jobs are already running, they will appear in `skippedJobs`.

### Backfill Sync Job

The backfill job is designed to synchronize a large historical range of match data (typically the past year) from Sportmonks. This is useful for initial data loads or when you need to recover missing historical data.

#### How to Trigger
To queue a backfill job, call the sync endpoint with the `queue=backfill` query parameter:

```http
GET /api/queue-jobs/sync?queue=backfill
```

#### What It Does
- Queues a `syncMatches` job with a date range covering the past year.
- The job is placed in the `backfill` queue for special handling (e.g., lower priority, longer processing window).
- Only the backfill job is queued; other sync jobs are skipped.

#### Example Response
```json
{
  "message": "Backfill job has been queued",
  "job": {
    "task": "syncMatches",
    "queue": "backfill",
    "startDate": "2023-06-01",
    "endDate": "2024-06-01"
  }
}
```

#### Notes
- The backfill job is intended for large, potentially slow syncs and may take significant time to complete.
- Only one backfill job will be queued at a time; if one is already running or queued, new requests will be skipped.

### Previewing the Queue
You can view the current state of the job queue with:
```
GET /api/queue-jobs/preview
```
This returns all currently queued and processing jobs, with their status and timing.

---

**References:**
- [API Route Map](mdc:src/app/api/v1/documentation/api-route-map.md)
- [Sync Job Route Implementation](mdc:src/app/api/queue-jobs/sync/route.ts)
- [Queue Preview Route](mdc:src/app/api/queue-jobs/preview/route.ts)

---

## Task/Job Handling & Queueing

- **Job Queue:** All sync jobs are managed by Payload CMS's built-in Jobs Queue.
- **Task Definitions:** Each sync operation is a Payload Task (see [Payload Tasks](https://payloadcms.com/docs/jobs-queue/overview#tasks)).
- **Job Types:** Each entity sync (e.g., `syncTeams`, `syncFixtures`) is a distinct job type.
- **Handler Pattern:** Each task receives job data (e.g., entity IDs, date ranges), fetches data from Sportmonks, transforms it, and upserts it into the database.
- **Retry & Error Handling:** Payload handles retries and error logging. Failed jobs can be retried automatically or manually.
- **Scheduling:** Jobs can be scheduled for future execution using Payload's `waitUntil` property or via cron.
- **Concurrency:** Multiple jobs can be processed in parallel, with rate limits to respect Sportmonks API quotas.

**Example Handler Registration:**
```typescript
import { queueJob } from '@/utilities/queue'
import { syncTeamsHandler } from '@/sync/handlers/syncTeamsHandler'

queueJob('syncTeams', syncTeamsHandler)
```

**Example Job Enqueue:**
```typescript
import { enqueueJob } from '@/utilities/queue'

enqueueJob('syncTeams', { leagueId: 123 })
```

---

## Example Sync Flow: Syncing Teams

1. **Trigger**: Scheduled job or manual trigger enqueues a `syncTeams` job for a league.
2. **Queue**: The job is added to the queue with payload `{ leagueId }`.
3. **Handler**: `syncTeamsHandler` fetches teams from Sportmonks for the given league.
4. **Transform**: Data is mapped to our internal schema.
5. **Upsert**: Teams are upserted into the database (inserted or updated as needed).
6. **Result**: Job status is updated (success/failure), and errors are logged if any.

---

## Extending/Adding New Syncs

To add a new entity sync:
1. **Create a handler** in `src/sync/handlers/` (e.g., `syncVenuesHandler.ts`).
2. **Register the job type** in the queue system.
3. **Enqueue jobs** as needed (scheduled, manual, or event-driven).
4. **Document the new sync in this file.**

---

## References

- [Queue Utilities](mdc:src/utilities/queue.ts)
- [Sync Handlers](mdc:src/sync/handlers/)
- [Sportmonks API Docs](https://docs.sportmonks.com/football/)
- [API Route Map](mdc:src/app/api/v1/documentation/api-route-map.md)

---

> **Note:** This document should be updated whenever new sync jobs or entities are added, or when the sync/job handling pattern changes.
