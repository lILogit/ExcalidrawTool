/**
 * Utility types and type guards for the application
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

// ===========================================
// Primitive Types
// ===========================================

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific properties optional
 */
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * Deep required type
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// ===========================================
// Function Types
// ===========================================

/**
 * Async function type
 */
export type AsyncFunction<T extends unknown[] = unknown[], R = unknown> = (
  ...args: T
) => Promise<R>

/**
 * Sync or async function type
 */
export type MaybeAsyncFunction<T extends unknown[] = unknown[], R = unknown> =
  | ((...args: T) => R)
  | ((...args: T) => Promise<R>)

/**
 * Extract parameters from function
 */
export type Parameters<T> = T extends (...args: infer P) => unknown ? P : never

/**
 * Extract return type from function
 */
export type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never

/**
 * Extract async return type
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never

// ===========================================
// Union Types
// ===========================================

/**
 * Extract keys by value type
 */
export type KeysByType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Make readonly properties writable
 */
export type Writable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Make writable properties readonly
 */
export type ReadonlyKeys<T> = {
  [K in keyof T]-?: undefined extends { [P in K]: T[P] }[K] ? never : K
}[keyof T]

/**
 * Make readonly properties mutable
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

// ===========================================
// String Types
// ===========================================

/**
 * Split string by separator
 */
export type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S]

/**
 * Join array of strings
 */
export type Join<T extends string[], D extends string> = T extends [infer First extends string]
  ? First
  : T extends [infer First extends string, ...infer Rest extends string[]]
    ? `${First}${D}${Join<Rest, D>}`
    : never

/**
 * CamelCase to PascalCase
 */
export type CamelToPascalCase<S extends string> = S extends `${infer First}_${infer Rest}`
  ? `${Capitalize<First>}${CamelToPascalCase<Rest>}`
  : S extends `${infer First}${infer Rest}`
    ? `${First extends Lowercase<First> ? Uppercase<First> : First}${CamelToPascalCase<Rest>}`
    : S

/**
 * PascalCase to camelCase
 */
export type PascalToCamelCase<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Lowercase<First>
    ? S
    : `${Lowercase<First>}${PascalToCamelCase<Rest>}`
  : S

// ===========================================
// Collection Types
// ===========================================

/**
 * Dictionary type (object with string keys)
 */
export type Dictionary<T> = Record<string, T>

/**
 * Readonly dictionary
 */
export type ReadonlyDictionary<T> = Readonly<Record<string, T>>

/**
 * Nullable type
 */
export type Nullable<T> = T | null

/**
 * Optional type (includes undefined)
 */
export type Optional<T> = T | undefined

/**
 * Nullish type (null or undefined)
 */
export type Nullish = null | undefined

/**
 * Nullable or undefined
 */
export type NullableOrOptional<T> = T | null | undefined

/**
 * Value or array of values
 */
export type OneOrMany<T> = T | T[]

/**
 * Promise value type
 */
export type PromiseValue<T> = T extends Promise<infer V> ? V : T

// ===========================================
// Element Types
// ===========================================

/**
 * Element ID type
 */
export type ElementId = string

/**
 * Element type guard for shapes
 */
export function isShapeElement(element: ExcalidrawElement): boolean {
  return ['rectangle', 'ellipse', 'diamond'].includes(element.type)
}

/**
 * Element type guard for text
 */
export function isTextElement(element: ExcalidrawElement): boolean {
  return element.type === 'text'
}

/**
 * Element type guard for arrows
 */
export function isArrowElement(element: ExcalidrawElement): boolean {
  return element.type === 'arrow'
}

/**
 * Element type guard for connectors
 */
export function isConnectorElement(element: ExcalidrawElement): boolean {
  return ['arrow', 'line'].includes(element.type)
}

/**
 * Filter array by type
 */
export function filterByType<T, U extends T['type']>(
  items: T[],
  type: U
): Extract<T, { type: U }>[] {
  return items.filter((item): item is Extract<T, { type: U }> => item.type === type)
}

// ===========================================
// Result Types
// ===========================================

/**
 * Success result
 */
export type Success<T> = {
  success: true
  data: T
}

/**
 * Error result
 */
