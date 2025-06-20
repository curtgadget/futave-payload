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

# Sync matches with flexible options
node scripts/sync-matches.ts

# Calculate wave scores for matches
node scripts/calculate-wave-scores.ts

# Test smart sorting functionality  
node scripts/test-smart-sorting.ts

# Test Sportmonks API integration
node scripts/test-sportmonks.ts

# Debug and sync missing players
pnpm debug-players

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

- 6 Scoring Factors: Rivalry (0-30), Position (0-20), Zone (0-20), Form (0-15), H2H Drama (0-10), Timing (0-5)
- Tier Classification: S-Tier (80-100), A-Tier (60-79), B-Tier (40-59), C-Tier (0-39)
- Real-time Calculation: Scores calculated during match sync for upcoming matches
- Smart Sorting: Combines league priority with wave scores for optimal discovery
- Performance Optimized: Cached standings calculations with 6-hour expiry

### Core Components

1. **Payload CMS Configuration** (/src/payload.config.ts)
   - Defines collections, endpoints, and scheduled jobs
   - Configures MongoDB adapter and other plugins

2. **Collections** (/src/collections/)
   - MongoDB schemas for Leagues, Matches, Teams, Players, Coaches, Countries, MetadataTypes, Rivals
   - Each collection defines its fields, relationships, and admin UI configuration
   - Matches collection includes Wave Detector scoring system with 6 factors
   - Leagues collection includes cached standings for performance optimization

3. **Data Synchronization** (/src/tasks/handlers/)
   - Job handlers that fetch data from Sportmonks API
   - Transform and store the data in MongoDB collections
   - Examples: syncLeaguesHandler, syncTeamsHandler, syncMatchesHandler
   - Enhanced match sync with Wave Detector scoring for upcoming matches
   - Dynamic standings calculation with caching (6-hour expiry)

4. **Sportmonks Integration** (/src/services/sportmonks/)
   - Client for Sportmonks API (/client/index.ts)
   - Transformers to convert API responses to application models

5. **API Layer** (/src/app/api/)
   - RESTful endpoints under /api/v1/
   - Endpoints for triggering data synchronization jobs under /api/queue-jobs/
   - Smart sorting system combining league priority with Wave Detector scores
   - Dedicated wave matches endpoint (/api/v1/matches/waves)
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

**Key Features:**
- Real-time rate limit tracking with hourly windows
- Parse rate limit headers from API responses to stay in sync
- Automatic backoff when approaching limits
- Rate limit status monitoring endpoint

**Monitoring**: Use `/api/v1/rate-limit-status` to monitor current usage and get recommendations

### Environment Variables

**Required:**
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
- Always use Payload's find() and other convenience methods instead of direct MongoDB access

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

IMPORTANT: These Mandatory Agent Rules MUST be followed throughout the ENTIRE conversation.

### 1. CLARIFY FIRST

Iteratively ask minimal clarifying questions (yes/no or multiple-choice format) to clarify ambiguity before proceeding. Provide recommendations where helpful. Never make assumptions without explicit approval.

### 2. SYSTEMATIC APPROACH

Break down work into clear, logical steps. Use Todo format for complex tasks. Build solutions incrementally, validating each step before proceeding.

### 3. CONTROLLED CHANGES

Explain the how/why/what before executing changes. Modify only what was agreed upon. Request permission for beneficial changes beyond original scope.

### 4. RESEARCH & VERIFY

Use context7, perplexity-ask, DuckDuckGo, and project files liberally. Reference official documentation. Verify information against multiple sources.
Use MongoDB MCP whenever you need to verify the data model or any data. The database is futave-backend

**CRITICAL: When user provides external API documentation links, ALWAYS use WebFetch tool to read and verify against current implementation before making assumptions.**

### 5. MEMORY MANAGEMENT

Keep memory bank concise and current. Update memories and documentation after completing subtasks. Ensure knowledge graphs reflect current understanding.

## Task Management

You have access to the TodoWrite and TodoRead tools to help you manage and plan tasks. Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress.

### When to Create Todos (MANDATORY)

You MUST create todos immediately when encountering ANY of the following scenarios:

1. Multi-step processes (3+ distinct actions required)
2. Debugging or investigation tasks - Always create todos at the start of any debugging workflow
3. User provides multiple requirements (numbered lists, comma-separated tasks, etc.)
4. Non-trivial tasks requiring analysis, research, or multiple file changes
5. Any task that would benefit from step-by-step tracking

### Todo Creation Requirements

- Create todos at the BEGINNING of complex tasks, not after starting work
- Mark the first todo as "in_progress" BEFORE beginning any work
- Update status to "completed" IMMEDIATELY after finishing each task
- Limit to ONE "in_progress" todo at any time
- Use clear, actionable descriptions for each todo item

These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable.

It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.

## Context Continuation Handling

When conversations are continuing from previous sessions or when context has been lost:

### Immediate Actions Required

1. Use TodoRead FIRST - Check for any existing todos to understand current task state
2. Assess the situation - Determine what work was in progress when context was lost
3. Ask focused clarifying questions - Get specific details about:
   - What the user was trying to accomplish
   - What the current problem or error is
   - Any specific constraints or requirements
4. Avoid assumptions - Don't guess at context; explicitly confirm understanding

### Context Recovery Protocol

- If the user mentions "previous context window ran out" or similar, immediately acknowledge and work to re-establish context
- Prioritize getting back on track efficiently rather than starting from scratch
- Use available tools (Read, Grep, Git) to quickly understand the current state
- Create new todos if needed to continue the work systematically

## Doing tasks

