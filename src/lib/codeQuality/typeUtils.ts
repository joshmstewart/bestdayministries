/**
 * Type Utilities
 * Enhanced TypeScript utilities for better type safety
 */

// ============ Utility Types ============

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Make all properties mutable (remove readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Deep partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Maybe type (can be undefined)
 */
export type Maybe<T> = T | undefined;

/**
 * Optional type (can be null or undefined)
 */
export type Optional<T> = T | null | undefined;

/**
 * Non-empty array
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Get function parameters as tuple
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Get function return type
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

/**
 * Promisify a type
 */
export type Promisify<T> = T extends Promise<any> ? T : Promise<T>;

/**
 * Unpromisify a type (get inner type of Promise)
 */
export type Unpromisify<T> = T extends Promise<infer U> ? U : T;

/**
 * Get keys of type that match a value type
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Get keys of type that don't match a value type
 */
export type KeysNotOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? never : K;
}[keyof T];

/**
 * Pick only properties of a certain type
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>;

/**
 * Omit properties of a certain type
 */
export type OmitByType<T, V> = Pick<T, KeysNotOfType<T, V>>;

/**
 * Union to intersection
 */
export type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * Strict omit (ensure keys exist)
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Strict extract (ensure keys exist)
 */
export type StrictExtract<T, U extends T> = Extract<T, U>;

/**
 * XOR type (one or the other, but not both)
 */
export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

/**
 * Merge two types, with second type overriding first
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Make all properties of an object nullable
 */
export type NullableProps<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * String literal type builder
 */
export type Prefix<T extends string, P extends string> = `${P}${T}`;
export type Suffix<T extends string, S extends string> = `${T}${S}`;

// ============ Brand Types (Nominal Typing) ============

declare const __brand: unique symbol;

/**
 * Branded type for nominal typing
 */
export type Brand<T, B extends string> = T & { [__brand]: B };

// Common branded types
export type UUID = Brand<string, 'UUID'>;
export type Email = Brand<string, 'Email'>;
export type URL = Brand<string, 'URL'>;
export type PositiveNumber = Brand<number, 'PositiveNumber'>;
export type NonNegativeNumber = Brand<number, 'NonNegativeNumber'>;
export type Integer = Brand<number, 'Integer'>;
export type Percentage = Brand<number, 'Percentage'>;

// Brand creators with validation
export const createUUID = (value: string): UUID | null => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? (value as UUID) : null;
};

export const createEmail = (value: string): Email | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? (value as Email) : null;
};

export const createURL = (value: string): URL | null => {
  try {
    new globalThis.URL(value);
    return value as URL;
  } catch {
    return null;
  }
};

export const createPositiveNumber = (value: number): PositiveNumber | null => {
  return value > 0 ? (value as PositiveNumber) : null;
};

export const createNonNegativeNumber = (value: number): NonNegativeNumber | null => {
  return value >= 0 ? (value as NonNegativeNumber) : null;
};

export const createInteger = (value: number): Integer | null => {
  return Number.isInteger(value) ? (value as Integer) : null;
};

export const createPercentage = (value: number): Percentage | null => {
  return value >= 0 && value <= 100 ? (value as Percentage) : null;
};

// ============ Type Predicates ============

/**
 * Predicate type
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Type predicate
 */
export type TypePredicate<T, U extends T> = (value: T) => value is U;

/**
 * Creates a type predicate from a predicate function
 */
export const createTypePredicate = <T, U extends T>(
  predicate: Predicate<T>
): TypePredicate<T, U> => {
  return (value: T): value is U => predicate(value);
};

// ============ Validation Types ============

/**
 * Validation result
 */
export type ValidationResult<T> = 
  | { valid: true; value: T }
  | { valid: false; errors: string[] };

/**
 * Validator function type
 */
export type Validator<T, U = T> = (value: T) => ValidationResult<U>;

/**
 * Compose validators
 */
export const composeValidators = <T>(...validators: Validator<T>[]): Validator<T> => {
  return (value: T): ValidationResult<T> => {
    const allErrors: string[] = [];
    
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        allErrors.push(...(result as { valid: false; errors: string[] }).errors);
      }
    }
    
    return allErrors.length > 0
      ? { valid: false, errors: allErrors }
      : { valid: true, value };
  };
};

// ============ Event Types ============

/**
 * Strongly typed event handler
 */
export type EventHandler<T = void> = T extends void ? () => void : (event: T) => void;

/**
 * Event listener type for DOM events
 */
export type DOMEventHandler<E extends Event = Event> = (event: E) => void;

// ============ State Types ============

/**
 * Loading state union
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Async state with data and error
 */
export type AsyncState<T, E = Error> = 
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | null; error: E };

/**
 * Create async state helpers
 */
export const AsyncState = {
  idle: <T, E = Error>(): AsyncState<T, E> => ({ status: 'idle', data: null, error: null }),
  loading: <T, E = Error>(data: T | null = null): AsyncState<T, E> => ({ status: 'loading', data, error: null }),
  success: <T, E = Error>(data: T): AsyncState<T, E> => ({ status: 'success', data, error: null }),
  error: <T, E = Error>(error: E, data: T | null = null): AsyncState<T, E> => ({ status: 'error', data, error }),
};

// ============ React Types ============

/**
 * Props with children
 */
export type PropsWithChildren<P = {}> = P & { children?: React.ReactNode };

/**
 * Props with required children
 */
export type PropsWithRequiredChildren<P = {}> = P & { children: React.ReactNode };

/**
 * Component props without 'ref'
 */
export type PropsWithoutRef<P> = P extends { ref?: infer R } ? Omit<P, 'ref'> : P;

/**
 * Polymorphic component props
 */
export type PolymorphicProps<E extends React.ElementType, P = {}> = P &
  Omit<React.ComponentPropsWithoutRef<E>, keyof P> & {
    as?: E;
  };

/**
 * Polymorphic component ref
 */
export type PolymorphicRef<E extends React.ElementType> = React.ComponentPropsWithRef<E>['ref'];

// ============ API Types ============

/**
 * API Response wrapper
 */
export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

/**
 * Paginated response
 */
export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort config
 */
export type SortConfig<T> = {
  field: keyof T;
  direction: SortDirection;
};

/**
 * Filter config
 */
export type FilterConfig<T> = Partial<{
  [K in keyof T]: T[K] | T[K][] | { min?: T[K]; max?: T[K] };
}>;

// ============ Utility Functions ============

/**
 * Exhaustive check for switch statements
 */
export const exhaustiveCheck = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
};

/**
 * Type-safe Object.keys
 */
export const typedKeys = <T extends object>(obj: T): (keyof T)[] => {
  return Object.keys(obj) as (keyof T)[];
};

/**
 * Type-safe Object.entries
 */
export const typedEntries = <T extends object>(obj: T): [keyof T, T[keyof T]][] => {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
};

/**
 * Type-safe Object.fromEntries
 */
export const typedFromEntries = <K extends string | number | symbol, V>(
  entries: [K, V][]
): Record<K, V> => {
  return Object.fromEntries(entries) as Record<K, V>;
};

export default {
  // Branded types
  createUUID,
  createEmail,
  createURL,
  createPositiveNumber,
  createNonNegativeNumber,
  createInteger,
  createPercentage,
  
  // Validation
  composeValidators,
  
  // Async state
  AsyncState,
  
  // Utilities
  exhaustiveCheck,
  typedKeys,
  typedEntries,
  typedFromEntries,
};