export type Failure<E = Error> = {
  success: false
  error: E
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = Success<T> | Failure<E>

/**
 * Type guard for success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true
}

/**
 * Type guard for failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false
}

/**
 * Create success result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data }
}

/**
 * Create failure result
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error }
}

// ===========================================
// Option/Maybe Types
// ===========================================

/**
 * Option type for nullable values
 */
export type Option<T> = Some<T> | None

/**
 * Some value
 */
export type Some<T> = {
  type: 'some'
  value: T
}

/**
 * None value
 */
export type None = {
  type: 'none'
}

/**
 * Create Some option
 */
export function some<T>(value: T): Option<T> {
  return { type: 'some', value }
}

/**
 * Create None option
 */
export const none: None = { type: 'none' }

/**
 * Check if option is Some
 */
export function isSome<T>(option: Option<T>): option is Some<T> {
  return option.type === 'some'
}

/**
 * Check if option is None
 */
export function isNone<T>(option: Option<T>): option is None {
  return option.type === 'none'
}

/**
 * Get value from option or default
 */
export function getOptionValue<T>(option: Option<T>, defaultValue: T): T {
  return isSome(option) ? option.value : defaultValue
}

// ===========================================
// Event Types
// ===========================================

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: T) => void

/**
 * Async event handler type
 */
export type AsyncEventHandler<T = unknown> = (event: T) => Promise<void>

/**
 * Event listener type
 */
export type EventListener<T = unknown> = EventHandler<T> | AsyncEventHandler<T>

/**
 * Event map type
 */
export type EventMap<T extends Record<string, unknown>> = {
  [K in keyof T]: EventListener<T[K]>
}

// ===========================================
// Config Types
// ===========================================

/**
 * Configuration type with defaults
 */
export type WithDefaults<T, D extends Partial<T>> = Omit<T, keyof D> & Required<D>

/**
 * Merge configurations
 */
export function mergeDefaults<T, D extends Partial<T>>(
  config: T,
  defaults: D
): WithDefaults<T, D> {
  return { ...defaults, ...config } as WithDefaults<T, D>
}

// ===========================================
// Builder Types
// ===========================================

/**
 * Builder pattern type
 */
export type Builder<T> = {
  [K in keyof T as T[K] extends (...args: unknown[]) => unknown ? K : never]?: (
    ...args: T[K] extends (...args: infer P) => unknown ? P : never
  ) => Builder<T>
} & {
  build(): T
}

// ===========================================
// Discriminated Union Types
// ===========================================

/**
 * Extract type by discriminator
 */
export type ByDiscriminator<U, D extends keyof U, V> = Extract<U, Record<D, V>>

/**
 * Get all discriminator values
 */
export type DiscriminatorValues<U, D extends keyof U> = U[D]

// ===========================================
// Numeric Range Types
// ===========================================

/**
 * Value in range
 */
export type ValueInRange<Min extends number, Max extends number> = number & {
  __brand: 'ValueInRange'
}

/**
 * Create range constraint type (runtime only)
 */
export function inRange<Min extends number, Max extends number>(
  value: number,
  min: Min,
  max: Max
): ValueInRange<Min, Max> {
  if (value < min || value > max) {
    throw new Error(`Value ${value} is out of range [${min}, ${max}]`)
  }
  return value as ValueInRange<Min, Max>
}

// ===========================================
// Version Types
// ===========================================

/**
 * Semantic version type
 */
export type SemVer = `${number}.${number}.${number}`

/**
 * Validate semantic version
 */
export function isSemVer(version: string): version is SemVer {
  return /^\d+\.\d+\.\d+$/.test(version)
}

// ===========================================
// Path Types
// ===========================================

/**
 * Join path segments
 */
export type JoinPath<T extends string[], D extends string = '/'> = Join<T, D>

/**
 * Split path
 */
export type SplitPath<S extends string, D extends string = '/'> = Split<S, D>

// ===========================================
// Tagged Union Types
// ===========================================

/**
 * Create tagged union
 */
export type Tagged<T, Tag extends string> = T & {
  __tag: Tag
}

/**
 * Create tagged value
 */
export function tag<T, Tag extends string>(value: T, tag: Tag): Tagged<T, Tag> {
  return value as Tagged<T, Tag>
}

// ===========================================
// Type Guards
// ===========================================

/**
 * Type guard for object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard for array
 */
export function isArray<T = unknown>(value: unknown, guard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) {
    return false
  }
  return guard ? value.every(guard) : true
}

/**
 * Type guard for promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return isObject(value) && 'then' in value && typeof value.then === 'function'
}

/**
 * Type guard for date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date
}

/**
 * Type guard for defined (not null/undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Assert type at runtime
 */
export function assertType<T>(value: unknown, guard: (v: unknown) => v is T): T {
  if (!guard(value)) {
    throw new Error('Type assertion failed')
  }
  return value
}

/**
 * Cast value with type safety
 */
export function cast<T>(value: unknown, guard?: (v: unknown) => v is T): T {
  if (guard) {
    return assertType(value, guard)
  }
  return value as T
}

/**
 * Narrow type with type guard
 */
export function narrow<T>(
  value: unknown,
  guard: (v: unknown) => v is T
): value is T {
  return guard(value)
}
