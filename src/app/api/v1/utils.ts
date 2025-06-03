// Check if validateTeamId function exists in this file

// If not, let's add it
export function validateTeamId(teamId: string): number {
  const numericId = parseInt(teamId, 10)
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error('Invalid team ID format')
  }
  return numericId
}

/**
 * Convert centimeters to feet and inches
 * @param cm Height in centimeters
 * @returns Formatted string like "6'1""
 */
export function convertCmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const exactRemainingInches = totalInches - (feet * 12)
  
  // Round to nearest whole inch, but if it's very close to the next foot, 
  // be more conservative to avoid over-rounding
  let remainingInches = Math.round(exactRemainingInches)
  
  // If rounding would make it 12 inches, check if it's closer to 11 or 12
  if (remainingInches >= 12) {
    // If it's 11.5 or higher, round up to next foot
    if (exactRemainingInches >= 11.5) {
      return `${feet + 1}'0"`
    } else {
      // Otherwise, keep it as 11 inches in current foot
      remainingInches = 11
    }
  }
  
  return `${feet}'${remainingInches}"`
}

/**
 * Convert kilograms to pounds
 * @param kg Weight in kilograms
 * @returns Formatted string like "176 lbs"
 */
export function convertKgToPounds(kg: number): string {
  const pounds = Math.round(kg * 2.20462)
  return `${pounds} lbs`
}
