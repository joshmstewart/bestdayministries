/**
 * SEO Utilities - Main export file
 */

// Structured Data
export {
  createOrganizationSchema,
  createWebsiteSchema,
  createArticleSchema,
  createBlogPostingSchema,
  createNewsArticleSchema,
  createEventSchema,
  createProductSchema,
  createLocalBusinessSchema,
  createCafeSchema,
  createFAQSchema,
  createBreadcrumbSchema,
  createVideoSchema,
  createImageGallerySchema,
  createPersonSchema,
  createNonprofitSchema,
  createDonateActionSchema,
  createItemListSchema,
  injectStructuredData,
  injectMultipleStructuredData,
  createSchemaGraph,
  validateStructuredData,
} from './structuredData';

export type {
  OrganizationData,
  ArticleData,
  EventData,
  ProductData,
  LocalBusinessData,
  FAQData,
  BreadcrumbData,
  VideoData,
  ImageGalleryData,
  PersonData,
  NonprofitData,
  DonationData,
  ItemListData,
} from './structuredData';

// Meta Optimization
export {
  applyMetaTags,
  generatePageMeta,
  analyzeSEO,
} from './metaOptimization';

export type {
  MetaTagConfig,
  SEOAnalysisResult,
} from './metaOptimization';
