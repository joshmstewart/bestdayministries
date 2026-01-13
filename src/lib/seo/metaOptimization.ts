/**
 * Meta Tag Optimization Utilities
 * Comprehensive meta tag management for SEO
 */

// ============ Types ============

export interface MetaTagConfig {
  // Basic meta
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  robots?: string;
  canonical?: string;
  alternates?: { hreflang: string; href: string }[];

  // Open Graph
  og?: {
    title?: string;
    description?: string;
    type?: 'website' | 'article' | 'product' | 'profile' | 'video.movie' | 'video.episode' | 'music.song';
    url?: string;
    image?: string | { url: string; width?: number; height?: number; alt?: string };
    siteName?: string;
    locale?: string;
    localeAlternates?: string[];
    // Article specific
    article?: {
      publishedTime?: string;
      modifiedTime?: string;
      expirationTime?: string;
      author?: string | string[];
      section?: string;
      tag?: string[];
    };
    // Product specific
    product?: {
      price?: number;
      currency?: string;
      availability?: 'instock' | 'oos' | 'preorder';
    };
  };

  // Twitter Cards
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    player?: {
      url: string;
      width: number;
      height: number;
    };
  };

  // Mobile/PWA
  viewport?: string;
  themeColor?: string;
  appleMobileWebAppCapable?: boolean;
  appleMobileWebAppTitle?: string;
  appleMobileWebAppStatusBarStyle?: 'default' | 'black' | 'black-translucent';

  // Verification
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  pinterestSiteVerification?: string;

  // Other
  referrer?: string;
  formatDetection?: string;
  copyright?: string;
  rating?: string;
  revisitAfter?: string;
}

// ============ Constants ============

const TITLE_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 160;
const OG_TITLE_MAX_LENGTH = 95;
const OG_DESCRIPTION_MAX_LENGTH = 200;
const TWITTER_TITLE_MAX_LENGTH = 70;
const TWITTER_DESCRIPTION_MAX_LENGTH = 200;

// ============ Helper Functions ============

const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
};

