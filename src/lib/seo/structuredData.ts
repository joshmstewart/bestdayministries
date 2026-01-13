/**
 * Comprehensive Structured Data (JSON-LD) Utilities
 * Schema.org compliant structured data for all content types
 */

import { Json } from '@/integrations/supabase/types';

// Base context for all structured data
const SCHEMA_CONTEXT = 'https://schema.org';

// Organization defaults
const getOrganizationBase = () => ({
  '@type': 'Organization',
  name: 'Joy House Community',
  alternateName: 'Best Day Ministries',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://joyhouse.community',
  logo: typeof window !== 'undefined' ? `${window.location.origin}/favicon.png` : 'https://joyhouse.community/favicon.png',
  description: 'Building a supportive community for adults with special needs',
});

// ============ Organization & Website ============

export interface OrganizationData {
  name?: string;
  alternateName?: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  sameAs?: string[];
  foundingDate?: string;
  founders?: { name: string }[];
}

export const createOrganizationSchema = (data?: Partial<OrganizationData>) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'Organization',
  '@id': `${getOrganizationBase().url}/#organization`,
  ...getOrganizationBase(),
  ...(data?.email && { email: data.email }),
  ...(data?.telephone && { telephone: data.telephone }),
  ...(data?.address && {
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
  }),
  ...(data?.sameAs && { sameAs: data.sameAs }),
  ...(data?.foundingDate && { foundingDate: data.foundingDate }),
  ...(data?.founders && {
    founders: data.founders.map((f) => ({ '@type': 'Person', name: f.name })),
  }),
});

export const createWebsiteSchema = (searchUrl?: string) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'WebSite',
  '@id': `${getOrganizationBase().url}/#website`,
  name: 'Joy House Community',
  url: getOrganizationBase().url,
  publisher: { '@id': `${getOrganizationBase().url}/#organization` },
  ...(searchUrl && {
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${searchUrl}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }),
});

// ============ Article & Blog Posts ============

export interface ArticleData {
  headline: string;
  description: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author?: string | { name: string; url?: string };
  keywords?: string[];
  articleSection?: string;
  wordCount?: number;
}

export const createArticleSchema = (data: ArticleData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'Article',
  headline: data.headline.slice(0, 110),
  description: data.description.slice(0, 300),
  image: data.image,
  datePublished: data.datePublished,
  dateModified: data.dateModified || data.datePublished,
  author: typeof data.author === 'string'
    ? { '@type': 'Person', name: data.author }
    : { '@type': 'Person', ...data.author },
  publisher: getOrganizationBase(),
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': typeof window !== 'undefined' ? window.location.href : '',
  },
  ...(data.keywords && { keywords: data.keywords.join(', ') }),
  ...(data.articleSection && { articleSection: data.articleSection }),
  ...(data.wordCount && { wordCount: data.wordCount }),
});

export const createBlogPostingSchema = (data: ArticleData) => ({
  ...createArticleSchema(data),
  '@type': 'BlogPosting',
});

export const createNewsArticleSchema = (data: ArticleData) => ({
  ...createArticleSchema(data),
  '@type': 'NewsArticle',
});

// ============ Events ============

export interface EventData {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  } | string;
  image?: string;
  eventStatus?: 'Scheduled' | 'Cancelled' | 'Postponed' | 'Rescheduled' | 'MovedOnline';
  eventAttendanceMode?: 'Offline' | 'Online' | 'Mixed';
  offers?: {
    price?: number;
    priceCurrency?: string;
    availability?: 'InStock' | 'SoldOut' | 'PreOrder';
    url?: string;
    validFrom?: string;
  };
  performer?: { name: string; type?: 'Person' | 'Organization' }[];
  organizer?: { name: string; url?: string };
  isAccessibleForFree?: boolean;
}

export const createEventSchema = (data: EventData) => {
  const location = typeof data.location === 'string'
    ? {
        '@type': 'Place',
        name: data.location,
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.location,
        },
      }
    : data.location
    ? {
        '@type': 'Place',
        name: data.location.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.location.address,
        },
        ...(data.location.latitude && data.location.longitude && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          },
        }),
      }
    : undefined;

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Event',
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    ...(data.endDate && { endDate: data.endDate }),
    ...(location && { location }),
    ...(data.image && { image: data.image }),
    eventStatus: `https://schema.org/Event${data.eventStatus || 'Scheduled'}`,
    eventAttendanceMode: `https://schema.org/${data.eventAttendanceMode || 'Offline'}EventAttendanceMode`,
    organizer: data.organizer || getOrganizationBase(),
    ...(data.offers && {
      offers: {
        '@type': 'Offer',
        price: data.offers.price || 0,
        priceCurrency: data.offers.priceCurrency || 'USD',
        availability: `https://schema.org/${data.offers.availability || 'InStock'}`,
        url: data.offers.url,
        validFrom: data.offers.validFrom,
      },
    }),
    ...(data.performer && {
      performer: data.performer.map((p) => ({
        '@type': p.type || 'Person',
        name: p.name,
      })),
    }),
    ...(data.isAccessibleForFree !== undefined && { isAccessibleForFree: data.isAccessibleForFree }),
  };
};

