# FutAve - Soccer Live Scores CMS

FutAve is a soccer live scores platform powered by Payload CMS that provides real-time match data, league information, team statistics, and intelligent match discovery through the Wave Detector algorithm.

## Overview

This repository contains the backend and content management system (CMS) for FutAve. It integrates with the Sportmonks API to sync soccer data and provides a robust API for multiple frontend clients.

### Key Features

- **Wave Detector Algorithm** - 6-factor excitement scoring for intelligent match discovery
- **Smart Match Sorting** - Combines league priority with wave scores for optimal UX
- **Real-time match data and live scores** with comprehensive lineup information
- **Dynamic league standings** calculated from match results with performance caching
- **Sidelined players tracking** including injury details and expected return dates
- **Comprehensive player profiles** with career history, transfer details, and achievements
- **League and tournament information** with detailed statistics and standings
- **Team statistics and squad management** with formation and tactical data
- **Automated data synchronization** with Sportmonks API and wave score calculation
- **RESTful API endpoints** optimized for multiple frontend clients
- **Robust job queue system** for reliable data processing

## Technical Stack

- **Framework**: Next.js with Payload CMS
- **Database**: MongoDB
- **Storage**: Payload Cloud
- **API Integration**: Sportmonks Soccer API
- **Language**: TypeScript

## Collections

The CMS is structured around the following main collections:

- **Leagues** - Soccer leagues and competitions with cached standings
- **Matches** - Live and historical match data with Wave Detector scoring
- **Teams** - Team information, statistics, and standings
- **Players** - Player information and statistics
- **Coaches** - Coach information
- **Countries** - Country information for teams and leagues
- **Rivals** - Team rivalry data for enhanced wave calculations
- **MetadataTypes** - Supporting metadata for other collections
- **Media** - Images and media assets
- **Users** - CMS user management

## Data Synchronization

The system includes automated jobs for:
- Syncing league data with priority configuration
- Updating match information with Wave Detector scoring
- Calculating dynamic league standings with caching
- Maintaining team statistics and standings
- Syncing player information
- Syncing coach information
- Updating country data and rivalry information
- Managing metadata types

## API Endpoints

The CMS exposes RESTful endpoints for:
- **Smart match discovery** with Wave Detector integration (`/api/v1/matches`)
- **Wave-specific endpoints** for excitement-based filtering (`/api/v1/matches/waves`)
- Retrieving live match data with intelligent sorting
- Accessing league information with dynamic standings
- Fetching team statistics and standings
- Accessing player information
- Managing media assets
Additionally, there are specific endpoints for managing data synchronization queues (e.g., `/api/queue-jobs/sync`, `/api/queue-jobs/preview`) and a versioned API (e.g., `/api/v1/...`) for broader data access.

## Environment Variables

Before running the application, create a `.env` file in the root directory with the following required variables:

```env
# Required
DATABASE_URI=mongodb://localhost:27017/futave
PAYLOAD_SECRET=your-payload-secret-key-here
SPORTMONKS_API_KEY=your-sportmonks-api-key-here

# Optional (handled automatically by Next.js/deployment platforms)
NEXT_RUNTIME=nodejs
CI=false
FORCE_AUTH=true
```

### Variable Descriptions

- `DATABASE_URI` - MongoDB connection string. For local development with Docker: `mongodb://mongo:27017/futave`
- `PAYLOAD_SECRET` - A secure secret key for Payload CMS authentication and encryption
- `SPORTMONKS_API_KEY` - Your API key from [Sportmonks](https://sportmonks.com/) for fetching soccer data
- `NEXT_RUNTIME` - Next.js runtime environment (automatically set by Next.js)
- `CI` - Continuous Integration flag (automatically set by CI/CD platforms)
- `FORCE_AUTH` - Set to `true` to test API key authentication in development mode

## API Authentication

The API endpoints under `/api/v1/` require API key authentication in production.

### Setting up API Keys

1. **Access the admin panel**: Navigate to `http://localhost:3000/admin` (or your deployment URL)
2. **Create or edit a user**: Go to the Users collection
3. **Enable API Key**: Check the "Enable API Key" option in the user form
4. **Copy the generated key**: Payload will generate a unique API key for that user

### Using API Keys

Include the API key in the Authorization header:

```bash
curl -H "Authorization: API-Key your-generated-key-here" \
     http://localhost:3000/api/v1/leagues
```

### Development vs Production

- **Development mode**: API key authentication is bypassed by default (when `NODE_ENV=development`)
- **Test authentication locally**: Set `FORCE_AUTH=true` in your `.env` file to test API key authentication in development
- **Production**: API key authentication is always enforced

## Recent Updates

### January 2025
- ✅ **Wave Detector System**: Complete 6-factor excitement scoring algorithm implementation
- ✅ **Smart Sorting**: Intelligent match ordering combining league priority with wave scores
- ✅ **Dynamic Standings**: Real-time league table calculation with performance caching
- ✅ **Enhanced Match Sync**: Automatic wave score calculation during data synchronization
- ✅ **Smart Discovery UX**: Balanced approach between user preferences and exciting match discovery
- ✅ **Rivals Collection**: Team rivalry data integration for enhanced wave calculations
- ✅ **Production Scripts**: Batch processing tools for wave score calculation and testing
- ✅ **Sidelined Players**: Added comprehensive injury tracking to match lineups
- ✅ **Enhanced Player API**: Career history, transfer details, and achievements
- ✅ **Match API Improvements**: Fixed stability issues and enhanced data structure
- ✅ **Comprehensive Testing**: Added full test coverage for player endpoints
- ✅ **Database Optimization**: Improved performance for player-related queries

### API Documentation
For complete API documentation including request/response examples, see:
- [API Route Map](src/app/api/v1/documentation/api-route-map.md) - Complete endpoint documentation with Wave Detector integration
- [Smart Sorting API](docs/smart-sorting-api.md) - Wave score integration and intelligent match discovery
- [Sportmonks Sync Map](src/app/api/v1/documentation/sportmonks-sync-map.md) - Data synchronization details

## Development

This backend system is designed to support multiple frontend clients (React Native, Next.js, etc.) while maintaining a single source of truth for soccer data.
