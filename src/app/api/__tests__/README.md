# Featured Leagues API Test Suite

This directory contains unit tests for the featured leagues management system and related functionality.

## Test Files

### Core Logic Tests
- `featured-leagues-simple.test.ts` - Tests for priority calculation, league sorting, URL building, and error handling
- `list-leagues-simple.test.ts` - Tests for league listing, URL parsing, data transformation, and search functionality

### Integration Tests
- `v1/__tests__/integration/league-prioritization.test.ts` - Comprehensive integration tests for the league prioritization system

## Test Coverage

### Featured Leagues Core Logic (13 tests)
✅ **Priority Score Calculation**
- Correct scores for different league types (featured/non-featured, different tiers)
- Priority calculation with missing/invalid fields
- Featured leagues always prioritized over non-featured

✅ **League Sorting**  
- Correct sorting by priority score
- Featured leagues grouped before non-featured
- Tiebreaker handling when scores are equal

✅ **URL Building Logic**
- Pagination URLs with filters preserved
- Default parameter handling
- Empty filter scenarios

✅ **Featured League Filtering**
- Correct identification of featured leagues
- Match count calculations per league

✅ **Error Handling**
- Invalid tier values
- Null/undefined field handling

### List Leagues Core Logic (22 tests)
✅ **URL Parameter Parsing**
- Limit and search parameter extraction
- Default value handling
- Invalid parameter graceful handling

✅ **League Data Transformation**
- MongoDB `_id` to API `id` mapping
- Default value assignment for missing fields
- Null/undefined value handling

✅ **Response Structure**
- Correct API response format
- Empty results handling
- Debug information inclusion

✅ **Search Query Building**
- Search term processing and validation
- Whitespace handling and trimming
- Empty/invalid search handling

✅ **Limit Validation**
- Numeric string parsing
- Invalid input fallback to defaults
- Edge cases (zero, negative numbers)

### League Prioritization Integration (14 tests)
✅ **Priority Score Calculation**
- Real-world league configurations
- All tier and featured combinations
- Edge cases and missing data

✅ **League Sorting Order**
- Complete sorting algorithm validation
- Featured league grouping verification
- Priority-based ordering within groups

✅ **Featured Leagues Filtering**
- Featured league identification
- Priority-based sorting within featured group

✅ **Edge Cases**
- Missing/invalid tier handling
- Missing priority handling
- Completely empty league objects

✅ **Real-world Scenarios**
- Major European leagues prioritization
- International competitions handling
- Complex multi-tier scenarios

## Running Tests

```bash
# Run all featured leagues tests
npm test -- --testPathPattern="(featured-leagues|league-prioritization|list-leagues)"

# Run specific test files
npm test featured-leagues-simple.test.ts
npm test list-leagues-simple.test.ts
npm test league-prioritization.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern="featured-leagues"
```

## Test Design Philosophy

These tests focus on **core business logic** rather than complex mocking:

- ✅ **Unit tests** for pure functions and business logic
- ✅ **Integration tests** for complete workflow validation  
- ✅ **Simple, readable test cases** that document expected behavior
- ✅ **Edge case coverage** for robust error handling
- ❌ Avoided complex mocking that's brittle and hard to maintain

This approach provides confidence in the core functionality while remaining maintainable and easy to understand.