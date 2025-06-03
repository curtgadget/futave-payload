export const MetadataTypeIds = {
  WEATHER: 1,
  REFEREE: 2,
  PREFERRED_FOOT: 229,
  // Add more as needed, using the actual type_id values from your metadata-types collection
} as const

export type MetadataTypeId = (typeof MetadataTypeIds)[keyof typeof MetadataTypeIds]

export const METADATA_TYPE_INFO: Record<MetadataTypeId, { code: string; name: string }> = {
  [MetadataTypeIds.WEATHER]: { code: 'WEATHER', name: 'Weather' },
  [MetadataTypeIds.REFEREE]: { code: 'REFEREE', name: 'Referee' },
  [MetadataTypeIds.PREFERRED_FOOT]: { code: 'PREFERRED_FOOT', name: 'Preferred Foot' },
  // Add more as needed
}
