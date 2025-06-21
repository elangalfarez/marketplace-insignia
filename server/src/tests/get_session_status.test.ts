
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type GetAnalysisInput } from '../schema';
import { getSessionStatus } from '../handlers/get_session_status';

const testSessionId = 'test-session-123';

const testInput: GetAnalysisInput = {
  session_id: testSessionId
};

describe('getSessionStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return failed status for non-existent session', async () => {
    const result = await getSessionStatus({ session_id: 'non-existent' });

    expect(result.session_id).toEqual('non-existent');
    expect(result.status).toEqual('failed');
    expect(result.progress).toEqual(0);
    expect(result.message).toEqual('Session not found');
  });

  it('should return started status when only products exist', async () => {
    // Create a product for the session
    await db.insert(productsTable).values({
      name: 'Test Product',
      platform: 'shopee',
      url: 'https://shopee.com/test',
      average_rating: '4.5',
      total_reviews: 10,
      session_id: testSessionId
    }).execute();

    const result = await getSessionStatus(testInput);

    expect(result.session_id).toEqual(testSessionId);
    expect(result.status).toEqual('started');
    expect(result.progress).toEqual(25);
    expect(result.message).toEqual('Products scraped, analyzing reviews...');
  });

  it('should return in_progress status when products and reviews exist', async () => {
    // Create a product
    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      platform: 'shopee',
      url: 'https://shopee.com/test',
      average_rating: '4.5',
      total_reviews: 10,
      session_id: testSessionId
    }).returning().execute();

    // Create a review for the product
    await db.insert(reviewsTable).values({
      product_id: product[0].id,
      text: 'Great product!',
      rating: 5,
      sentiment: 'positive'
    }).execute();

    const result = await getSessionStatus(testInput);

    expect(result.session_id).toEqual(testSessionId);
    expect(result.status).toEqual('in_progress');
    expect(result.progress).toEqual(50);
    expect(result.message).toEqual('Reviews analyzed, extracting keywords...');
  });

  it('should return in_progress status when products, reviews, and keywords exist', async () => {
    // Create a product
    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      platform: 'shopee',
      url: 'https://shopee.com/test',
      average_rating: '4.5',
      total_reviews: 10,
      session_id: testSessionId
    }).returning().execute();

    // Create a review for the product
    await db.insert(reviewsTable).values({
      product_id: product[0].id,
      text: 'Great product!',
      rating: 5,
      sentiment: 'positive'
    }).execute();

    // Create a keyword for the session
    await db.insert(keywordsTable).values({
      session_id: testSessionId,
      keyword: 'quality',
      frequency: 5,
      sentiment: 'positive'
    }).execute();

    const result = await getSessionStatus(testInput);

    expect(result.session_id).toEqual(testSessionId);
    expect(result.status).toEqual('in_progress');
    expect(result.progress).toEqual(75);
    expect(result.message).toEqual('Keywords extracted, generating recommendations...');
  });

  it('should return completed status when all data exists', async () => {
    // Create a product
    const product = await db.insert(productsTable).values({
      name: 'Test Product',
      platform: 'shopee',
      url: 'https://shopee.com/test',
      average_rating: '4.5',
      total_reviews: 10,
      session_id: testSessionId
    }).returning().execute();

    // Create a review for the product
    await db.insert(reviewsTable).values({
      product_id: product[0].id,
      text: 'Great product!',
      rating: 5,
      sentiment: 'positive'
    }).execute();

    // Create a keyword for the session
    await db.insert(keywordsTable).values({
      session_id: testSessionId,
      keyword: 'quality',
      frequency: 5,
      sentiment: 'positive'
    }).execute();

    // Create a recommendation for the session
    await db.insert(recommendationsTable).values({
      session_id: testSessionId,
      title: 'Improve product quality',
      description: 'Based on reviews, focus on quality improvements',
      priority: 'high',
      category: 'Product Quality'
    }).execute();

    const result = await getSessionStatus(testInput);

    expect(result.session_id).toEqual(testSessionId);
    expect(result.status).toEqual('completed');
    expect(result.progress).toEqual(100);
    expect(result.message).toEqual('Analysis completed successfully');
  });

  it('should handle multiple sessions correctly', async () => {
    const session1 = 'session-1';
    const session2 = 'session-2';

    // Create products for both sessions
    await db.insert(productsTable).values([
      {
        name: 'Product 1',
        platform: 'shopee',
        url: 'https://shopee.com/test1',
        average_rating: '4.0',
        total_reviews: 5,
        session_id: session1
      },
      {
        name: 'Product 2',
        platform: 'tiktok_shop',
        url: 'https://tiktok.com/test2',
        average_rating: '3.5',
        total_reviews: 8,
        session_id: session2
      }
    ]).execute();

    // Check status for session1
    const result1 = await getSessionStatus({ session_id: session1 });
    expect(result1.session_id).toEqual(session1);
    expect(result1.status).toEqual('started');

    // Check status for session2
    const result2 = await getSessionStatus({ session_id: session2 });
    expect(result2.session_id).toEqual(session2);
    expect(result2.status).toEqual('started');
  });
});
