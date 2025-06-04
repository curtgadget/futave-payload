import { getPayload } from 'payload'
import config from '../src/payload.config'

async function checkMetadataTypes() {
  const payload = await getPayload({ config })

  try {
    // Find metadata types related to appearances/games
    const metadataTypes = await payload.find({
      collection: 'metadataTypes',
      where: {
        or: [
          { name: { contains: 'appearance' } },
          { name: { contains: 'game' } },
          { name: { contains: 'start' } },
          { name: { contains: 'substitute' } },
          { name: { contains: 'match' } }
        ]
      },
      limit: 50
    })

    console.log('=== Appearance/Game Related Metadata Types ===')
    metadataTypes.docs.forEach((type: any) => {
      console.log(`ID: ${type.id} - Name: "${type.name}" - Model: ${type.model_type}`)
    })

    // Look specifically for type 322
    const type322 = await payload.db.findOne({
      collection: 'metadataTypes',
      where: { id: { equals: 322 } }
    })

    if (type322) {
      console.log('\n=== Type 322 Details ===')
      console.log(`ID: ${type322.id}`)
      console.log(`Name: "${type322.name}"`)
      console.log(`Model Type: ${type322.model_type}`)
      console.log(`Description: ${type322.description || 'No description'}`)
    } else {
      console.log('\nType 322 not found')
    }

    // Look for types in the 320-330 range
    const rangeTypes = await payload.find({
      collection: 'metadataTypes',
      where: {
        id: { 
          greater_than_equal: 320,
          less_than_equal: 330
        }
      },
      limit: 20
    })

    console.log('\n=== Types 320-330 Range ===')
    rangeTypes.docs.forEach((type: any) => {
      console.log(`ID: ${type.id} - Name: "${type.name}" - Model: ${type.model_type}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

checkMetadataTypes()