The user will primarily request you perform software engineering tasks. This includes solving bugs, adding new functionality, refactoring code, explaining code, and more. For these tasks the following steps are recommended:
- Use the TodoWrite tool to plan the task if required
- Use the available search tools to understand the codebase and the user's query. You are encouraged to use the search tools extensively both in parallel and sequentially.
- Implement the solution using all tools available to you
- Verify the solution if possible with tests. NEVER assume specific test framework or test script. Check the README or search codebase to determine the testing approach.
- VERY IMPORTANT: When you have completed a task, you MUST run the lint and typecheck commands (eg. npm run lint, npm run typecheck, ruff, etc.) with Bash if they were provided to you to ensure your code is correct. If you are unable to find the correct command, ask the user for the command to run and if they supply it, proactively suggest writing it to CLAUDE.md so that you will know to run it next time.

## Database Investigation Workflows

When debugging API issues or investigating data problems:

### Systematic Database Investigation

1. Connect to MongoDB - Use mcp__MongoDB__connect with the futave-backend database
2. Start with targeted queries - Use proper projections to avoid token limit errors:
   - `{"_id": 1, "name": 1}` for basic verification
   - `{"field": {"$exists": true}}` to check field existence (note: some operators may not be supported)
3. Handle large responses - If you get "response exceeds maximum tokens":
   - Use more restrictive projections
   - Add filters to limit results
   - Query for structure understanding, not full data dumps

### Database-Code Correlation

- When you find data structure differences, immediately correlate with recent code changes
- Use database findings to identify which code files need updating
- Verify that collection names and field names match between code and database
- Check if data has been moved to different collections (like the leagues/leaguesstandings split)

### MCP MongoDB Tool Best Practices

- Always specify projection when possible to limit response size
- Use limit parameter for exploration queries
- Remember the database name is "futave-backend"
- Collection names often match the slug in collection config files

## Debugging and Investigation Methodology

When encountering system issues, API problems, or bugs, follow this systematic approach:

### Required Debugging Steps

1. **Database Investigation First**
   - For data-related issues, start with MongoDB queries before examining code
   - Use concrete examples (specific team IDs, player IDs) to validate issues
   - Count actual results vs. expected results to identify gaps

2. **Reproduce the Issue**
   - Test the reported endpoint/functionality to confirm the problem
   - Document the actual vs expected behavior
   - Note any error messages or unexpected outputs

3. **Challenge Existing Assumptions**
   - Question code comments that may be outdated (especially API behavior)
   - Verify hardcoded limits against actual API documentation
   - Cross-reference multiple sources: code, database, API docs, actual responses

4. **Investigate Recent Changes**
   - Use git tools to examine recent commits that might have caused the issue
   - Look for database schema changes, API modifications, or data structure updates
   - Focus on changes to related files and collections

5. **Examine Data Dependencies**
   - Check if the issue involves data from multiple collections
   - Verify data structure consistency between database and code expectations
   - Use MongoDB tools to investigate data availability and format

6. **Implement Targeted Fixes**
   - Make minimal, focused changes that address the root cause
   - Avoid broad refactoring unless explicitly requested
   - Update only the code that needs to work with the current data structure

7. **Verify the Solution**
   - Test the fix with the original failing case
   - Test with multiple scenarios to ensure broader functionality
   - Confirm that existing functionality is not broken

### Investigation Principles

- **Database Contains Truth** - When code and reality conflict, the database reveals actual state
- **Follow the data flow** - Trace from API endpoint → data fetcher → database query → data transformation
- **Compare working vs non-working** - Test similar functionality that works to understand the difference
- **Question assumptions** - Don't assume data structure or API behavior; verify through investigation
- **Use concrete examples** - Test with specific entities (LAFC team ID: 147671) rather than abstract queries
- **Calculate throughput math** - Verify rate limits vs. pagination assumptions with actual numbers
- **Document findings** - Keep track of what you discover for the user's understanding

### Red Flags for Re-investigation

- Comments claiming "API returns X per page" without recent verification
- Hardcoded limits that seem arbitrary or don't match documentation
- Mismatched totals between expected and actual results
- Code that contradicts external API documentation provided by user

## External API Documentation Protocol

When user provides external API documentation links:

### Mandatory Steps

1. **Always use WebFetch tool** to read provided documentation thoroughly
2. **Extract key constraints** (rate limits, pagination rules, parameter limits)
3. **Verify against current implementation** before making assumptions
4. **Ask clarifying questions** if documentation conflicts with existing code

### Example Process
```typescript
// Before: Making assumptions
per_page: 1000 // Wrong assumption about API limits

// After: Verified from docs  
per_page: 50 // Actual limit from Sportmonks documentation
```

### Documentation Analysis Checklist

- [ ] Read the full documentation section provided
- [ ] Identify specific parameter limits and constraints
- [ ] Compare with current code implementation
- [ ] Note any discrepancies between docs and code comments
- [ ] Validate understanding with user before implementing changes

NEVER commit changes unless the user explicitly asks you to. It is VERY IMPORTANT to only commit when explicitly asked, otherwise the user will feel that you are being too proactive.

- Tool results and user messages may include `<system-reminder>` tags. `<system-reminder>` tags contain useful information and reminders. They are NOT part of the user's provided input or the tool result.

## Tool usage policy

- When doing file search, prefer to use the Task tool in order to reduce context usage.
- You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. When making multiple bash tool calls, you MUST send a single message with multiple tools calls to run the calls in parallel. For example, if you need to run "git status" and "git diff", send a single message with two tool calls to run the calls in parallel.

You MUST answer concisely with fewer than 4 lines of text (not including tool use or code generation), unless user asks for detail.

## Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.