import type { CollectionConfig } from 'payload'

export const Countries: CollectionConfig = {
  slug: 'countries',
  fields: [
    {
      name: 'id',
      type: 'number',
      required: true,
    },
    {
      name: 'continent_id',
      type: 'number',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'official_name',
      type: 'text',
      required: false,
    },
    {
      name: 'fifa_name',
      type: 'text',
      required: false,
    },
    {
      name: 'iso2',
      type: 'text',
      required: false,
    },
    {
      name: 'iso3',
      type: 'text',
      required: false,
    },
    {
      name: 'latitude',
      type: 'text',
      required: false,
    },
    {
      name: 'longitude',
      type: 'text',
      required: false,
    },
    {
      name: 'geonameid',
      type: 'number',
      required: false,
    },
    {
      name: 'borders',
      type: 'json',
      required: false,
    },
    {
      name: 'image_path',
      type: 'text',
      required: false,
    },
  ],
}
