import type { CollectionConfig } from 'payload'

export const MetadataTypes: CollectionConfig = {
  slug: 'metadata-types',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    {
      name: 'parent_id',
      type: 'number',
      required: false,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
    },
    {
      name: 'developer_name',
      type: 'text',
      required: false,
    },
    {
      name: 'group',
      type: 'text',
      required: false,
    },
    {
      name: 'description',
      type: 'text',
      required: false,
    },
  ],
}
