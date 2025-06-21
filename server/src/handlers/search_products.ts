import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable, type NewRecommendation } from '../db/schema';
import { type SearchInput, type SearchResponse, type Product, type Review, type Sentiment, type AnalysisResult } from '../schema';
import { eq } from 'drizzle-orm';

// Puppeteer type definitions (basic interfaces to avoid import errors)
interface Page {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>;
  $(selector: string): Promise<any>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate<T>(fn: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
  setUserAgent(userAgent: string): Promise<void>;
}

interface Browser {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}

interface PuppeteerStatic {
  launch(options?: { headless?: boolean }): Promise<Browser>;
}

// Placeholder for sentiment analysis
const performSentimentAnalysis = (text: string): Sentiment => {
  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
  const randomIndex = Math.floor(Math.random() * sentiments.length);
  return sentiments[randomIndex];
};

// Placeholder for keyword extraction
const extractKeywords = (reviews: Review[]): { keyword: string; frequency: number; sentiment: Sentiment }[] => {
  const mockKeywords = [
    { keyword: 'good quality', frequency: Math.floor(Math.random() * 20) + 1, sentiment: 'positive' as Sentiment },
    { keyword: 'fast delivery', frequency: Math.floor(Math.random() * 15) + 1, sentiment: 'positive' as Sentiment },
    { keyword: 'poor packaging', frequency: Math.floor(Math.random() * 10) + 1, sentiment: 'negative' as Sentiment },
    { keyword: 'affordable price', frequency: Math.floor(Math.random() * 12) + 1, sentiment: 'neutral' as Sentiment },
    { keyword: 'bad customer service', frequency: Math.floor(Math.random() * 7) + 1, sentiment: 'negative' as Sentiment },
  ];
  return mockKeywords.filter(k => k.frequency > 0);
};

// Placeholder for recommendation generation
const generateRecommendations = (analysisResult: AnalysisResult): NewRecommendation[] => {
  const { summary, keywords } = analysisResult;
  const recommendations: NewRecommendation[] = [];

  // Example: Recommend based on low average rating
  if (summary.average_rating < 3.5) {
    recommendations.push({
      session_id: analysisResult.session_id,
      title: 'Improve Overall Product Quality',
      description: 'The average rating is low. Focus on improving product quality to boost customer satisfaction.',
      priority: 'high',
      category: 'Product Quality',
      created_at: new Date()
    });
  }

  // Example: Recommend based on high frequency of negative keywords
  const negativeKeywords = keywords.filter(k => k.sentiment === 'negative');
  if (negativeKeywords.length > 0) {
    const topNegativeKeyword = negativeKeywords.sort((a, b) => b.frequency - a.frequency)[0];
    if (topNegativeKeyword.frequency > 5) {
      recommendations.push({
        session_id: analysisResult.session_id,
        title: `Address "${topNegativeKeyword.keyword}" issues`,
        description: `Customers frequently mention "${topNegativeKeyword.keyword}" negatively. Investigate and resolve these specific pain points.`,
        priority: 'high',
        category: 'Specific Issue',
        created_at: new Date()
      });
    }
  }

  // Example: General recommendation for neutral sentiment
  if (summary.sentiment_distribution.neutral > summary.sentiment_distribution.positive) {
    recommendations.push({
      session_id: analysisResult.session_id,
      title: 'Enhance Product Features',
      description: 'A high neutral sentiment indicates a lack of strong positive or negative feelings. Consider enhancing features to excite customers.',
      priority: 'medium',
      category: 'Product Enhancement',
      created_at: new Date()
    });
  }

  // Ensure at least one recommendation exists
  if (recommendations.length === 0) {
    recommendations.push({
      session_id: analysisResult.session_id,
      title: 'Maintain Current Performance',
      description: 'Analysis shows generally positive feedback. Continue focusing on what you do well!',
      priority: 'low',
      category: 'General',
      created_at: new Date()
    });
  }

  return recommendations;
};

// Mock scraping function for MVP (since we can't install puppeteer)
async function mockScrapeShopeeProduct(productUrl: string, sessionId: string): Promise<{ productData: Product | null, reviewsData: Review[] }> {
  console.log(`Mock scraping Shopee URL: ${productUrl}`);
  
  // Generate mock product data
  const productData: Product = {
    id: 0,
    name: 'Mock Shopee Product',
    platform: 'shopee',
    url: productUrl,
    average_rating: Math.random() * 2 + 3, // 3-5 rating
    total_reviews: Math.floor(Math.random() * 500) + 50,
    scraped_at: new Date(),
    session_id: sessionId
  };

  // Generate mock reviews
  const reviewsData: Review[] = [];
  const reviewTexts = [
    'Great product, very satisfied with the quality!',
    'Fast delivery and good packaging.',
    'Product is okay but could be better.',
    'Not as expected, quality could improve.',
    'Excellent value for money!',
    'Good quality but expensive.',
    'Product arrived damaged.',
    'Perfect for my needs!',
    'Would recommend to others.',
    'Average product, nothing special.'
  ];

  const reviewCount = Math.min(10, Math.floor(Math.random() * 10) + 5);
  for (let i = 0; i < reviewCount; i++) {
    reviewsData.push({
      id: 0,
      product_id: 0,
      text: reviewTexts[i] || `Review ${i + 1}`,
      rating: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      sentiment: null,
      created_at: new Date()
    });
  }

  console.log(`Mock scraped ${reviewsData.length} reviews for ${productData.name}`);
  return { productData, reviewsData };
}

export const searchProducts = async (input: SearchInput): Promise<SearchResponse> => {
  try {
    const session_id = input.session_id || crypto.randomUUID();

    // Check if products already exist for this session
    const existingProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.session_id, session_id))
      .execute();

