/**
 * Security Utilities
 * Comprehensive security hardening for the application
 */

// ============ Input Sanitization ============

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Sanitize HTML with allowlist of tags
 */
export const sanitizeHtmlWithAllowlist = (
  input: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li']
): string => {
  // First, sanitize by creating text node
  const temp = document.createElement('div');
  temp.innerHTML = input;

  const sanitize = (element: Element): void => {
    const children = Array.from(element.children);
    
    children.forEach((child) => {
      const tagName = child.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        // Replace with text content
        const text = document.createTextNode(child.textContent || '');
        child.parentNode?.replaceChild(text, child);
      } else {
        // Remove all attributes except href for links
        Array.from(child.attributes).forEach((attr) => {
          if (tagName === 'a' && attr.name === 'href') {
            // Validate href
            const href = attr.value;
            if (!href.startsWith('/') && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
              child.removeAttribute(attr.name);
            }
          } else {
            child.removeAttribute(attr.name);
          }
        });
        
        // Recursively sanitize children
        sanitize(child);
      }
    });
  };

  sanitize(temp);
  return temp.innerHTML;
};

/**
 * Escape special characters for use in regex
 */
export const escapeRegex = (input: string): string => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize SQL-like input (for display, not for actual SQL queries)
 */
export const sanitizeSqlLike = (input: string): string => {
  return input.replace(/['";\\]/g, '');
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (input: string): string => {
  return input
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 255);
};

/**
 * Sanitize URL path segment
 */
export const sanitizeUrlPath = (input: string): string => {
  return encodeURIComponent(input.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase());
};

// ============ Input Validation ============

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    errors.push('Email is required');
  } else if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  } else if (email.length > 254) {
    errors.push('Email is too long');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string, options?: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}): ValidationResult => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false,
  } = options || {};

  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate URL
 */
export const validateUrl = (url: string, options?: {
  requireHttps?: boolean;
  allowedDomains?: string[];
}): ValidationResult => {
  const errors: string[] = [];

  try {
    const parsed = new URL(url);
    
    if (options?.requireHttps && parsed.protocol !== 'https:') {
      errors.push('URL must use HTTPS');
    }
    
    if (options?.allowedDomains?.length) {
      const domain = parsed.hostname.replace(/^www\./, '');
      if (!options.allowedDomains.includes(domain)) {
        errors.push('URL domain is not allowed');
      }
    }
  } catch {
    errors.push('Invalid URL format');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate phone number
 */
export const validatePhone = (phone: string): ValidationResult => {
  const errors: string[] = [];
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  if (!/^\+?\d{10,15}$/.test(cleaned)) {
    errors.push('Invalid phone number format');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Generic input validation
 */
export const validateInput = (
  value: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    custom?: (value: string) => string | null;
  }
): ValidationResult => {
  const errors: string[] = [];

  if (rules.required && !value.trim()) {
    errors.push('This field is required');
    return { valid: false, errors };
  }

  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Must be at least ${rules.minLength} characters`);
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Must be no more than ${rules.maxLength} characters`);
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || 'Invalid format');
  }

  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) errors.push(customError);
  }

  return { valid: errors.length === 0, errors };
};

// ============ Rate Limiting (Client-Side) ============

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Client-side rate limiter
 */
export const checkRateLimit = (
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetTime - now };
};

/**
 * Create a rate-limited function
 */
export const createRateLimitedFunction = <T extends (...args: any[]) => any>(
  fn: T,
  key: string,
  maxRequests: number,
  windowMs: number
): ((...args: Parameters<T>) => ReturnType<T> | null) => {
  return (...args: Parameters<T>): ReturnType<T> | null => {
    const { allowed } = checkRateLimit(key, maxRequests, windowMs);
    if (!allowed) {
      console.warn(`Rate limit exceeded for ${key}`);
      return null;
    }
    return fn(...args);
  };
};

// ============ CSRF Protection ============

/**
 * Generate CSRF token
 */
export const generateCsrfToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Store CSRF token in session storage
 */
export const storeCsrfToken = (token: string): void => {
  sessionStorage.setItem('csrf_token', token);
};

/**
 * Get stored CSRF token
 */
export const getCsrfToken = (): string | null => {
  return sessionStorage.getItem('csrf_token');
};

/**
 * Initialize CSRF protection
 */
export const initCsrfProtection = (): string => {
  let token = getCsrfToken();
  if (!token) {
    token = generateCsrfToken();
    storeCsrfToken(token);
  }
  return token;
};

// ============ Content Security ============

/**
 * Check if URL is from trusted origin
 */
