# Automated Data Validation

Automated validation system that runs after sync jobs to ensure data quality and identify discrepancies between local database and Sportmonks API.

## Overview

After implementing Option 2 (debug comparison endpoint), this system implements **Option 3**: Automated validation that runs automatically after sync jobs complete. It helps maintain data quality by continuously monitoring synchronization accuracy.

## Features

- ✅ **Post-Sync Validation**: Automatically validates data after `syncTeams` and `syncPlayers` jobs
- ✅ **Validation Results Storage**: All validation results stored in MongoDB for historical tracking
- ✅ **Validation History API**: Query and analyze validation trends over time
- ✅ **Smart Sampling**: Validates a sample of recently updated teams to avoid long execution times
- ✅ **Discrepancy Detection**: Identifies missing or outdated data
- ✅ **Sync Recommendations**: Provides actionable recommendations to fix issues

## Architecture

```
┌─────────────────┐
│   Sync Job      │
│  (syncTeams)    │
└────────┬────────┘
         │
         ├─ Sync completes successfully
         │
         v
┌─────────────────┐
│  Validation     │
│   Service       │
└────────┬────────┘
         │
         ├─ Compare local vs Sportmonks
         │
         v
┌─────────────────┐
│  Store Result   │
│  (MongoDB)      │
└─────────────────┘
```

## Configuration

### Enable Automated Validation

Add to your `.env` file:

```bash
ENABLE_AUTO_VALIDATION=true
```

**Default**: `false` (disabled)

### How It Works

1. **Sync Job Completes**: When `syncTeams` or `syncPlayers` finishes successfully
2. **Sample Selection**: System selects recently updated teams for validation
   - `syncTeams`: Validates 5 teams for standings accuracy
   - `syncPlayers`: Validates 3 teams for player statistics (only when sync is complete)
3. **Validation Runs**: Compares local data against Sportmonks API
4. **Results Stored**: Validation results saved to `validation-results` collection
5. **Logging**: Success/failure logged in Payload logs

## Validation History API

### GET /api/v1/debug/validations

View and analyze validation history.

**Query Parameters:**
- `jobType`: Filter by job type (`syncTeams`, `syncPlayers`, `manual`)
- `status`: Filter by status (`pass`, `fail`, `error`)
- `teamId`: Filter by specific team ID
- `entity`: Filter by entity type (`fixtures`, `teams`, `players`, `standings`, `playerstats`)
- `limit`: Results per page (default: 20)
- `page`: Page number (default: 1)

**Example Requests:**

```bash
# Get all validation results
GET /api/v1/debug/validations

# Get failed validations only
GET /api/v1/debug/validations?status=fail

# Get validations for syncTeams jobs
GET /api/v1/debug/validations?jobType=syncTeams

# Get validations for specific team
GET /api/v1/debug/validations?teamId=147671

# Get player stats validations
GET /api/v1/debug/validations?entity=playerstats&limit=10
```

**Response:**

```json
{
  "validations": [
    {
      "id": "abc123",
      "jobType": "syncTeams",
      "teamId": 147671,
      "teamName": "Los Angeles FC",
      "entity": "standings",
      "status": "fail",
      "totalDiscrepancies": 2,
      "comparisonSummary": {
        "totalSeasons": 2,
        "matching": 0,
        "mismatched": 2
      },
      "syncRecommendations": [
        {
          "job": "syncTeams",
          "reason": "2 season(s) have mismatched standings data",
          "command": "GET /api/queue-jobs/sync (includes syncTeams)"
        }
      ],
      "executionTime": 1250,
      "createdAt": "2025-01-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalDocs": 95,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "summary": {
    "total": 95,
    "byStatus": {
      "pass": 70,
      "fail": 20,
      "error": 5
    },
    "byJobType": {
      "syncTeams": 50,
      "syncPlayers": 40,
      "manual": 5
    },
    "recentFailures": [
      {
        "id": "abc123",
        "jobType": "syncTeams",
        "teamName": "Los Angeles FC",
        "entity": "standings",
        "totalDiscrepancies": 2,
        "createdAt": "2025-01-20T10:30:00Z"
      }
    ]
  },
  "filters": {
    "jobType": "all",
    "status": "all",
    "teamId": "all",
    "entity": "all"
  }
}
```

