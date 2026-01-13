/**
 * Code Quality Utilities - Main export file
 */

// Patterns
export {
  // Result type
  Ok, Err, isOk, isErr, unwrap, unwrapOr, mapResult,
  // Option type  
  Some, None, isSome, isNone, fromNullable, toNullable,
  // Pipe/Compose
  pipe, compose,
  // Type guards
  isString, isNumber, isBoolean, isArray, isObject, isFunction, isNull, isUndefined, isNullish, isDefined,
  // Assertions
  assert, assertDefined, assertNever,
  // Safe access
  safeGet, safePath, safeParseInt, safeParseFloat, safeParseJson,
  // Arrays
  first, last, isEmpty, isNotEmpty, unique, uniqueBy, groupBy, chunk, partition, sortBy,
  // Objects
  pick, omit, mapValues, filterObject,
  // Strings
  capitalize, titleCase, camelToKebab, kebabToCamel, truncate, slugify, pluralize,
  // Numbers
  clamp, lerp, round, formatNumber, formatCurrency, formatPercent,
  // Dates
  formatDate, formatTime, formatRelative,
  // Async
  delay, timeout, retry, debounce, throttle,
  // Hooks
  useConstant, useLatest, useEvent, usePrevious, useToggle, useList, useMap, useSet,
} from './patterns';

export type {
  Result, Option,
} from './patterns';

// Type Utilities
export {
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
  createTypePredicate,
  // Async state
  AsyncState,
  // Utilities
  exhaustiveCheck,
  typedKeys,
  typedEntries,
  typedFromEntries,
} from './typeUtils';

export type {
  // Utility types
  PartialBy,
  RequiredBy,
  Mutable,
  DeepReadonly,
  DeepPartial,
  DeepRequired,
  Nullable,
  Maybe,
  Optional,
  NonEmptyArray,
  ArrayElement,
  Promisify,
  Unpromisify,
  KeysOfType,
  KeysNotOfType,
  PickByType,
  OmitByType,
  UnionToIntersection,
  StrictOmit,
  StrictExtract,
  XOR,
  Merge,
  NullableProps,
  Prefix,
  Suffix,
  // Branded types
  Brand,
  UUID,
  Email,
  URL,
  PositiveNumber,
  NonNegativeNumber,
  Integer,
  Percentage,
  // Validation
  ValidationResult,
  Validator,
  Predicate,
  TypePredicate,
  // Event types
  EventHandler,
  DOMEventHandler,
  // State types
  LoadingState,
  AsyncState as AsyncStateType,
  // React types
  PropsWithChildren,
  PropsWithRequiredChildren,
  PropsWithoutRef,
  PolymorphicProps,
  PolymorphicRef,
  // API types
  ApiResponse,
  PaginatedResponse,
  SortDirection,
  SortConfig,
  FilterConfig,
} from './typeUtils';
