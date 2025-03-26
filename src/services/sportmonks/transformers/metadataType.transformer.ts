import { SportmonksMetadataType } from '../client/types'

export type TransformedMetadataType = {
  id: number
  parent_id: number | null
  name: string
  code: string
  developer_name: string | null
  group: string | null
  description: string | null
}

export function transformMetadataType(type: SportmonksMetadataType): TransformedMetadataType {
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
