/**
 * Utility types for common type transformations across the codebase
 */

/**
 * Makes specific properties of a type required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

/**
 * Makes all properties of a type required
 */
export type RequiredAll<T> = {
  [P in keyof T]-?: T[P]
}

/**
 * Picks properties from type T and makes them all required
 */
export type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>>

/**
 * Converts a nullable property to non-nullable
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Creates a type where specified properties of T are required and the rest are optional
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>

/**
 * Creates a type where specified properties of T are optional and the rest are required
 */
export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Partial<Pick<T, K>>

/**
 * Creates a deep partial type (all nested properties are also partial)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends Record<string, unknown>
      ? DeepPartial<T[P]>
      : T[P]
}

/**
 * Creates a type with only the specified keys of T
 */
export type PickByKey<T, K extends keyof T> = Pick<T, K>

/**
 * Creates a mapped type that transforms API response types to our internal types
 */
export type TransformedType<T, U> = {
  transform: (data: T) => U
  validate?: (data: T) => void
}