// ============ Products ============

export interface ProductData {
  name: string;
  description: string;
  image?: string | string[];
  sku?: string;
  mpn?: string;
  brand?: string;
  price: number;
  priceCurrency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
  condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  reviews?: {
    author: string;
    ratingValue: number;
    reviewBody: string;
    datePublished: string;
  }[];
  category?: string;
  seller?: { name: string };
}

export const createProductSchema = (data: ProductData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'Product',
  name: data.name,
  description: data.description,
  image: data.image,
  ...(data.sku && { sku: data.sku }),
  ...(data.mpn && { mpn: data.mpn }),
  ...(data.brand && { brand: { '@type': 'Brand', name: data.brand } }),
  ...(data.category && { category: data.category }),
  offers: {
    '@type': 'Offer',
    price: data.price,
    priceCurrency: data.priceCurrency || 'USD',
    availability: `https://schema.org/${data.availability || 'InStock'}`,
    itemCondition: `https://schema.org/${data.condition || 'NewCondition'}`,
    seller: data.seller || getOrganizationBase(),
    url: typeof window !== 'undefined' ? window.location.href : '',
  },
  ...(data.aggregateRating && {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: data.aggregateRating.ratingValue,
      reviewCount: data.aggregateRating.reviewCount,
    },
  }),
  ...(data.reviews && {
    review: data.reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.ratingValue,
      },
      reviewBody: r.reviewBody,
      datePublished: r.datePublished,
    })),
  }),
});

// ============ Local Business ============

export interface LocalBusinessData {
  name: string;
  description?: string;
  image?: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  email?: string;
  openingHours?: string[];
  priceRange?: string;
  servesCuisine?: string[];
  menu?: string;
  acceptsReservations?: boolean;
  hasMap?: string;
}

export const createLocalBusinessSchema = (data: LocalBusinessData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'LocalBusiness',
  '@id': `${getOrganizationBase().url}/#business`,
  name: data.name,
  ...(data.description && { description: data.description }),
  ...(data.image && { image: data.image }),
  address: {
    '@type': 'PostalAddress',
    ...data.address,
  },
  ...(data.geo && {
    geo: {
      '@type': 'GeoCoordinates',
      latitude: data.geo.latitude,
      longitude: data.geo.longitude,
    },
  }),
  ...(data.telephone && { telephone: data.telephone }),
  ...(data.email && { email: data.email }),
  ...(data.openingHours && { openingHoursSpecification: data.openingHours }),
  ...(data.priceRange && { priceRange: data.priceRange }),
  ...(data.servesCuisine && { servesCuisine: data.servesCuisine }),
  ...(data.menu && { hasMenu: data.menu }),
  ...(data.acceptsReservations !== undefined && { acceptsReservations: data.acceptsReservations }),
  ...(data.hasMap && { hasMap: data.hasMap }),
});

export const createCafeSchema = (data: LocalBusinessData) => ({
  ...createLocalBusinessSchema(data),
  '@type': 'CafeOrCoffeeShop',
});

// ============ FAQs ============

export interface FAQData {
  questions: {
    question: string;
    answer: string;
  }[];
}

export const createFAQSchema = (data: FAQData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'FAQPage',
  mainEntity: data.questions.map((q) => ({
    '@type': 'Question',
    name: q.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: q.answer,
    },
  })),
});

// ============ Breadcrumbs ============

export interface BreadcrumbData {
  items: {
    name: string;
    url: string;
  }[];
}

export const createBreadcrumbSchema = (data: BreadcrumbData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'BreadcrumbList',
  itemListElement: data.items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

// ============ Video ============

export interface VideoData {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string; // ISO 8601 duration format (PT1M30S = 1 min 30 sec)
  contentUrl?: string;
  embedUrl?: string;
  interactionCount?: number;
}

export const createVideoSchema = (data: VideoData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'VideoObject',
  name: data.name,
  description: data.description,
  thumbnailUrl: data.thumbnailUrl,
  uploadDate: data.uploadDate,
  ...(data.duration && { duration: data.duration }),
  ...(data.contentUrl && { contentUrl: data.contentUrl }),
  ...(data.embedUrl && { embedUrl: data.embedUrl }),
  ...(data.interactionCount && {
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: data.interactionCount,
    },
  }),
});

// ============ Image Gallery ============

