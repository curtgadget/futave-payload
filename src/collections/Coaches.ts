import type { CollectionConfig } from 'payload'

export const Coaches: CollectionConfig = {
  slug: 'coaches',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'dateOfBirth', 'lastUpdated'],
    group: 'Sport Data',
  },
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
      unique: true,
    },
    {
      name: 'sportmonksId',
      type: 'text',
      required: true,
      admin: {
        description: 'Unique ID from Sportmonks',
      },
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'dateOfBirth',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
      },
    },
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ],
      defaultValue: 'male',
    },
    {
      name: 'image',
      type: 'text',
      admin: {
        description: 'Image URL from Sportmonks',
      },
    },
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      hasMany: false,
    },
    {
      name: 'nationality',
      type: 'relationship',
      relationTo: 'countries',
      hasMany: false,
    },
    {
      name: 'teams',
      type: 'array',
      admin: {
        description: 'Teams this coach has managed',
      },
      fields: [
        {
          name: 'teamId',
          type: 'relationship',
          relationTo: 'teams',
          required: true,
        },
        {
          name: 'active',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'startDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
              displayFormat: 'yyyy-MM-dd',
            },
          },
        },
        {
          name: 'endDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
              displayFormat: 'yyyy-MM-dd',
            },
          },
        },
      ],
    },
    {
      name: 'lastUpdated',
      type: 'date',
      admin: {
        description: 'When this record was last updated',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
    },
  ],
}

export default Coaches
