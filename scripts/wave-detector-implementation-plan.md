# Wave Detector Implementation Plan

## Overview
The Wave Detector feature identifies high-significance matches based on rivalry data, league standings, team form, and historical head-to-head records. This document captures all implementation details and decisions from our planning session.

## Completed Work

### 1. Rivals Data Sync ✅
- Added rival_team_id field to properly capture Sportmonks' rival_id
- Created comprehensive test coverage for rival transformer
- Implemented rivals sync in nightly queue

### 2. Head-to-Head Integration ✅
- Created H2H endpoint client (`headToHead.ts`)
- Added H2H summary fields to Rivals collection:
  - total_matches, last_5 record, overall record
  - last_meeting details (date, result, score, venue)
  - drama_score (0-10 based on competitiveness)
  - avg_goals_per_match
- Implemented H2H calculator with drama score algorithm
- Enhanced rivals sync to fetch and store H2H data

### 3. Performance Optimizations ✅
- Parallel H2H API calls (10 concurrent)
- Skip H2H fetch for recently updated rivals (7-day default)
- Progress tracking during sync
- Two-phase processing (fetch then update)

### 4. Bug Fixes ✅
- Fixed avg_goals_per_match always returning 2.5
- Prevented empty h2h_summary objects from being stored
- Improved score extraction from match data

## Next Implementation Steps

### Phase 1: Wave Score Calculation Engine

#### 1.1 Add Wave Score Fields to Matches Collection
```typescript
// In Matches collection
{
  wave_score: {
    type: 'group',
    fields: [
      { name: 'total', type: 'number' }, // 0-100
      { name: 'tier', type: 'text' }, // 'S', 'A', 'B', 'C'
      { name: 'factors', type: 'group', fields: [
        { name: 'rivalry', type: 'number' }, // 0-30
        { name: 'position', type: 'number' }, // 0-20
        { name: 'zone', type: 'number' }, // 0-20
        { name: 'form', type: 'number' }, // 0-15
        { name: 'h2h', type: 'number' }, // 0-10
        { name: 'timing', type: 'number' }, // 0-5
      ]},
      { name: 'calculated_at', type: 'date' },
      { name: 'expires_at', type: 'date' },
    ]
  }
}
```

#### 1.2 Create Wave Score Calculator Service
```typescript
// services/waveDetector/calculator.ts
interface WaveScoreCalculator {
  calculatePreMatchScore(match, homeTeam, awayTeam): Promise<WaveScore>
  getFactorBreakdown(match, homeTeam, awayTeam): WaveFactors
  determineTier(totalScore: number): 'S' | 'A' | 'B' | 'C'
}
```

#### 1.3 Wave Score Factors Implementation
- **Rivalry Score (0-30)**: Check rivals collection for team pairing
- **Position Proximity (0-20)**: Calculate standings gap between teams
- **Zone Importance (0-20)**: Detect relegation/title/europe zones
- **Form Differential (0-15)**: Compare recent form (already in team data)
- **H2H Drama (0-10)**: Use drama_score from rivals H2H data
- **Timing Bonus (0-5)**: Late season, crucial timing

### Phase 2: Wave Score Integration

#### 2.1 Add Wave Calculation to Match Sync
- Calculate wave scores during match sync
- Only for matches in next 7-14 days
- Store in match document

#### 2.2 Create Wave Detection API Endpoints
```typescript
// GET /api/v1/matches/waves
// Query params: date, league_id, min_score
// Returns matches sorted by wave score

// GET /api/v1/matches/{id}/wave-score
// Returns detailed wave score breakdown
```

#### 2.3 Implement Recalculation Strategy
- Recalculate every 6 hours for upcoming matches
- Trigger recalc when standings change significantly
- Expire scores after match starts

### Phase 3: Advanced Features

#### 3.1 H2H Cache Collection (Optional)
```typescript
// If API calls still too slow
{
  slug: 'h2h-cache',
  fields: [
    { name: 'pair_key', type: 'text', unique: true },
    { name: 'data', type: 'json' },
    { name: 'expires_at', type: 'date' },
  ]
}
```

#### 3.2 Live Wave Detection (Future)
- Monitor in-match events
- Adjust wave scores based on:
  - Current score
  - Red cards
  - Late goals
  - Concurrent match implications

#### 3.3 Machine Learning Enhancement (Future)
- Track actual match excitement vs predicted
- Adjust weights based on historical accuracy
- Seasonal factor adjustments

## Technical Decisions

### Data Architecture
1. **Colocated H2H with Rivals**: Keeps rivalry data together
2. **Wave Scores in Matches**: Natural location for match metadata
3. **No separate Wave collection**: Avoid data duplication

### Performance Strategy
1. **Pre-calculate during sync**: Better than on-demand
2. **Cache for 6 hours**: Balance freshness vs API load
3. **Parallel processing**: 10x speed improvement

### API Design
1. **Dedicated waves endpoint**: Easy to consume
2. **Include in match responses**: Via field selection
3. **Detailed breakdown available**: For transparency

## Edge Cases to Handle

1. **New Teams**: No H2H history (use league average)
2. **Cross-League Matches**: Cup competitions
3. **Postponed Matches**: Clear expired scores
4. **Mid-Season Joins**: Teams with fewer matches
5. **Playoff Systems**: Different zone calculations

## Success Metrics

1. **Performance**: Wave calculation < 100ms per match
2. **Accuracy**: Track user engagement with high-wave matches
3. **Coverage**: 95%+ of matches have wave scores
4. **Freshness**: Scores updated within 6 hours of changes

## Implementation Priority

1. **High Priority**
   - Wave score calculator
   - Match collection fields
   - Basic API endpoint

2. **Medium Priority**
   - Automated recalculation
   - Performance monitoring
   - Admin UI for wave scores

3. **Low Priority**
   - ML enhancements
   - Live adjustments
   - Historical analysis tools

## Notes from Discussion

- Start with pre-match scores only (simpler)
- Use existing form/standings data (no new syncs needed)
- H2H data now available for all rivals
- Consider separating H2H sync from rivals sync for performance
- Wave scores expire at match start time
- Tier system: S (80-100), A (60-79), B (40-59), C (0-39)

## Next Session Action Items

1. Implement wave score fields in Matches collection
2. Create basic wave calculator with all factors
3. Add wave calculation to match sync process
4. Create /api/v1/matches/waves endpoint
5. Test with real data and adjust weights

---
*Last Updated: [Current Date]*
*This document should be updated as implementation progresses*