# Sportmonks API Filtering

This document explains how to use the filtering capabilities in our Sportmonks client implementation.

## Basic Filtering

The Sportmonks API supports two types of filtering:

1. **Key-Value Filtering**: Simple filtering using key-value pairs (e.g., `league_id: 1`)
2. **String-Based Filtering**: Advanced filtering using the format `filterType:id1,id2,id3`

## Using Key-Value Filters

Key-value filters can be used directly in the `filters` parameter:

```typescript
const teamsInLeague = await teamsEndpoint.getAll({
  filters: {
    league_id: 1
  }
});
```

## Using String-Based Filters

String-based filters can be created and used with our utility functions:

```typescript
import { createFilterString } from '../services/sportmonks/client/utils';
import { TeamStatisticTypeIds } from '../services/sportmonks/client/constants';

// Create a filter string using constants
const filter = createFilterString('teamStatisticDetailTypes', [
  TeamStatisticTypeIds.WINS,
  TeamStatisticTypeIds.DRAWS,
  TeamStatisticTypeIds.LOSSES
]);

// Use the filter
const teams = await teamsEndpoint.getWithFilter(filter);
```

## Team Statistic Type Constants

We've defined constants for commonly used team statistic types:

```typescript
// Available constants
TeamStatisticTypeIds.CLEAN_SHEETS  // 194
TeamStatisticTypeIds.WINS          // 214
TeamStatisticTypeIds.DRAWS         // 215
TeamStatisticTypeIds.LOSSES        // 216
TeamStatisticTypeIds.GOALS_FOR     // 52
TeamStatisticTypeIds.GOALS_AGAINST // 88
TeamStatisticTypeIds.RED_CARDS     // 83
TeamStatisticTypeIds.YELLOW_CARDS  // 84

// All constants as an array
ALL_TEAM_STATISTIC_TYPE_IDS
```

## Combining Multiple Filters

To combine multiple string-based filters, use the `combineFilterStrings` utility:

```typescript
import { createFilterString, combineFilterStrings } from '../services/sportmonks/client/utils';
import { TeamStatisticTypeIds } from '../services/sportmonks/client/constants';

const statsFilter = createFilterString('teamStatisticDetailTypes', [
  TeamStatisticTypeIds.GOALS_FOR,
  TeamStatisticTypeIds.GOALS_AGAINST
]);
const leagueFilter = createFilterString('league_id', [1]);

const combinedFilter = combineFilterStrings([statsFilter, leagueFilter]);

const teams = await teamsEndpoint.getWithFilter(combinedFilter);
```

## Predefined Filter Methods

We've added predefined methods for common filtering operations:

```typescript
// Get teams with specific statistic types (using constants)
const teams = await teamsEndpoint.getByStatisticTypes([
  TeamStatisticTypeIds.WINS,
  TeamStatisticTypeIds.DRAWS
]);

// Get teams with wins, draws, and losses statistics
const wdlTeams = await teamsEndpoint.getByWinsDrawsLosses();

// Get teams with goals for and goals against statistics
const goalTeams = await teamsEndpoint.getByGoalStats();

// Get teams with red and yellow card statistics
const cardTeams = await teamsEndpoint.getByCardStats();

// Get teams with all defined statistics
const allStatsTeams = await teamsEndpoint.getByAllStats();
```

## Example Usage

See the complete example in `src/examples/teamFiltering.ts`.
