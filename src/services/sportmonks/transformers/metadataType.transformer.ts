import { SportmonksMetadataType } from '../client/types'

export function transformMetadataType(type: SportmonksMetadataType) {
  return {
    id: type.id,
    parent_id: type.parent_id,
    name: type.name,
    code: type.code,
    developer_name: type.developer_name,
    group: type.group,
    description: type.description,
  }
}
