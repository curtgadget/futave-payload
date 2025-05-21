# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Clean start (removes .next folder first)
pnpm devsafe

# Generate Payload types
pnpm generate:types

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint code
pnpm lint

# Build for production
pnpm build

# Start production server
pnpm start

# Create a new sync handler
pnpm create-sync
```

## Docker Development Environment

```bash
# Start the development environment with MongoDB
docker-compose up
```

## Architecture

FutAve is a soccer live scores platform built with Next.js and Payload CMS, using MongoDB for data storage. It integrates with the Sportmonks API to sync and serve real-time soccer data.

### Core Components

1. **Payload CMS Configuration** (`/src/payload.config.ts`)
   - Defines collections, endpoints, and scheduled jobs
   - Configures MongoDB adapter and other plugins

2. **Collections** (`/src/collections/`)
   - MongoDB schemas for Leagues, Matches, Teams, Players, Coaches, Countries, MetadataTypes
   - Each collection defines its fields, relationships, and admin UI configuration

3. **Data Synchronization** (`/src/tasks/handlers/`)
   - Job handlers that fetch data from Sportmonks API
   - Transform and store the data in MongoDB collections
   - Examples: syncLeaguesHandler, syncTeamsHandler, syncMatchesHandler

4. **Sportmonks Integration** (`/src/services/sportmonks/`)
   - Client for Sportmonks API (`/client/index.ts`)
   - Transformers to convert API responses to application models

5. **API Layer** (`/src/app/api/`)
   - RESTful endpoints under `/api/v1/`
   - Endpoints for triggering data synchronization jobs under `/api/queue-jobs/`

### Data Flow

1. Scheduled jobs or manual triggers initiate data sync from Sportmonks
2. API client fetches and paginates through Sportmonks API responses
3. Transformers convert external data format to internal models
4. Data is stored in MongoDB collections
5. API endpoints serve the data to frontend clients

### Environment Variables

Required:
- `DATABASE_URI`: MongoDB connection string
- `PAYLOAD_SECRET`: Secret key for Payload CMS
- `SPORTMONKS_API_KEY`: API key for Sportmonks football data