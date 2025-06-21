
import { z } from 'zod';

// Platform enum
export const platformEnum = z.enum(['shopee', 'tiktok_shop', 'tokopedia']);
export type Platform = z.infer<typeof platformEnum>;

// Sentiment enum
export const sentimentEnum = z.enum(['positive', 'neutral', 'negative']);
export type Sentiment = z.infer<typeof sentimentEnum>;

// Priority enum
export const priorityEnum = z.enum(['high', 'medium', 'low']);
export type Priority = z.infer<typeof priorityEnum>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  platform: platformEnum,
  url: z.string().url(),
  average_rating: z.number().min(0).max(5).nullable(),
  total_reviews: z.number().int().nonnegative(),
  scraped_at: z.coerce.date(),
  session_id: z.string()
});

export type Product = z.infer<typeof productSchema>;

// Review schema
export const reviewSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  text: z.string(),
  rating: z.number().min(1).max(5),
  timestamp: z.coerce.date().nullable(),
  sentiment: sentimentEnum.nullable(),
  created_at: z.coerce.date()
});

export type Review = z.infer<typeof reviewSchema>;

// Keyword schema
export const keywordSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  keyword: z.string(),
  frequency: z.number().int().nonnegative(),
  sentiment: sentimentEnum.nullable()
});

export type Keyword = z.infer<typeof keywordSchema>;

// Recommendation schema
export const recommendationSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: priorityEnum,
  category: z.string(),
  created_at: z.coerce.date()
});

export type Recommendation = z.infer<typeof recommendationSchema>;

// Analysis result schema
export const analysisResultSchema = z.object({
  session_id: z.string(),
  products: z.array(productSchema),
  reviews: z.array(reviewSchema),
  keywords: z.array(keywordSchema),
  recommendations: z.array(recommendationSchema),
  summary: z.object({
    total_products: z.number().int().nonnegative(),
    total_reviews: z.number().int().nonnegative(),
    average_rating: z.number().min(0).max(5),
    sentiment_distribution: z.object({
      positive: z.number().int().nonnegative(),
      neutral: z.number().int().nonnegative(),
      negative: z.number().int().nonnegative()
    })
  })
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// Input schemas
export const searchInputSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  platforms: z.array(platformEnum).min(1, "At least one platform must be selected").max(3),
  session_id: z.string().optional() // Generated if not provided
});

export type SearchInput = z.infer<typeof searchInputSchema>;

export const getAnalysisInputSchema = z.object({
  session_id: z.string()
});

export type GetAnalysisInput = z.infer<typeof getAnalysisInputSchema>;

export const cleanupSessionInputSchema = z.object({
  session_id: z.string()
});

export type CleanupSessionInput = z.infer<typeof cleanupSessionInputSchema>;

// Response schemas
export const searchResponseSchema = z.object({
  session_id: z.string(),
  status: z.enum(['started', 'in_progress', 'completed', 'failed']),
  message: z.string().optional()
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