## Validation Results Collection

All validation results are stored in the `validation-results` collection with the following fields:

- `jobType`: Type of sync job that triggered validation
- `teamId`: Team that was validated
- `teamName`: Team name
- `entity`: Type of data validated (fixtures, teams, players, standings, playerstats)
- `status`: Validation result (pass, fail, error)
- `totalDiscrepancies`: Number of discrepancies found
- `comparisonSummary`: Summary of comparison results
- `discrepancies`: Detailed discrepancy data (when applicable)
- `syncRecommendations`: Recommended actions to fix issues
- `error`: Error message if validation failed
- `executionTime`: How long validation took (ms)
- `createdAt`: When validation was performed

## Use Cases

### 1. Post-Sync Monitoring

After running sync jobs, check if validation passed:

```bash
# Get latest validations
GET /api/v1/debug/validations?limit=5

# Check if recent syncTeams passed
GET /api/v1/debug/validations?jobType=syncTeams&status=fail&limit=1
```

### 2. Data Quality Trends

Analyze validation success rate over time:

```bash
# Get all validations for the past week
GET /api/v1/debug/validations?limit=100

# Analyze summary.byStatus to see pass/fail rate
```

### 3. Team-Specific Issues

Investigate persistent issues for a specific team:

```bash
# Get all validation failures for LAFC
GET /api/v1/debug/validations?teamId=147671&status=fail
```

### 4. Identify Sync Gaps

Find which entity types have the most issues:

```bash
# Get failed player stats validations
GET /api/v1/debug/validations?entity=playerstats&status=fail&limit=20
```

## Manual Validation

You can still trigger manual validations using the comparison endpoint:

```bash
# Manual validation (not triggered by sync job)
GET /api/v1/debug/compare?teamId=147671&entity=playerstats
```

Manual validations won't be stored in `validation-results` unless you implement a wrapper to save them.

## Best Practices

1. **Enable in Production**: Turn on `ENABLE_AUTO_VALIDATION=true` to continuously monitor data quality
2. **Review Failures**: Regularly check `/api/v1/debug/validations?status=fail` for issues
3. **Act on Recommendations**: Follow `syncRecommendations` to fix discrepancies
4. **Monitor Trends**: Track validation success rate to identify systematic issues
5. **Sample Size**: Current defaults (5 teams for syncTeams, 3 for syncPlayers) balance coverage with performance

## Performance Considerations

- **Validation Time**: Each validation takes ~1-3 seconds depending on entity type
- **Sample Size**: Limited to avoid long job execution times
- **Rate Limits**: Validations make Sportmonks API calls, factor into rate limits
- **Async Execution**: Validations run after sync completes, don't block sync jobs
- **Error Handling**: Validation failures don't affect sync job success status

## Future Enhancements

Potential improvements for automated validation:

- **Webhook Notifications**: Send alerts when validation fails
- **Scheduled Validations**: Run validations on a cron schedule independent of syncs
- **Full Coverage**: Validate all teams instead of samples (optional flag)
- **Trend Analysis**: Dashboard showing validation trends over time
- **Auto-Remediation**: Automatically trigger sync jobs when validation fails
- **Custom Thresholds**: Configure acceptable discrepancy levels

## Related Documentation

- [Debug Comparison API](../src/app/api/v1/documentation/api-route-map.md#debug--testing-endpoints)
- [Sync Jobs Documentation](../README.md#data-synchronization)
- [MongoDB Collections](../src/collections/ValidationResults.ts)
