# FutAve - Soccer Live Scores CMS

FutAve is a soccer live scores platform powered by Payload CMS that provides real-time match data, league information, and team statistics.

## Overview

This repository contains the backend and content management system (CMS) for FutAve. It integrates with the Sportmonks API to sync soccer data and provides a robust API for multiple frontend clients.

### Key Features (WIP)

- Real-time match data and live scores
- Comprehensive league and tournament information
- Team and player statistics
- Automated data synchronization with Sportmonks API
- RESTful API endpoints for frontend consumption

## Technical Stack

- **Framework**: [Payload CMS](https://payloadcms.com/)
- **Database**: MongoDB
- **Storage**: Local disk storage
- **API Integration**: Sportmonks Soccer API
- **Language**: TypeScript

## Collections

The CMS is structured around the following main collections:

- **Leagues** - Soccer leagues and competitions
- **Matches** - Live and historical match data
- **Teams** - Team information and statistics
- **Media** - Images and media assets
- **Users** - CMS user management

## Data Synchronization

The system includes automated jobs for:
- Syncing league data
- Updating match information
- Maintaining team statistics

## API Endpoints

The CMS exposes RESTful endpoints for:
- Retrieving live match data
- Accessing league information
- Fetching team statistics
- Managing media assets

## Development

This backend system is designed to support multiple frontend clients (React Native, Next.js, etc.) while maintaining a single source of truth for soccer data.