export interface ImageGalleryData {
  name: string;
  description?: string;
  images: {
    url: string;
    name?: string;
    description?: string;
  }[];
}

export const createImageGallerySchema = (data: ImageGalleryData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'ImageGallery',
  name: data.name,
  ...(data.description && { description: data.description }),
  image: data.images.map((img) => ({
    '@type': 'ImageObject',
    contentUrl: img.url,
    ...(img.name && { name: img.name }),
    ...(img.description && { description: img.description }),
  })),
});

// ============ Person / Profile ============

export interface PersonData {
  name: string;
  image?: string;
  jobTitle?: string;
  description?: string;
  url?: string;
  sameAs?: string[];
}

export const createPersonSchema = (data: PersonData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'Person',
  name: data.name,
  ...(data.image && { image: data.image }),
  ...(data.jobTitle && { jobTitle: data.jobTitle }),
  ...(data.description && { description: data.description }),
  ...(data.url && { url: data.url }),
  ...(data.sameAs && { sameAs: data.sameAs }),
});

// ============ Nonprofit Organization ============

export interface NonprofitData extends OrganizationData {
  areaServed?: string | string[];
  nonprofitStatus?: string;
  taxID?: string;
  knowsAbout?: string[];
}

export const createNonprofitSchema = (data: NonprofitData) => ({
  ...createOrganizationSchema(data),
  '@type': 'NGO',
  ...(data.areaServed && {
    areaServed: Array.isArray(data.areaServed)
      ? data.areaServed.map((a) => ({ '@type': 'Place', name: a }))
      : { '@type': 'Place', name: data.areaServed },
  }),
  ...(data.nonprofitStatus && { nonprofitStatus: `https://schema.org/${data.nonprofitStatus}` }),
  ...(data.taxID && { taxID: data.taxID }),
  ...(data.knowsAbout && { knowsAbout: data.knowsAbout }),
});

// ============ Donation / Action ============

export interface DonationData {
  name: string;
  description?: string;
  recipient: string;
  actionUrl: string;
  price?: {
    minPrice?: number;
    maxPrice?: number;
    priceCurrency?: string;
  };
}

export const createDonateActionSchema = (data: DonationData) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'DonateAction',
  name: data.name,
  ...(data.description && { description: data.description }),
  recipient: {
    '@type': 'Organization',
    name: data.recipient,
  },
  target: {
    '@type': 'EntryPoint',
    urlTemplate: data.actionUrl,
    actionPlatform: [
      'http://schema.org/DesktopWebPlatform',
      'http://schema.org/MobileWebPlatform',
    ],
  },
  ...(data.price && {
    priceSpecification: {
      '@type': 'PriceSpecification',
      ...(data.price.minPrice && { minPrice: data.price.minPrice }),
      ...(data.price.maxPrice && { maxPrice: data.price.maxPrice }),
      priceCurrency: data.price.priceCurrency || 'USD',
    },
  }),
});

// ============ Collection / ItemList ============

export interface ItemListData<T> {
  name: string;
  description?: string;
  items: T[];
  itemSchemaCreator: (item: T) => object;
}

export const createItemListSchema = <T>(data: ItemListData<T>) => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'ItemList',
  name: data.name,
  ...(data.description && { description: data.description }),
  numberOfItems: data.items.length,
  itemListElement: data.items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: data.itemSchemaCreator(item),
  })),
});

// ============ Utility Functions ============

/**
 * Inject structured data into the document head
 */
export const injectStructuredData = (data: object, id: string = 'structured-data') => {
  if (typeof document === 'undefined') return;

  // Remove existing script with same id
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create new script tag
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);

  // Return cleanup function
  return () => {
    const el = document.getElementById(id);
    if (el) el.remove();
  };
};

/**
 * Inject multiple structured data objects
 */
export const injectMultipleStructuredData = (dataArray: object[]) => {
  const cleanups = dataArray.map((data, index) =>
    injectStructuredData(data, `structured-data-${index}`)
  );

  return () => cleanups.forEach((cleanup) => cleanup?.());
};

/**
 * Create combined graph of multiple schemas
 */
export const createSchemaGraph = (...schemas: object[]) => ({
  '@context': SCHEMA_CONTEXT,
  '@graph': schemas.map((schema) => {
    // Remove context from individual schemas to avoid duplication
    const { '@context': _, ...rest } = schema as any;
    return rest;
  }),
});

/**
 * Validate required structured data fields
 */
export const validateStructuredData = (data: object, requiredFields: string[]): boolean => {
  const flatData = JSON.parse(JSON.stringify(data));
  return requiredFields.every((field) => {
    const keys = field.split('.');
    let value: any = flatData;
    for (const key of keys) {
      value = value?.[key];
    }
    return value !== undefined && value !== null && value !== '';
  });
};

export default {
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
};
