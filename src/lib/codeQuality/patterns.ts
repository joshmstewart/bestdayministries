/**
 * Code Quality Patterns
 * Reusable patterns and utilities for code quality
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// ============ Result Type (for error handling) ============

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw (result as { ok: false; error: E }).error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.ok ? result.value : defaultValue;
};

export const mapResult = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.ok) return Ok(fn(result.value));
  return result as Result<never, E>;
};

// ============ Option Type (for nullable handling) ============

export type Option<T> = { some: true; value: T } | { some: false };

export const Some = <T>(value: T): Option<T> => ({ some: true, value });
export const None = <T>(): Option<T> => ({ some: false });

export const isSome = <T>(option: Option<T>): option is { some: true; value: T } => option.some;
export const isNone = <T>(option: Option<T>): option is { some: false } => !option.some;

export const fromNullable = <T>(value: T | null | undefined): Option<T> => 
  value != null ? Some(value) : None();

export const toNullable = <T>(option: Option<T>): T | null => 
  option.some ? option.value : null;

// ============ Pipe/Compose ============

type PipeFn<T, R> = (value: T) => R;

export function pipe<A, B>(value: A, fn1: PipeFn<A, B>): B;
export function pipe<A, B, C>(value: A, fn1: PipeFn<A, B>, fn2: PipeFn<B, C>): C;
export function pipe<A, B, C, D>(value: A, fn1: PipeFn<A, B>, fn2: PipeFn<B, C>, fn3: PipeFn<C, D>): D;
export function pipe<A, B, C, D, E>(value: A, fn1: PipeFn<A, B>, fn2: PipeFn<B, C>, fn3: PipeFn<C, D>, fn4: PipeFn<D, E>): E;
export function pipe(value: any, ...fns: PipeFn<any, any>[]): any {
  return fns.reduce((acc, fn) => fn(acc), value);
}

export function compose<A, B>(fn1: PipeFn<A, B>): PipeFn<A, B>;
export function compose<A, B, C>(fn1: PipeFn<B, C>, fn2: PipeFn<A, B>): PipeFn<A, C>;
export function compose<A, B, C, D>(fn1: PipeFn<C, D>, fn2: PipeFn<B, C>, fn3: PipeFn<A, B>): PipeFn<A, D>;
export function compose(...fns: PipeFn<any, any>[]): PipeFn<any, any> {
  return (value) => fns.reduceRight((acc, fn) => fn(acc), value);
}

// ============ Type Guards ============

export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value);
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);
export const isObject = (value: unknown): value is Record<string, unknown> => 
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const isFunction = (value: unknown): value is Function => typeof value === 'function';
export const isNull = (value: unknown): value is null => value === null;
export const isUndefined = (value: unknown): value is undefined => value === undefined;
export const isNullish = (value: unknown): value is null | undefined => value == null;
export const isDefined = <T>(value: T | null | undefined): value is T => value != null;

// ============ Assertion Functions ============

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value == null) {
    throw new Error(message || 'Expected value to be defined');
  }
}

export function assertNever(value: never, message?: string): never {
  throw new Error(message || `Unexpected value: ${value}`);
}

// ============ Safe Access Utilities ============

export const safeGet = <T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined => {
  return obj?.[key];
};

export const safePath = <T>(obj: unknown, path: string): T | undefined => {
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  
  return current as T | undefined;
};

export const safeParseInt = (value: string, fallback = 0): number => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

export const safeParseFloat = (value: string, fallback = 0): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

export const safeParseJson = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

// ============ Array Utilities ============

export const first = <T>(arr: T[]): T | undefined => arr[0];
export const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];
export const isEmpty = <T>(arr: T[]): boolean => arr.length === 0;
export const isNotEmpty = <T>(arr: T[]): arr is [T, ...T[]] => arr.length > 0;

export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

export const uniqueBy = <T, K>(arr: T[], key: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return arr.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export const groupBy = <T, K extends string | number>(arr: T[], key: (item: T) => K): Record<K, T[]> => {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

export const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const partition = <T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] => {
  const pass: T[] = [];
  const fail: T[] = [];
  
  for (const item of arr) {
    (predicate(item) ? pass : fail).push(item);
  }
  
  return [pass, fail];
};

export const sortBy = <T>(arr: T[], ...keys: ((item: T) => string | number)[]): T[] => {
  return [...arr].sort((a, b) => {
    for (const key of keys) {
      const aVal = key(a);
      const bVal = key(b);
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
};

// ============ Object Utilities ============

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj } as any;
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

export const mapValues = <T extends object, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U
): { [K in keyof T]: U } => {
  const result = {} as { [K in keyof T]: U };
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = fn(obj[key], key);
    }
  }
  return result;
};

export const filterObject = <T extends object>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> => {
  const result = {} as Partial<T>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

// ============ String Utilities ============

export const capitalize = (str: string): string => 
  str.charAt(0).toUpperCase() + str.slice(1);

export const titleCase = (str: string): string =>
  str.split(' ').map(capitalize).join(' ');

export const camelToKebab = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const kebabToCamel = (str: string): string =>
  str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

export const truncate = (str: string, length: number, suffix = '...'): string =>
  str.length <= length ? str : str.slice(0, length - suffix.length) + suffix;

export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const pluralize = (count: number, singular: string, plural?: string): string =>
  count === 1 ? singular : (plural || singular + 's');

// ============ Number Utilities ============

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

export const round = (value: number, decimals = 0): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const formatNumber = (num: number): string =>
  new Intl.NumberFormat().format(num);

export const formatCurrency = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export const formatPercent = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('en-US', { 
    style: 'percent', 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

// ============ Date Utilities ============

export const formatDate = (date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat('en-US', optionsMap[format]).format(d);
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);
};

export const formatRelative = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(d, 'short');
};

// ============ Async Utilities ============

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);

export const retry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeoutId: NodeJS.Timeout | undefined;
  
  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
  
  debouncedFn.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  
  return debouncedFn;
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  };
};

// ============ React Hooks for Patterns ============

/**
 * useConstant - creates a value once and never changes
 */
