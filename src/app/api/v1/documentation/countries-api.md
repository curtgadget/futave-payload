# Countries API Documentation

## Overview
The Countries API provides endpoints for retrieving country information including names, ISO codes, continents, and flag images.

## Endpoints

### List Countries
`GET /api/v1/countries`

Returns a paginated list of countries with optional filtering and search capabilities.

#### Query Parameters
- `page` (number, optional): Page number for pagination. Default: 1
- `limit` (number, optional): Number of items per page. Max: 100, Default: 50
- `search` (string, optional): Search term to filter countries by name, official name, FIFA name, or ISO codes
- `continent_id` or `continentId` (number, optional): Filter by continent ID
- `sort` (string, optional): Sort order. Options: `name` (ascending), `-name` (descending). Default: `name`

#### Response
```json
{
  "countries": [
    {
      "id": 32,
      "name": "Spain",
      "official_name": "Kingdom of Spain",
      "fifa_name": "ESP",
      "iso2": "ES",
      "iso3": "ESP",
      "continent_id": 1,
      "flag_url": "https://cdn.sportmonks.com/images/countries/png/short/es.png",
      "coordinates": {
        "latitude": "40.396026611328125",
        "longitude": "-3.550692558288574"
      },
      "borders": []
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 242,
    "total_pages": 5,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

#### Example Requests
```bash
# Get all countries (first page)
GET /api/v1/countries

# Search for countries with "united" in the name
GET /api/v1/countries?search=united

# Get European countries (continent_id: 1)
GET /api/v1/countries?continent_id=1

# Get countries sorted by name descending
GET /api/v1/countries?sort=-name

# Pagination example
GET /api/v1/countries?page=2&limit=25
```

### Get Country Details
`GET /api/v1/countries/:identifier`

Returns detailed information about a specific country.

#### Parameters
- `identifier`: Can be:
  - Country ID (number)
  - ISO2 code (2-letter country code, e.g., "ES")
  - ISO3 code (3-letter country code, e.g., "ESP")

#### Response
```json
{
  "id": 32,
  "name": "Spain",
  "official_name": "Kingdom of Spain",
  "fifa_name": "ESP",
  "iso2": "ES",
  "iso3": "ESP",
  "continent_id": 1,
  "flag_url": "https://cdn.sportmonks.com/images/countries/png/short/es.png",
  "coordinates": {
    "latitude": "40.396026611328125",
    "longitude": "-3.550692558288574"
  },
  "borders": []
}
```

#### Example Requests
```bash
# Get country by ID
GET /api/v1/countries/32

# Get country by ISO2 code
GET /api/v1/countries/ES

# Get country by ISO3 code
GET /api/v1/countries/ESP
```

## Response Fields

### Country Object
- `id` (number): Unique country identifier
- `name` (string): Common country name
- `official_name` (string | null): Official country name
- `fifa_name` (string | null): FIFA country code/name
- `iso2` (string | null): 2-letter ISO country code
- `iso3` (string | null): 3-letter ISO country code
- `continent_id` (number): Continent identifier
- `flag_url` (string | null): URL to country flag image
- `coordinates` (object | null): Geographic coordinates
  - `latitude` (string): Latitude coordinate
  - `longitude` (string): Longitude coordinate
- `borders` (array): Array of bordering country codes (currently not populated)

### Pagination Object
- `current_page` (number): Current page number
- `per_page` (number): Items per page
- `total` (number): Total number of items
- `total_pages` (number): Total number of pages
- `has_next_page` (boolean): Whether there is a next page
- `has_prev_page` (boolean): Whether there is a previous page

## Error Responses

### 400 Bad Request
- Invalid request URL
- Missing required identifier for detail endpoint

### 404 Not Found
- Country not found (detail endpoint)

### 500 Internal Server Error
- Database or server errors

## Caching
Both endpoints include cache headers (`Cache-Control: public, max-age=3600, s-maxage=3600`) since country data is relatively static.

## Notes
- The search functionality searches across multiple fields: name, official_name, fifa_name, iso2, and iso3
- Some countries may have null values for certain fields (e.g., coordinates, official_name)
- Special cases like UK countries (England, Scotland, Wales, Northern Ireland) may share the same ISO2 code but have different ISO3 codes
- The continent_id field can be used to group countries by geographic region