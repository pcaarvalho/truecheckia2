import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { env } from '@/config/env';

interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  noIndex?: boolean;
}

// Default SEO configuration
const DEFAULT_SEO: Required<SEOConfig> = {
  title: 'TrueCheckIA - AI Content Detector | 95% Accuracy',
  description: 'Detect AI-generated content with 95% accuracy. Advanced AI detection technology trusted by 10,000+ professionals. Try free - no credit card required.',
  keywords: 'AI detection, content authenticity, AI text detector, plagiarism detection, artificial intelligence, content verification',
  image: `${env.appUrl}/og-image.jpg`,
  url: env.appUrl,
  type: 'website',
  author: 'TrueCheckIA',
  publishedTime: '',
  modifiedTime: '',
  section: '',
  tags: [],
  noIndex: false,
};

// Page-specific SEO configurations
const PAGE_SEO: Record<string, Partial<SEOConfig>> = {
  '/': {
    title: 'TrueCheckIA - AI Content Detector | 95% Accuracy',
    description: 'Detect AI-generated content with 95% accuracy. Advanced AI detection technology trusted by 10,000+ professionals worldwide. Try free - no credit card required.',
    keywords: 'AI detection, content authenticity, AI text detector, plagiarism detection, artificial intelligence, content verification, ChatGPT detector, GPT detector',
    type: 'website',
  },
  '/login': {
    title: 'Login - TrueCheckIA',
    description: 'Access your TrueCheckIA account to start detecting AI-generated content with industry-leading accuracy.',
    noIndex: true,
  },
  '/register': {
    title: 'Sign Up - TrueCheckIA',
    description: 'Create your TrueCheckIA account and start detecting AI content for free. No credit card required.',
    keywords: 'sign up, create account, AI detection, free trial',
  },
  '/dashboard': {
    title: 'Dashboard - TrueCheckIA',
    description: 'Your TrueCheckIA dashboard with analytics, usage statistics, and recent AI content detections.',
    noIndex: true,
  },
  '/analysis': {
    title: 'AI Content Analysis - TrueCheckIA',
    description: 'Analyze your content for AI generation with our advanced detection algorithms. Get detailed reports and confidence scores.',
    keywords: 'AI analysis, content analysis, AI detection tool, text analysis',
  },
  '/history': {
    title: 'Analysis History - TrueCheckIA',
    description: 'View your complete history of AI content detection analyses with detailed results and insights.',
    noIndex: true,
  },
  '/profile': {
    title: 'Profile Settings - TrueCheckIA',
    description: 'Manage your TrueCheckIA account settings, subscription, and preferences.',
    noIndex: true,
  },
  '/pricing': {
    title: 'Pricing Plans - TrueCheckIA',
    description: 'Choose the perfect TrueCheckIA plan for your needs. Free plan available with premium options for professionals.',
    keywords: 'pricing, plans, subscription, AI detection pricing, premium features',
  },
};

// Utility function to set meta tag
const setMetaTag = (name: string, content: string, property = false) => {
  const attribute = property ? 'property' : 'name';
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
};

// Utility function to set title
const setTitle = (title: string) => {
  document.title = title;
};

// Utility function to set canonical URL
const setCanonical = (url: string) => {
  let element = document.querySelector('link[rel="canonical"]');
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', url);
};

// Main SEO hook
export const useSEO = (customConfig?: SEOConfig) => {
  const location = useLocation();

  useEffect(() => {
    // Get page-specific config
    const pageConfig = PAGE_SEO[location.pathname] || {};
    
    // Merge configurations
    const seoConfig = {
      ...DEFAULT_SEO,
      ...pageConfig,
      ...customConfig,
    };

    // Set document title
    setTitle(seoConfig.title);

    // Set meta description
    setMetaTag('description', seoConfig.description);

    // Set meta keywords
    setMetaTag('keywords', seoConfig.keywords);

    // Set author
    setMetaTag('author', seoConfig.author);

    // Set robots directive
    if (seoConfig.noIndex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Set Open Graph tags
    setMetaTag('og:title', seoConfig.title, true);
    setMetaTag('og:description', seoConfig.description, true);
    setMetaTag('og:type', seoConfig.type, true);
    setMetaTag('og:url', seoConfig.url, true);
    setMetaTag('og:image', seoConfig.image, true);
    setMetaTag('og:site_name', 'TrueCheckIA', true);

    // Set Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:site', '@truecheckia');
    setMetaTag('twitter:title', seoConfig.title);
    setMetaTag('twitter:description', seoConfig.description);
    setMetaTag('twitter:image', seoConfig.image);

    // Set article-specific tags if type is article
    if (seoConfig.type === 'article') {
      if (seoConfig.author) {
        setMetaTag('article:author', seoConfig.author, true);
      }
      if (seoConfig.publishedTime) {
        setMetaTag('article:published_time', seoConfig.publishedTime, true);
      }
      if (seoConfig.modifiedTime) {
        setMetaTag('article:modified_time', seoConfig.modifiedTime, true);
      }
      if (seoConfig.section) {
        setMetaTag('article:section', seoConfig.section, true);
      }
      if (seoConfig.tags.length > 0) {
        seoConfig.tags.forEach(tag => {
          setMetaTag('article:tag', tag, true);
        });
      }
    }

    // Set canonical URL
    const fullUrl = `${env.appUrl}${location.pathname}`;
    setCanonical(seoConfig.url || fullUrl);

    // Set additional meta tags for better SEO
    setMetaTag('theme-color', '#8B5CF6');
    setMetaTag('msapplication-TileColor', '#8B5CF6');
    setMetaTag('apple-mobile-web-app-capable', 'yes');
    setMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');

  }, [location.pathname, customConfig]);
};

// Hook for structured data (JSON-LD)
export const useStructuredData = (data: object) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    script.id = 'structured-data';

    // Remove existing structured data
    const existing = document.getElementById('structured-data');
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(script);

    return () => {
      const element = document.getElementById('structured-data');
      if (element) {
        element.remove();
      }
    };
  }, [data]);
};

// Predefined structured data for common pages
export const STRUCTURED_DATA = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TrueCheckIA',
    url: env.appUrl,
    logo: `${env.appUrl}/logo.png`,
    description: 'Advanced AI content detection technology trusted by professionals worldwide.',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/truecheckia',
      'https://linkedin.com/company/truecheckia',
    ],
  },
  
  softwareApplication: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TrueCheckIA',
    description: 'Detect AI-generated content with 95% accuracy using advanced machine learning algorithms.',
    url: env.appUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free plan with premium options available',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  },

  faq: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How accurate is TrueCheckIA?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TrueCheckIA achieves 95% accuracy in detecting AI-generated content using advanced machine learning algorithms and multiple detection models.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free plan available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, TrueCheckIA offers a free plan with limited credits. No credit card required to get started.',
        },
      },
      {
        '@type': 'Question',
        name: 'What types of content can be analyzed?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TrueCheckIA can analyze various types of text content including articles, essays, emails, social media posts, and more.',
        },
      },
    ],
  },
};