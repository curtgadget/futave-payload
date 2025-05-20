import { SportmonksCoach } from '../client/types'

/**
 * Transform a coach from Sportmonks API format to our database format
 * Uses the Sportmonks ID as the MongoDB _id field for better integration
 */
export function transformCoach(coach: SportmonksCoach) {
  const coachId = Number(coach.id)

  return {
    id: coachId,
    sportmonksId: coachId.toString(),
    name: coach.name || coach.display_name || '',
    firstName: coach.firstname || '',
    lastName: coach.lastname || '',
    dateOfBirth: coach.date_of_birth || null,
    gender: coach.gender || 'male',
    image: coach.image_path || '',
    country: coach.country_id ? coach.country_id : null,
    nationality: coach.nationality_id ? coach.nationality_id : null,
    teams: [],
    lastUpdated: new Date().toISOString(),
  }
}