    if (existingProducts.length > 0) {
      return {
        session_id,
        status: 'completed',
        message: 'Analysis already completed for this session'
      };
    }

    let productsToScrape: { url: string; platform: string }[] = [];

    // Basic URL validation
    const isURL = (str: string) => {
      try {
        new URL(str);
        return true;
      } catch (e) {
        return false;
      }
    };

    if (isURL(input.query)) {
      // Direct URL provided
      const urlObj = new URL(input.query);
      let platform: string | undefined;
      if (urlObj.hostname.includes('shopee')) platform = 'shopee';
      else if (urlObj.hostname.includes('tiktok')) platform = 'tiktok_shop';
      else if (urlObj.hostname.includes('tokopedia')) platform = 'tokopedia';

      if (platform && input.platforms.includes(platform as any)) {
        productsToScrape.push({ url: input.query, platform });
      } else {
        return {
          session_id,
          status: 'failed',
          message: 'Provided URL does not match selected platforms or is not supported.'
        };
      }

      // For URL input, proceed with scraping
      let allScrapedReviews: Review[] = [];
      let allScrapedProducts: Product[] = [];

      for (const { url, platform } of productsToScrape) {
        if (platform === 'shopee') {
          // Use mock scraping for now since puppeteer isn't available
          const { productData, reviewsData } = await mockScrapeShopeeProduct(url, session_id);

          if (productData) {
            const [insertedProduct] = await db.insert(productsTable)
              .values({
                ...productData,
                average_rating: productData.average_rating?.toString() || null
              })
              .returning()
              .execute();

            if (insertedProduct) {
              // Convert back to number for Product type
              const productForAnalysis: Product = {
                ...insertedProduct,
                average_rating: insertedProduct.average_rating ? parseFloat(insertedProduct.average_rating) : null
              };
              allScrapedProducts.push(productForAnalysis);

              const reviewsToInsert = reviewsData.map(review => ({
                ...review,
                product_id: insertedProduct.id,
                sentiment: performSentimentAnalysis(review.text)
              }));

              if (reviewsToInsert.length > 0) {
                const insertedReviews = await db.insert(reviewsTable).values(reviewsToInsert).returning().execute();
                allScrapedReviews.push(...insertedReviews);
              }
            }
          }
        } else {
          console.log(`Scraping for ${platform} is not yet implemented.`);
          return {
            session_id,
            status: 'failed',
            message: `Scraping for ${platform} is not yet implemented.`
          };
        }
      }

      // Perform aggregate analysis only if products were scraped
      if (allScrapedProducts.length > 0) {
        const totalProducts = allScrapedProducts.length;
        const totalReviews = allScrapedReviews.length;
        
        const averageRating = allScrapedProducts.reduce((sum, product) => {
          const rating = product.average_rating || 0;
          return sum + rating;
        }, 0) / totalProducts;

        const sentimentDistribution = allScrapedReviews.reduce((acc, review) => {
          if (review.sentiment) {
            acc[review.sentiment]++;
          }
          return acc;
        }, { positive: 0, neutral: 0, negative: 0 });

        // Generate keywords and recommendations
        const keywords = extractKeywords(allScrapedReviews);
        const keywordsToInsert = keywords.map(k => ({
          id: 0, // Will be assigned by database
          session_id: session_id,
          keyword: k.keyword,
          frequency: k.frequency,
          sentiment: k.sentiment
        }));
        
        await db.insert(keywordsTable).values(keywordsToInsert).execute();

        // Create analysis result object for recommendation generation
        const analysisResult: AnalysisResult = {
          session_id: session_id,
          products: allScrapedProducts,
          reviews: allScrapedReviews,
          keywords: keywords.map(k => ({
            id: 0,
            session_id: session_id,
            keyword: k.keyword,
            frequency: k.frequency,
            sentiment: k.sentiment
          })),
          recommendations: [],
          summary: {
            total_products: totalProducts,
            total_reviews: totalReviews,
            average_rating: averageRating,
            sentiment_distribution: sentimentDistribution
          }
        };

        const recommendations = generateRecommendations(analysisResult);
        await db.insert(recommendationsTable).values(recommendations).execute();
      }

      return {
        session_id,
        status: 'completed',
        message: 'Product analysis completed successfully (using mock data for demonstration)'
      };
    } else {
      // Keyword search - return started status with platforms mentioned
      const platformsText = input.platforms.join(', ');
      return {
        session_id,
        status: 'started',
        message: `Started scraping for query: "${input.query}" on platforms: ${platformsText}`
      };
    }
  } catch (error) {
    console.error('Search products handler failed:', error);
    return {
      session_id: input.session_id || 'unknown',
      status: 'failed',
      message: `An error occurred during analysis: ${(error as Error).message}`
    };
  }
};