# FutAve - Soccer Live Scores CMS

FutAve is a soccer live scores platform powered by Payload CMS that provides real-time match data, league information, team statistics, and standings.

## Overview

This repository contains the backend and content management system (CMS) for FutAve. It integrates with the Sportmonks API to sync soccer data and provides a robust API for multiple frontend clients.

### Key Features

- Real-time match data and live scores
- Comprehensive league and tournament information
- Team and player statistics
- League standings and team rankings
- Automated data synchronization with Sportmonks API
- RESTful API endpoints for frontend consumption

## Technical Stack

- **Framework**: Next.js with Payload CMS
- **Database**: MongoDB
- **Storage**: Payload Cloud
- **API Integration**: Sportmonks Soccer API
- **Language**: TypeScript

## Collections

The CMS is structured around the following main collections:

- **Leagues** - Soccer leagues and competitions
- **Matches** - Live and historical match data
- **Teams** - Team information, statistics, and standings
- **Players** - Player information and statistics
- **Coaches** - Coach information
- **Countries** - Country information for teams and leagues
- **MetadataTypes** - Supporting metadata for other collections
- **Media** - Images and media assets
- **Users** - CMS user management

## Data Synchronization

The system includes automated jobs for:
- Syncing league data
- Updating match information
- Maintaining team statistics and standings
- Syncing player information
- Syncing coach information
- Updating country data
- Managing metadata types

## API Endpoints

The CMS exposes RESTful endpoints for:
- Retrieving live match data
- Accessing league information
- Fetching team statistics and standings
- Accessing player information
- Managing media assets
Additionally, there are specific endpoints for managing data synchronization queues (e.g., `/api/queue-jobs/sync`, `/api/queue-jobs/preview`) and a versioned API (e.g., `/api/v1/...`) for broader data access.

## Development

This backend system is designed to support multiple frontend clients (React Native, Next.js, etc.) while maintaining a single source of truth for soccer data.
