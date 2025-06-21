
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type GetAnalysisInput } from '../schema';
import { getAnalysis } from '../handlers/get_analysis';

const testSessionId = 'test-session-123';

const testInput: GetAnalysisInput = {
  session_id: testSessionId
};

describe('getAnalysis', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should throw error for non-existent session', async () => {
    expect(async () => {
      await getAnalysis({ session_id: 'non-existent' });
    }).toThrow('No analysis data found for this session');
  });

  it('should return complete analysis for existing session', async () => {
    // Create test products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          platform: 'shopee',
          url: 'https://shopee.com/product1',
          average_rating: '4.5',
          total_reviews: 10,
          session_id: testSessionId
        },
        {
          name: 'Product 2',
          platform: 'tiktok_shop',
          url: 'https://tiktok.com/product2',
          average_rating: '3.8',
          total_reviews: 5,
          session_id: testSessionId
        }
      ])
      .returning()
      .execute();

    // Create test reviews
    await db.insert(reviewsTable)
      .values([
        {
          product_id: products[0].id,
          text: 'Great product!',
          rating: 5,
          sentiment: 'positive'
        },
        {
          product_id: products[0].id,
          text: 'Not bad',
          rating: 3,
          sentiment: 'neutral'
        },
        {
          product_id: products[1].id,
          text: 'Poor quality',
          rating: 2,
          sentiment: 'negative'
        }
      ])
      .execute();

    // Create test keywords
    await db.insert(keywordsTable)
      .values([
        {
          session_id: testSessionId,
          keyword: 'quality',
          frequency: 5,
          sentiment: 'positive'
        },
        {
          session_id: testSessionId,
          keyword: 'price',
          frequency: 3,
          sentiment: 'neutral'
        }
      ])
      .execute();

    // Create test recommendations
    await db.insert(recommendationsTable)
      .values([
        {
          session_id: testSessionId,
          title: 'Improve Quality',
          description: 'Focus on product quality improvements',
          priority: 'high',
          category: 'product'
        },
        {
          session_id: testSessionId,
          title: 'Pricing Strategy',
          description: 'Review pricing strategy',
          priority: 'medium',
          category: 'pricing'
        }
      ])
      .execute();

    const result = await getAnalysis(testInput);

    // Verify session ID
    expect(result.session_id).toEqual(testSessionId);

    // Verify products
    expect(result.products).toHaveLength(2);
    expect(result.products[0].name).toEqual('Product 1');
    expect(result.products[0].platform).toEqual('shopee');
    expect(result.products[0].average_rating).toEqual(4.5);
    expect(typeof result.products[0].average_rating).toBe('number');
    expect(result.products[1].name).toEqual('Product 2');
    expect(result.products[1].average_rating).toEqual(3.8);

    // Verify reviews
    expect(result.reviews).toHaveLength(3);
    expect(result.reviews.find(r => r.text === 'Great product!')).toBeDefined();
    expect(result.reviews.find(r => r.text === 'Poor quality')).toBeDefined();

    // Verify keywords
    expect(result.keywords).toHaveLength(2);
    expect(result.keywords.find(k => k.keyword === 'quality')).toBeDefined();
    expect(result.keywords.find(k => k.keyword === 'price')).toBeDefined();

    // Verify recommendations
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations.find(r => r.title === 'Improve Quality')).toBeDefined();
    expect(result.recommendations.find(r => r.priority === 'high')).toBeDefined();

    // Verify summary
    expect(result.summary.total_products).toEqual(2);
    expect(result.summary.total_reviews).toEqual(3);
    expect(result.summary.average_rating).toBeCloseTo(4.3, 1); // Weighted average: (4.5*10 + 3.8*5) / 15 = 64/15 = 4.27
    expect(result.summary.sentiment_distribution.positive).toEqual(1);
    expect(result.summary.sentiment_distribution.neutral).toEqual(1);
    expect(result.summary.sentiment_distribution.negative).toEqual(1);
  });

  it('should handle products with null ratings', async () => {
    // Create product with null rating
    await db.insert(productsTable)
      .values({
        name: 'Product with no rating',
        platform: 'tokopedia',
        url: 'https://tokopedia.com/product',
        average_rating: null,
        total_reviews: 0,
        session_id: testSessionId
      })
      .execute();

    const result = await getAnalysis(testInput);

    expect(result.products).toHaveLength(1);
    expect(result.products[0].average_rating).toBeNull();
    expect(result.summary.average_rating).toEqual(0);
  });

  it('should handle reviews with null sentiment', async () => {
    // Create product first
    const products = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        platform: 'shopee',
        url: 'https://shopee.com/test',
        average_rating: '4.0',
        total_reviews: 1,
        session_id: testSessionId
      })
      .returning()
      .execute();

    // Create review with null sentiment
    await db.insert(reviewsTable)
      .values({
        product_id: products[0].id,
        text: 'Review without sentiment',
        rating: 4,
        sentiment: null
      })
      .execute();

    const result = await getAnalysis(testInput);

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0].sentiment).toBeNull();
    expect(result.summary.sentiment_distribution.neutral).toEqual(1);
    expect(result.summary.sentiment_distribution.positive).toEqual(0);
    expect(result.summary.sentiment_distribution.negative).toEqual(0);
  });
});