export const useConstant = <T>(factory: () => T): T => {
  const ref = useRef<{ value: T } | null>(null);
  
  if (ref.current === null) {
    ref.current = { value: factory() };
  }
  
  return ref.current.value;
};

/**
 * useLatest - always returns the latest value
 */
export const useLatest = <T>(value: T): { readonly current: T } => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

/**
 * useEvent - stable callback that always uses latest values
 */
export const useEvent = <T extends (...args: any[]) => any>(fn: T): T => {
  const fnRef = useLatest(fn);
  
  return useCallback(
    ((...args) => fnRef.current(...args)) as T,
    []
  );
};

/**
 * usePrevious - returns the previous value
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
};

/**
 * useToggle - boolean toggle hook
 */
export const useToggle = (initial = false) => {
  const [value, setValue] = useState(initial);
  
  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  
  return [value, { toggle, setTrue, setFalse, setValue }] as const;
};

/**
 * useList - array manipulation hook
 */
export const useList = <T>(initial: T[] = []) => {
  const [list, setList] = useState(initial);
  
  const actions = useMemo(() => ({
    push: (...items: T[]) => setList((l) => [...l, ...items]),
    pop: () => setList((l) => l.slice(0, -1)),
    shift: () => setList((l) => l.slice(1)),
    unshift: (...items: T[]) => setList((l) => [...items, ...l]),
    remove: (index: number) => setList((l) => l.filter((_, i) => i !== index)),
    update: (index: number, item: T) => setList((l) => l.map((v, i) => (i === index ? item : v))),
    clear: () => setList([]),
    set: setList,
  }), []);
  
  return [list, actions] as const;
};

/**
 * useMap - Map manipulation hook
 */
export const useMap = <K, V>(initial?: Map<K, V> | [K, V][]) => {
  const [map, setMap] = useState(() => new Map<K, V>(initial));
  
  const actions = useMemo(() => ({
    set: (key: K, value: V) => setMap((m) => new Map(m).set(key, value)),
    delete: (key: K) => setMap((m) => {
      const newMap = new Map(m);
      newMap.delete(key);
      return newMap;
    }),
    clear: () => setMap(new Map()),
    reset: () => setMap(new Map(initial)),
  }), [initial]);
  
  return [map, actions] as const;
};

/**
 * useSet - Set manipulation hook
 */
export const useSet = <T>(initial?: Set<T> | T[]) => {
  const [set, setSet] = useState(() => new Set<T>(initial));
  
  const actions = useMemo(() => ({
    add: (...items: T[]) => setSet((s) => {
      const newSet = new Set(s);
      items.forEach((item) => newSet.add(item));
      return newSet;
    }),
    delete: (...items: T[]) => setSet((s) => {
      const newSet = new Set(s);
      items.forEach((item) => newSet.delete(item));
      return newSet;
    }),
    toggle: (item: T) => setSet((s) => {
      const newSet = new Set(s);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    }),
    clear: () => setSet(new Set()),
    reset: () => setSet(new Set(initial)),
  }), [initial]);
  
  return [set, actions] as const;
};

export default {
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
};