export const isTrustedOrigin = (url: string, trustedOrigins?: string[]): boolean => {
  const defaults = [
    window.location.origin,
    'https://nbvijawmjkycyweioglk.supabase.co',
  ];
  
  const origins = trustedOrigins || defaults;
  
  try {
    const parsed = new URL(url);
    return origins.some((origin) => parsed.origin === origin);
  } catch {
    return url.startsWith('/'); // Relative URLs are trusted
  }
};

/**
 * Validate redirect URL to prevent open redirect
 */
export const validateRedirectUrl = (url: string): string | null => {
  // Only allow relative URLs or same-origin URLs
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  
  if (isTrustedOrigin(url)) {
    return url;
  }
  
  console.warn('Blocked potentially malicious redirect:', url);
  return null;
};

/**
 * Safe JSON parse with type checking
 */
export const safeJsonParse = <T>(
  json: string,
  fallback: T,
  validator?: (data: unknown) => data is T
): T => {
  try {
    const parsed = JSON.parse(json);
    if (validator && !validator(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
};

// ============ Secure Storage ============

/**
 * Securely store sensitive data (obfuscated, not encrypted)
 */
export const secureStore = {
  set: (key: string, value: string): void => {
    // Simple obfuscation - not true encryption, just makes casual inspection harder
    const encoded = btoa(encodeURIComponent(value));
    sessionStorage.setItem(`_s_${key}`, encoded);
  },

  get: (key: string): string | null => {
    const encoded = sessionStorage.getItem(`_s_${key}`);
    if (!encoded) return null;
    
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return null;
    }
  },

  remove: (key: string): void => {
    sessionStorage.removeItem(`_s_${key}`);
  },

  clear: (): void => {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('_s_'));
    keys.forEach((k) => sessionStorage.removeItem(k));
  },
};

// ============ Security Headers Check ============

/**
 * Check security headers (for debugging/testing)
 */
export const checkSecurityHeaders = async (url?: string): Promise<{
  header: string;
  present: boolean;
  value?: string;
}[]> => {
  const targetUrl = url || window.location.origin;
  
  try {
    const response = await fetch(targetUrl, { method: 'HEAD' });
    const headers = response.headers;

    const securityHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    return securityHeaders.map((header) => ({
      header,
      present: headers.has(header),
      value: headers.get(header) || undefined,
    }));
  } catch (error) {
    console.error('Failed to check security headers:', error);
    return [];
  }
};

// ============ Form Protection ============

/**
 * Detect if form is being submitted too quickly (bot detection)
 */
export const createHoneypot = (): {
  fieldName: string;
  checkHoneypot: (value: string) => boolean;
  timestamp: number;
  checkTimestamp: (minMs?: number) => boolean;
} => {
  const timestamp = Date.now();
  const fieldName = `_hp_${Math.random().toString(36).slice(2, 8)}`;

  return {
    fieldName,
    checkHoneypot: (value: string) => value === '',
    timestamp,
    checkTimestamp: (minMs = 3000) => Date.now() - timestamp > minMs,
  };
};

// ============ Data Masking ============

/**
 * Mask sensitive data for display
 */
export const maskData = {
  email: (email: string): string => {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const maskedLocal = local.slice(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
  },

  phone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '***';
    return `***-***-${cleaned.slice(-4)}`;
  },

  creditCard: (cc: string): string => {
    const cleaned = cc.replace(/\D/g, '');
    if (cleaned.length < 4) return '****';
    return `****-****-****-${cleaned.slice(-4)}`;
  },

  ssn: (ssn: string): string => {
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length < 4) return '***-**-****';
    return `***-**-${cleaned.slice(-4)}`;
  },

  custom: (value: string, visibleChars: number, position: 'start' | 'end' = 'end'): string => {
    if (value.length <= visibleChars) return '*'.repeat(value.length);
    
    const mask = '*'.repeat(value.length - visibleChars);
    return position === 'end'
      ? `${mask}${value.slice(-visibleChars)}`
      : `${value.slice(0, visibleChars)}${mask}`;
  },
};

// ============ Export ============

export default {
  // Sanitization
  sanitizeHtml,
  sanitizeHtmlWithAllowlist,
  escapeRegex,
  sanitizeSqlLike,
  sanitizeFilename,
  sanitizeUrlPath,
  
  // Validation
  validateEmail,
  validatePassword,
  validateUrl,
  validatePhone,
  validateInput,
  
  // Rate limiting
  checkRateLimit,
  createRateLimitedFunction,
  
  // CSRF
  generateCsrfToken,
  storeCsrfToken,
  getCsrfToken,
  initCsrfProtection,
  
  // Content security
  isTrustedOrigin,
  validateRedirectUrl,
  safeJsonParse,
  
  // Storage
  secureStore,
  
  // Headers
  checkSecurityHeaders,
  
  // Form protection
  createHoneypot,
  
  // Data masking
  maskData,
};
