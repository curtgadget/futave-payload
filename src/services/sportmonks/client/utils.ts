/**
 * Creates a filter string for Sportmonks API in the format 'filterType:id1,id2,id3'
 *
 * @param filterType The type of filter to apply (e.g., 'teamStatisticDetailTypes')
 * @param ids Array of IDs to filter by
 * @returns A properly formatted filter string
 */
export function createFilterString(filterType: string, ids: (number | string)[]): string {
  if (!ids.length) {
    throw new Error('At least one ID must be provided for filtering')
  }

  return `${filterType}:${ids.join(',')}`
}

/**
 * Combines multiple filter strings into a single filter string
 *
 * @param filterStrings Array of filter strings to combine
 * @returns A combined filter string
 */
export function combineFilterStrings(filterStrings: string[]): string {
  if (!filterStrings.length) {
    throw new Error('At least one filter string must be provided')
  }

  return filterStrings.join(';')
}
