
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type SearchInput } from '../schema';
import { searchProducts } from '../handlers/search_products';
import { eq } from 'drizzle-orm';

const testInput: SearchInput = {
  query: 'smartphone',
  platforms: ['shopee', 'tiktok_shop']
};

describe('searchProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start a new search session', async () => {
    const result = await searchProducts(testInput);

    expect(result.status).toEqual('started');
    expect(result.session_id).toBeDefined();
    expect(typeof result.session_id).toBe('string');
    expect(result.session_id.length).toBeGreaterThan(0);
    expect(result.message).toContain('smartphone');
    expect(result.message).toContain('shopee');
    expect(result.message).toContain('tiktok_shop');
  });

  it('should use provided session_id', async () => {
    const customSessionId = 'custom-session-123';
    const inputWithSession: SearchInput = {
      ...testInput,
      session_id: customSessionId
    };

    const result = await searchProducts(inputWithSession);

    expect(result.session_id).toEqual(customSessionId);
    expect(result.status).toEqual('started');
  });

  it('should return completed status if products already exist for session', async () => {
    const sessionId = 'existing-session-456';

    // Create a product for this session first
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        platform: 'shopee',
        url: 'https://shopee.com/test',
        average_rating: '4.5',
        total_reviews: 100,
        session_id: sessionId
      })
      .execute();

    const inputWithExistingSession: SearchInput = {
      ...testInput,
      session_id: sessionId
    };

    const result = await searchProducts(inputWithExistingSession);

    expect(result.session_id).toEqual(sessionId);
    expect(result.status).toEqual('completed');
    expect(result.message).toContain('already completed');
  });

  it('should handle single platform', async () => {
    const singlePlatformInput: SearchInput = {
      query: 'laptop',
      platforms: ['tokopedia']
    };

    const result = await searchProducts(singlePlatformInput);

    expect(result.status).toEqual('started');
    expect(result.message).toContain('laptop');
    expect(result.message).toContain('tokopedia');
    expect(result.message).not.toContain('shopee');
    expect(result.message).not.toContain('tiktok_shop');
  });

  it('should handle all platforms', async () => {
    const allPlatformsInput: SearchInput = {
      query: 'headphones',
      platforms: ['shopee', 'tiktok_shop', 'tokopedia']
    };

    const result = await searchProducts(allPlatformsInput);

    expect(result.status).toEqual('started');
    expect(result.message).toContain('headphones');
    expect(result.message).toContain('shopee');
    expect(result.message).toContain('tiktok_shop');
    expect(result.message).toContain('tokopedia');
  });

  it('should generate unique session IDs for different searches', async () => {
    const result1 = await searchProducts(testInput);
    const result2 = await searchProducts(testInput);

    expect(result1.session_id).toBeDefined();
    expect(result2.session_id).toBeDefined();
    expect(result1.session_id).not.toEqual(result2.session_id);
    expect(result1.status).toEqual('started');
    expect(result2.status).toEqual('started');
  });
});
