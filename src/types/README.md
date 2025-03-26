# TypeScript Type System

This directory contains shared type definitions and utility types used throughout the codebase.

## Type vs Interface

We prefer using `type` over `interface` for most type definitions in this codebase:

- Use `type` for:
  - Most data structures, including DTOs, transformers, and internal models
  - Union or intersection types
  - Type aliases
  - Complex mapped types
  - Primitive type aliases

- Use `interface` only for:
  - Public API contracts that might be extended by consumers
  - Types that represent a clear "has-a" relationship (e.g., plugins, extensions)

## Type Naming Conventions

- Use `PascalCase` for type names
- Use descriptive names that explain the purpose of the type
- For transformer types, use the prefix `Transformed` (e.g., `TransformedPlayer`)
- For API response types, use the prefix `API` (e.g., `APIPlayerResponse`)
- For validation schemas, use the suffix `Schema` (e.g., `PlayerSchema`)

## Type Organization

Types are organized in several locations:

1. `src/types/` - Shared utility types and type helpers
2. `src/payload-types.ts` - Auto-generated Payload CMS types (do not edit)
3. `src/services/*/types.ts` - Service-specific types
4. `src/app/api/*/types/*.ts` - API route-specific types

## Utility Types

The `utils.ts` file contains utility types for common transformations. These are particularly useful for:

- Making specific properties required or optional
- Creating deep partial types
- Extracting subsets of types
- Converting between API and internal model types

## Best Practices

1. Be explicit with property nullability (use `string | null` instead of `string?`)
2. Avoid type assertions (`as`) when possible, prefer type guards
3. Use utility types to create derived types instead of duplicating definitions
4. Export shared types from a central location to maintain consistency
5. Keep type definitions close to their usage when they're specific to a module
6. Use mapped and conditional types for advanced type transformations
