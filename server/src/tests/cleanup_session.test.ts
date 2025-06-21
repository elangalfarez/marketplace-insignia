import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { cleanupSession } from '../handlers/cleanup_session';
import { eq } from 'drizzle-orm';

const testSessionId = 'test-session-123';

describe('cleanupSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should clean up all session data', async () => {
    // Create test data for the session
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        platform: 'shopee',
        url: 'https://shopee.com/test',
        total_reviews: 10,
        session_id: testSessionId
      })
      .returning()
      .execute();

    await db.insert(reviewsTable)
      .values({
        product_id: product[0].id,
        text: 'Great product!',
        rating: 5
      })
      .execute();

    await db.insert(keywordsTable)
      .values({
        session_id: testSessionId,
        keyword: 'quality',
        frequency: 5,
        sentiment: 'positive'
      })
      .execute();

    await db.insert(recommendationsTable)
      .values({
        session_id: testSessionId,
        title: 'Improve packaging',
        description: 'Consider better packaging materials',
        priority: 'medium',
        category: 'product improvement'
      })
      .execute();

    // Execute cleanup
    const result = await cleanupSession({ session_id: testSessionId });

    // Verify response structure
    expect(result.session_id).toBe(testSessionId);
    expect(result.message).toBe('Session data cleaned up successfully');
    expect(result.deleted_counts.products).toBe(1);
    expect(result.deleted_counts.reviews).toBe(1);
    expect(result.deleted_counts.keywords).toBe(1);
    expect(result.deleted_counts.recommendations).toBe(1);

    // Verify all data is deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.session_id, testSessionId))
      .execute();

    const keywords = await db.select()
      .from(keywordsTable)
      .where(eq(keywordsTable.session_id, testSessionId))
      .execute();

    const recommendations = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.session_id, testSessionId))
      .execute();

    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.product_id, product[0].id))
      .execute();

    expect(products).toHaveLength(0);
    expect(keywords).toHaveLength(0);
    expect(recommendations).toHaveLength(0);
    expect(reviews).toHaveLength(0);
  });

  it('should not affect other sessions', async () => {
    const otherSessionId = 'other-session-456';

    // Create data for both sessions
    await db.insert(productsTable)
      .values([
        {
          name: 'Test Product 1',
          platform: 'shopee',
          url: 'https://shopee.com/test1',
          total_reviews: 5,
          session_id: testSessionId
        },
        {
          name: 'Test Product 2',
          platform: 'tokopedia',
          url: 'https://tokopedia.com/test2',
          total_reviews: 8,
          session_id: otherSessionId
        }
      ])
      .execute();

    await db.insert(keywordsTable)
      .values([
        {
          session_id: testSessionId,
          keyword: 'quality',
          frequency: 3
        },
        {
          session_id: otherSessionId,
          keyword: 'durability',
          frequency: 7
        }
      ])
      .execute();

    // Clean up only the test session
    const result = await cleanupSession({ session_id: testSessionId });
    expect(result.session_id).toBe(testSessionId);
    expect(result.deleted_counts.products).toBe(1);
    expect(result.deleted_counts.keywords).toBe(1);

    // Verify test session data is deleted
    const testSessionProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.session_id, testSessionId))
      .execute();

    const testSessionKeywords = await db.select()
      .from(keywordsTable)
      .where(eq(keywordsTable.session_id, testSessionId))
      .execute();

    expect(testSessionProducts).toHaveLength(0);
    expect(testSessionKeywords).toHaveLength(0);

    // Verify other session data remains
    const otherSessionProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.session_id, otherSessionId))
      .execute();

    const otherSessionKeywords = await db.select()
      .from(keywordsTable)
      .where(eq(keywordsTable.session_id, otherSessionId))
      .execute();

    expect(otherSessionProducts).toHaveLength(1);
    expect(otherSessionProducts[0].name).toEqual('Test Product 2');
    expect(otherSessionKeywords).toHaveLength(1);
    expect(otherSessionKeywords[0].keyword).toEqual('durability');
  });

  it('should handle non-existent session gracefully', async () => {
    const nonExistentSessionId = 'non-existent-session';

    const result = await cleanupSession({ session_id: nonExistentSessionId });
    expect(result.session_id).toBe(nonExistentSessionId);
    expect(result.message).toBe('Session data cleaned up successfully');
    expect(result.deleted_counts.products).toBe(0);
    expect(result.deleted_counts.reviews).toBe(0);
    expect(result.deleted_counts.keywords).toBe(0);
    expect(result.deleted_counts.recommendations).toBe(0);
  });
});