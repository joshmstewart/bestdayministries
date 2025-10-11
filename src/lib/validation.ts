import { z } from "zod";

// Simple validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validatePassword = (password: string): boolean => {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

// Common validation rules
const MAX_TEXT_LENGTH = 1000;
const MAX_TITLE_LENGTH = 200;
const MAX_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 500;

// Sanitize text to prevent XSS
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .slice(0, MAX_TEXT_LENGTH);
};

// Discussion post validation
export const discussionPostSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`),
  content: z.string()
    .trim()
    .min(1, "Content is required")
    .max(MAX_TEXT_LENGTH, `Content must be less than ${MAX_TEXT_LENGTH} characters`),
  category: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type DiscussionPostInput = z.infer<typeof discussionPostSchema>;

// Comment validation
export const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(MAX_TEXT_LENGTH, `Comment must be less than ${MAX_TEXT_LENGTH} characters`),
  postId: z.string().uuid("Invalid post ID"),
  audioUrl: z.string().url().optional().or(z.literal('')),
});

export type CommentInput = z.infer<typeof commentSchema>;

// Profile validation
export const profileSchema = z.object({
  displayName: z.string()
    .trim()
    .min(1, "Display name is required")
    .max(MAX_NAME_LENGTH, `Display name must be less than ${MAX_NAME_LENGTH} characters`),
  bio: z.string()
    .trim()
    .max(MAX_BIO_LENGTH, `Bio must be less than ${MAX_BIO_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
  avatarCategory: z.enum(['composite', 'bestie', 'supporter', 'custom']).optional(),
  avatarNumber: z.number().int().min(1).max(100).nullable().optional(), // Increased to support all avatar types
});

export type ProfileInput = z.infer<typeof profileSchema>;

// Guardian link validation
export const guardianLinkSchema = z.object({
  friendCode: z.string()
    .trim()
    .length(4, "Friend code must be exactly 4 emojis")
    .regex(/^[\p{Emoji}]{4}$/u, "Friend code must contain exactly 4 emojis"),
  relationship: z.string()
    .trim()
    .min(1, "Relationship is required")
    .max(MAX_NAME_LENGTH, `Relationship must be less than ${MAX_NAME_LENGTH} characters`),
});

export type GuardianLinkInput = z.infer<typeof guardianLinkSchema>;

// Event validation
export const eventSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`),
  description: z.string()
    .trim()
    .max(MAX_TEXT_LENGTH, `Description must be less than ${MAX_TEXT_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
  location: z.string()
    .trim()
    .max(MAX_TITLE_LENGTH, `Location must be less than ${MAX_TITLE_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  audioUrl: z.string().url().optional().or(z.literal('')),
});

export type EventInput = z.infer<typeof eventSchema>;

// Album validation
export const albumSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE_LENGTH, `Title must be less than ${MAX_TITLE_LENGTH} characters`),
  description: z.string()
    .trim()
    .max(MAX_TEXT_LENGTH, `Description must be less than ${MAX_TEXT_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  audioUrl: z.string().url().optional().or(z.literal('')),
});

export type AlbumInput = z.infer<typeof albumSchema>;

// Image caption validation
export const imageCaptionSchema = z.object({
  caption: z.string()
    .trim()
    .max(MAX_TITLE_LENGTH, `Caption must be less than ${MAX_TITLE_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
});

export type ImageCaptionInput = z.infer<typeof imageCaptionSchema>;

// Navigation link validation
export const navigationLinkSchema = z.object({
  label: z.string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be less than 50 characters"),
  href: z.string()
    .trim()
    .min(1, "URL is required")
    .refine(
      (url) => url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://'),
      { message: 'URL must start with /, http://, or https://' }
    ),
  display_order: z.number().int().min(0),
  is_active: z.boolean(),
});

export type NavigationLinkInput = z.infer<typeof navigationLinkSchema>;

// Footer link validation
export const footerLinkSchema = z.object({
  label: z.string()
    .trim()
    .min(1, "Label is required")
    .max(100, "Label must be less than 100 characters"),
  href: z.string()
    .trim()
    .min(1, "URL is required")
    .refine(
      (url) => url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://'),
      { message: 'URL must start with /, http://, or https://' }
    ),
  section_id: z.string().uuid("Invalid section ID"),
  display_order: z.number().int().min(0),
  is_active: z.boolean(),
});

export type FooterLinkInput = z.infer<typeof footerLinkSchema>;

// Quick link validation
export const quickLinkSchema = z.object({
  label: z.string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be less than 50 characters"),
  href: z.string()
    .trim()
    .min(1, "URL is required")
    .refine(
      (url) => url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://'),
      { message: 'URL must start with /, http://, or https://' }
    ),
  icon: z.string()
    .trim()
    .min(1, "Icon is required")
    .max(50, "Icon name must be less than 50 characters"),
  color: z.string()
    .trim()
    .min(1, "Color is required")
    .max(100, "Color must be less than 100 characters"),
  display_order: z.number().int().min(0),
  is_active: z.boolean(),
});

export type QuickLinkInput = z.infer<typeof quickLinkSchema>;

// URL sanitization helper - Enhanced for security
export const sanitizeUrl = (url: string): string => {
  try {
    // Trim and check for dangerous patterns
    const trimmedUrl = url.trim();
    
    // Block javascript:, data:, vbscript:, and other dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
    const lowerUrl = trimmedUrl.toLowerCase();
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        throw new Error('Dangerous URL protocol detected');
      }
    }
    
    // For relative URLs, allow them
    if (trimmedUrl.startsWith('/')) {
      return trimmedUrl;
    }
    
    // For absolute URLs, validate protocol
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL protocol. Only http and https are allowed.');
    }
    
    return trimmedUrl;
  } catch (error) {
    if (error instanceof Error && error.message.includes('protocol')) {
      throw error;
    }
    throw new Error('Invalid URL format');
  }
};

// User creation validation (for edge function)
export const createUserSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters") // bcrypt limit
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  displayName: z.string()
    .trim()
    .min(1, "Display name is required")
    .max(MAX_NAME_LENGTH, `Display name must be less than ${MAX_NAME_LENGTH} characters`),
  role: z.enum(['admin', 'owner', 'caregiver', 'bestie', 'supporter']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Helper function to validate and return errors
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: string[] 
} => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
};