const setMetaTag = (
  attribute: 'name' | 'property' | 'http-equiv',
  value: string,
  content: string
): void => {
  if (typeof document === 'undefined') return;
  
  let element = document.querySelector(
    `meta[${attribute}="${value}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  element.content = content;
};

const removeMetaTag = (attribute: 'name' | 'property', value: string): void => {
  if (typeof document === 'undefined') return;
  const element = document.querySelector(`meta[${attribute}="${value}"]`);
  if (element) element.remove();
};

const setLinkTag = (rel: string, href: string, attributes?: Record<string, string>): void => {
  if (typeof document === 'undefined') return;

  // For canonical and specific rels, replace existing
  const selector = rel === 'canonical' ? 'link[rel="canonical"]' : `link[rel="${rel}"][href="${href}"]`;
  let element = document.querySelector(selector) as HTMLLinkElement;

  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.href = href;

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
};

// ============ Main Functions ============

/**
 * Apply comprehensive meta tags
 */
export const applyMetaTags = (config: MetaTagConfig): (() => void) => {
  if (typeof document === 'undefined') return () => {};

  const appliedTags: { type: 'meta' | 'link'; attribute?: string; value: string }[] = [];

  // Basic meta tags
  if (config.title) {
    const title = truncate(config.title, TITLE_MAX_LENGTH);
    document.title = title;
  }

  if (config.description) {
    const description = truncate(config.description, DESCRIPTION_MAX_LENGTH);
    setMetaTag('name', 'description', description);
    appliedTags.push({ type: 'meta', attribute: 'name', value: 'description' });
  }

  if (config.keywords?.length) {
    setMetaTag('name', 'keywords', config.keywords.join(', '));
    appliedTags.push({ type: 'meta', attribute: 'name', value: 'keywords' });
  }

  if (config.author) {
    setMetaTag('name', 'author', config.author);
    appliedTags.push({ type: 'meta', attribute: 'name', value: 'author' });
  }

  if (config.robots) {
    setMetaTag('name', 'robots', config.robots);
    appliedTags.push({ type: 'meta', attribute: 'name', value: 'robots' });
  }

  if (config.canonical) {
    setLinkTag('canonical', config.canonical);
    appliedTags.push({ type: 'link', value: 'canonical' });
  }

  if (config.alternates?.length) {
    config.alternates.forEach((alt) => {
      setLinkTag('alternate', alt.href, { hreflang: alt.hreflang });
    });
  }

  // Open Graph tags
  if (config.og) {
    const og = config.og;

    if (og.title) {
      setMetaTag('property', 'og:title', truncate(og.title, OG_TITLE_MAX_LENGTH));
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:title' });
    }

    if (og.description) {
      setMetaTag('property', 'og:description', truncate(og.description, OG_DESCRIPTION_MAX_LENGTH));
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:description' });
    }

    if (og.type) {
      setMetaTag('property', 'og:type', og.type);
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:type' });
    }

    if (og.url) {
      setMetaTag('property', 'og:url', og.url);
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:url' });
    }

    if (og.image) {
      if (typeof og.image === 'string') {
        setMetaTag('property', 'og:image', og.image);
      } else {
        setMetaTag('property', 'og:image', og.image.url);
        if (og.image.width) setMetaTag('property', 'og:image:width', String(og.image.width));
        if (og.image.height) setMetaTag('property', 'og:image:height', String(og.image.height));
        if (og.image.alt) setMetaTag('property', 'og:image:alt', og.image.alt);
      }
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:image' });
    }

    if (og.siteName) {
      setMetaTag('property', 'og:site_name', og.siteName);
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:site_name' });
    }

    if (og.locale) {
      setMetaTag('property', 'og:locale', og.locale);
      appliedTags.push({ type: 'meta', attribute: 'property', value: 'og:locale' });
    }

    if (og.localeAlternates?.length) {
      og.localeAlternates.forEach((locale, i) => {
        setMetaTag('property', `og:locale:alternate`, locale);
      });
    }

    // Article-specific OG tags
    if (og.article) {
      const article = og.article;
      if (article.publishedTime) {
        setMetaTag('property', 'article:published_time', article.publishedTime);
      }
      if (article.modifiedTime) {
        setMetaTag('property', 'article:modified_time', article.modifiedTime);
      }
      if (article.section) {
        setMetaTag('property', 'article:section', article.section);
      }
      if (article.tag?.length) {
        article.tag.forEach((tag) => {
          setMetaTag('property', 'article:tag', tag);
        });
      }
      if (article.author) {
        const authors = Array.isArray(article.author) ? article.author : [article.author];
        authors.forEach((author) => {
          setMetaTag('property', 'article:author', author);
        });
      }
    }

    // Product-specific OG tags
    if (og.product) {
      if (og.product.price) {
        setMetaTag('property', 'product:price:amount', String(og.product.price));
      }
      if (og.product.currency) {
        setMetaTag('property', 'product:price:currency', og.product.currency);
      }
      if (og.product.availability) {
        setMetaTag('property', 'product:availability', og.product.availability);
      }
    }
  }

  // Twitter Card tags
  if (config.twitter) {
    const tw = config.twitter;

    setMetaTag('name', 'twitter:card', tw.card || 'summary_large_image');
    appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:card' });

    if (tw.site) {
      setMetaTag('name', 'twitter:site', tw.site.startsWith('@') ? tw.site : `@${tw.site}`);
      appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:site' });
    }

    if (tw.creator) {
      setMetaTag('name', 'twitter:creator', tw.creator.startsWith('@') ? tw.creator : `@${tw.creator}`);
      appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:creator' });
    }

    if (tw.title) {
      setMetaTag('name', 'twitter:title', truncate(tw.title, TWITTER_TITLE_MAX_LENGTH));
      appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:title' });
    }

    if (tw.description) {
      setMetaTag('name', 'twitter:description', truncate(tw.description, TWITTER_DESCRIPTION_MAX_LENGTH));
      appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:description' });
    }

    if (tw.image) {
      setMetaTag('name', 'twitter:image', tw.image);
      appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:image' });
    }

    if (tw.imageAlt) {
      setMetaTag('name', 'twitter:image:alt', tw.imageAlt);
      appliedTags.push({ type: 'meta', attribute: 'name', value: 'twitter:image:alt' });
    }

    if (tw.player) {
      setMetaTag('name', 'twitter:player', tw.player.url);
      setMetaTag('name', 'twitter:player:width', String(tw.player.width));
      setMetaTag('name', 'twitter:player:height', String(tw.player.height));
    }
  }

  // Mobile/PWA meta tags
  if (config.viewport) {
    setMetaTag('name', 'viewport', config.viewport);
  }

  if (config.themeColor) {
    setMetaTag('name', 'theme-color', config.themeColor);
  }

  if (config.appleMobileWebAppCapable) {
    setMetaTag('name', 'apple-mobile-web-app-capable', 'yes');
  }

  if (config.appleMobileWebAppTitle) {
    setMetaTag('name', 'apple-mobile-web-app-title', config.appleMobileWebAppTitle);
  }

  if (config.appleMobileWebAppStatusBarStyle) {
    setMetaTag('name', 'apple-mobile-web-app-status-bar-style', config.appleMobileWebAppStatusBarStyle);
  }

  // Verification tags
  if (config.googleSiteVerification) {
    setMetaTag('name', 'google-site-verification', config.googleSiteVerification);
  }

  if (config.bingSiteVerification) {
    setMetaTag('name', 'msvalidate.01', config.bingSiteVerification);
  }

  if (config.pinterestSiteVerification) {
    setMetaTag('name', 'p:domain_verify', config.pinterestSiteVerification);
  }

  // Other meta tags
  if (config.referrer) {
    setMetaTag('name', 'referrer', config.referrer);
  }

  if (config.formatDetection) {
    setMetaTag('name', 'format-detection', config.formatDetection);
  }

  if (config.copyright) {
    setMetaTag('name', 'copyright', config.copyright);
  }

  if (config.rating) {
    setMetaTag('name', 'rating', config.rating);
  }

  if (config.revisitAfter) {
    setMetaTag('name', 'revisit-after', config.revisitAfter);
  }

  // Return cleanup function
  return () => {
    appliedTags.forEach((tag) => {
      if (tag.type === 'meta' && tag.attribute) {
        removeMetaTag(tag.attribute as 'name' | 'property', tag.value);
      }
    });
  };
};

/**
 * Generate meta config for common page types
 */
export const generatePageMeta = {
  homepage: (siteName: string, description: string, image?: string): MetaTagConfig => ({
    title: siteName,
    description,
    robots: 'index, follow',
    og: {
      title: siteName,
      description,
      type: 'website',
      siteName,
      image,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description,
      image,
    },
  }),

  article: (
    title: string,
    description: string,
    image: string,
    publishedTime: string,
    author: string,
    section?: string,
    tags?: string[]
  ): MetaTagConfig => ({
    title,
    description,
    robots: 'index, follow',
    og: {
      title,
      description,
      type: 'article',
      image,
      article: {
        publishedTime,
        author,
        section,
        tag: tags,
      },
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image,
    },
  }),

  product: (
    title: string,
    description: string,
    price: number,
    currency: string,
    image: string,
    availability: 'instock' | 'oos' | 'preorder'
  ): MetaTagConfig => ({
    title: `${title} - Shop`,
    description,
    robots: 'index, follow',
    og: {
      title,
      description,
      type: 'product',
      image,
      product: { price, currency, availability },
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image,
    },
  }),

  profile: (name: string, description: string, image?: string): MetaTagConfig => ({
    title: `${name} | Joy House Community`,
    description,
    robots: 'index, follow',
    og: {
      title: name,
      description,
      type: 'profile',
      image,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: name,
      description,
      image,
    },
  }),

  noIndex: (title: string, description: string): MetaTagConfig => ({
    title,
    description,
    robots: 'noindex, nofollow',
  }),
};

/**
 * SEO Analysis - check page SEO quality
 */
export interface SEOAnalysisResult {
  score: number; // 0-100
  issues: {
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion: string;
  }[];
}

export const analyzeSEO = (): SEOAnalysisResult => {
  if (typeof document === 'undefined') {
    return { score: 0, issues: [] };
  }

  const issues: SEOAnalysisResult['issues'] = [];
  let score = 100;

  // Check title
  const title = document.title;
  if (!title) {
    issues.push({
      severity: 'error',
      message: 'Missing page title',
      suggestion: 'Add a descriptive title tag',
    });
    score -= 20;
  } else if (title.length > TITLE_MAX_LENGTH) {
    issues.push({
      severity: 'warning',
      message: `Title too long (${title.length} chars)`,
      suggestion: `Keep title under ${TITLE_MAX_LENGTH} characters`,
    });
    score -= 5;
  } else if (title.length < 30) {
    issues.push({
      severity: 'warning',
      message: 'Title may be too short',
      suggestion: 'Consider making title more descriptive (30-60 chars ideal)',
    });
    score -= 3;
  }

  // Check description
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
  if (!description) {
    issues.push({
      severity: 'error',
      message: 'Missing meta description',
      suggestion: 'Add a meta description for better search snippets',
    });
    score -= 15;
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    issues.push({
      severity: 'warning',
      message: `Description too long (${description.length} chars)`,
      suggestion: `Keep description under ${DESCRIPTION_MAX_LENGTH} characters`,
    });
    score -= 3;
  } else if (description.length < 70) {
    issues.push({
      severity: 'warning',
      message: 'Description may be too short',
      suggestion: 'Consider making description more detailed (70-160 chars ideal)',
    });
    score -= 2;
  }

  // Check OG tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');

  if (!ogTitle || !ogDescription || !ogImage) {
    issues.push({
      severity: 'warning',
      message: 'Incomplete Open Graph tags',
      suggestion: 'Add og:title, og:description, and og:image for social sharing',
    });
    score -= 10;
  }

  // Check Twitter tags
  const twitterCard = document.querySelector('meta[name="twitter:card"]');
  if (!twitterCard) {
    issues.push({
      severity: 'info',
      message: 'Missing Twitter Card tags',
      suggestion: 'Add Twitter Card meta tags for better Twitter sharing',
    });
    score -= 5;
  }

  // Check canonical
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    issues.push({
      severity: 'warning',
      message: 'Missing canonical URL',
      suggestion: 'Add canonical link to prevent duplicate content issues',
    });
    score -= 5;
  }

  // Check H1
  const h1s = document.querySelectorAll('h1');
  if (h1s.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Missing H1 heading',
      suggestion: 'Add exactly one H1 heading to the page',
    });
    score -= 10;
  } else if (h1s.length > 1) {
    issues.push({
      severity: 'warning',
      message: `Multiple H1 headings (${h1s.length})`,
      suggestion: 'Use only one H1 per page',
    });
    score -= 5;
  }

  // Check images without alt
  const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${imagesWithoutAlt.length} images missing alt text`,
      suggestion: 'Add descriptive alt text to all images',
    });
    score -= Math.min(imagesWithoutAlt.length * 2, 10);
  }

  // Check viewport
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push({
      severity: 'error',
      message: 'Missing viewport meta tag',
      suggestion: 'Add viewport meta tag for mobile responsiveness',
    });
    score -= 10;
  }

  return {
    score: Math.max(0, score),
    issues: issues.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
  };
};

export default {
  applyMetaTags,
  generatePageMeta,
  analyzeSEO,
};
