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

# Calculate wave scores for matches
node scripts/calculate-wave-scores.ts

# Test smart sorting functionality
node scripts/test-smart-sorting.ts

# Monitor API rate limit status
curl http://localhost:3000/api/v1/rate-limit-status
```

## Docker Development Environment

```bash
# Start the development environment with MongoDB
docker-compose up
```

## Architecture

FutAve is a soccer live scores platform built with Next.js and Payload CMS, using MongoDB for data storage. It integrates with the Sportmonks API to sync and serve real-time soccer data with intelligent match discovery through the Wave Detector algorithm.

### Wave Detector System

The Wave Detector is an intelligent match excitement scoring system that helps surface the most compelling matches to users:

- **6 Scoring Factors**: Rivalry (0-30), Position (0-20), Zone (0-20), Form (0-15), H2H Drama (0-10), Timing (0-5)
- **Tier Classification**: S-Tier (80-100), A-Tier (60-79), B-Tier (40-59), C-Tier (0-39)
- **Real-time Calculation**: Scores calculated during match sync for upcoming matches
- **Smart Sorting**: Combines league priority with wave scores for optimal discovery
- **Performance Optimized**: Cached standings calculations with 6-hour expiry

### Core Components

1. **Payload CMS Configuration** (`/src/payload.config.ts`)
   - Defines collections, endpoints, and scheduled jobs
   - Configures MongoDB adapter and other plugins

2. **Collections** (`/src/collections/`)
   - MongoDB schemas for Leagues, Matches, Teams, Players, Coaches, Countries, MetadataTypes, Rivals
   - Each collection defines its fields, relationships, and admin UI configuration
   - Matches collection includes Wave Detector scoring system with 6 factors
   - Leagues collection includes cached standings for performance optimization

3. **Data Synchronization** (`/src/tasks/handlers/`)
   - Job handlers that fetch data from Sportmonks API
   - Transform and store the data in MongoDB collections
   - Examples: syncLeaguesHandler, syncTeamsHandler, syncMatchesHandler
   - Enhanced match sync with Wave Detector scoring for upcoming matches
   - Dynamic standings calculation with caching (6-hour expiry)

4. **Sportmonks Integration** (`/src/services/sportmonks/`)
   - Client for Sportmonks API (`/client/index.ts`)
   - Transformers to convert API responses to application models

5. **API Layer** (`/src/app/api/`)
   - RESTful endpoints under `/api/v1/`
   - Endpoints for triggering data synchronization jobs under `/api/queue-jobs/`
   - Smart sorting system combining league priority with Wave Detector scores
   - Dedicated wave matches endpoint (`/api/v1/matches/waves`)
   - Enhanced matches list with wave score integration

### Data Flow

1. Scheduled jobs or manual triggers initiate data sync from Sportmonks
2. Entity-based rate limiter ensures compliance with 3000 calls/hour per entity limit
3. API client fetches and paginates through Sportmonks API responses with rate limit monitoring
4. Transformers convert external data format to internal models
5. Data is stored in MongoDB collections
6. Wave Detector calculates excitement scores for upcoming matches
7. Standings are dynamically calculated from match results and cached
8. API endpoints serve enhanced data with intelligent sorting to frontend clients

### Rate Limiting System

**Entity-Based Rate Limiting**: Tracks API calls separately for each Sportmonks entity (leagues, teams, players, etc.) with a 3000 calls per hour limit per entity.

**Key Features**:
- Real-time rate limit tracking with hourly windows
- Parse rate limit headers from API responses to stay in sync
- Automatic backoff when approaching limits
- Rate limit status monitoring endpoint

**Monitoring**: Use `/api/v1/rate-limit-status` to monitor current usage and get recommendations

### Environment Variables

Required:
- `DATABASE_URI`: MongoDB connection string
- `PAYLOAD_SECRET`: Secret key for Payload CMS
- `SPORTMONKS_API_KEY`: API key for Sportmonks football data

## Development Guidelines

### Technology Stack Expertise
- **Backend**: Payload CMS, MongoDB, Node.js, Express, TypeScript
- **Frontend**: Next.js, React, React Native, Remix.js, TypeScript
- **Database**: MongoDB, Mongoose, MongoDB Atlas, aggregation pipelines
- **APIs**: RESTful APIs, GraphQL, Webhook integrations

### Payload CMS Patterns
- Structure collections with clear relationships and field validation
- Implement field-level access control and permissions
- Create reusable field groups and blocks for content modeling
- Follow Payload hooks pattern for extending functionality
- Implement custom endpoints instead of overriding core functionality
- Use migrations for database schema changes
- Organize collections by domain/feature
- Implement proper upload handling and image processing

### File Structure Conventions
- Collections: `src/collections/{feature}.ts`
- Globals: `src/globals/{feature}.ts`
- Fields: `src/fields/{type}.ts`
- Hooks: `src/hooks/{collection}/{operation}.ts`
- Endpoints: `src/endpoints/{feature}.ts`
- Utilities: `src/utilities/{function}.ts`

### MongoDB Best Practices
- Design schemas with proper indexing for performance
- Use aggregation pipelines for complex data transformations
- Implement proper error handling for database operations
- Follow data validation at both application and database levels
- Consider document size limits when designing schemas
- Use MongoDB transactions for operations requiring atomicity
- Implement pagination for large datasets

### TypeScript Code Style
- Use TypeScript for all code; prefer types over interfaces except for public APIs
- Create precise types that reflect data models
- Avoid 'any' or 'unknown'; look for existing type definitions
- Avoid type assertions ('as' or '!') unless absolutely necessary
- Use mapped and conditional types for advanced transformations
- Export types from central locations for reuse
- Use functional and declarative programming patterns; avoid classes
- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (isLoaded, hasError)

### Naming Conventions
- Prefer named exports for components and utilities
- PascalCase for components, interfaces, and types
- camelCase for variables, functions, and methods
- Prefix GraphQL query files with 'use' (e.g., useSiteMetadata.ts)
- Use meaningful names describing function/variable purpose

### Security Requirements
- Implement proper authentication and authorization
- Sanitize user inputs to prevent injection attacks
- Use environment variables for sensitive configuration
- Implement rate limiting to prevent abuse
- Follow principle of least privilege for API access
- Use HTTPS for all communications
- Validate and sanitize inputs, especially from external sources

### Performance Optimization
- Optimize database queries with proper indexing
- Implement caching strategies for frequently accessed data
- Use lazy loading and pagination for large datasets
- Optimize image and asset delivery
- Use server-side rendering or static generation when appropriate
- Monitor and optimize API response times

### Testing Strategy
- Write unit tests for business logic
- Implement integration tests for API endpoints
- Use mocking for external dependencies
- Write end-to-end tests for critical user flows
- Follow test-driven development when appropriate



## Mandatory Agent Rules

**IMPORTANT**: These Mandatory Agent Rules MUST be followed throughout the ENTIRE conversation.

### 1. **CLARIFY FIRST**
Iteratively ask minimal clarifying questions (yes/no or multiple-choice format) to clarify ambiguity before proceeding. Provide recommendations where helpful. Never make assumptions without explicit approval.

### 2. **SYSTEMATIC APPROACH**
Break down work into clear, logical steps. Use Todo format for complex tasks. Build solutions incrementally, validating each step before proceeding.

### 3. **CONTROLLED CHANGES**
Explain the how/why/what before executing changes. Modify only what was agreed upon. Request permission for beneficial changes beyond original scope.

### 4. **RESEARCH & VERIFY**
Use context7, perplexity-ask, DuckDuckGo, and project files liberally. Reference official documentation. Verify information against multiple sources.
Use MongoDB MCP whenever you need to verify the data model or any data. The database is futave-backend

### 5. **MEMORY MANAGEMENT**
Keep memory bank concise and current. Update memories and documentation after completing subtasks. Ensure knowledge graphs reflect current understanding.


