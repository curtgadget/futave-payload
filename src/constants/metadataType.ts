export const MetadataTypeIds = {
  WEATHER: 1,
  REFEREE: 2,
  PREFERRED_FOOT: 229,
  // Add more as needed, using the actual type_id values from your metadata-types collection
} as const

// Player Statistics Type IDs (for use in player statistics details)
export const PlayerStatTypeIds = {
  GOALS: 52,
  ASSISTS: 79,
  RED_CARDS: 83,
  YELLOW_CARDS: 84,
  MINUTES_PLAYED: 119,
  APPEARANCES: 321,      // Total appearances (starts + substitutions)
  LINEUPS: 322,          // Games started in starting lineup
  BENCH: 323,            // Times on bench
  // Add more as needed
} as const

export type MetadataTypeId = (typeof MetadataTypeIds)[keyof typeof MetadataTypeIds]

export const METADATA_TYPE_INFO: Record<MetadataTypeId, { code: string; name: string }> = {
  [MetadataTypeIds.WEATHER]: { code: 'WEATHER', name: 'Weather' },
  [MetadataTypeIds.REFEREE]: { code: 'REFEREE', name: 'Referee' },
  [MetadataTypeIds.PREFERRED_FOOT]: { code: 'PREFERRED_FOOT', name: 'Preferred Foot' },
  // Add more as needed
}
