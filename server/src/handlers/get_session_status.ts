import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type GetAnalysisInput } from '../schema';
import { eq, count } from 'drizzle-orm';

export const getSessionStatus = async (input: GetAnalysisInput): Promise<{
  session_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message?: string;
}> => {
  try {
    const { session_id } = input;

    // Check if session exists by looking for products
    const productsCount = await db.select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.session_id, session_id))
      .execute();

    const totalProducts = productsCount[0]?.count || 0;

    // If no products found, session doesn't exist or hasn't started yet
    if (totalProducts === 0) {
      return {
        session_id,
        status: 'failed',
        progress: 0,
        message: 'Session not found or analysis not started'
      };
    }

    // Count reviews for this session
    const reviewsCount = await db.select({ count: count() })
      .from(reviewsTable)
      .innerJoin(productsTable, eq(reviewsTable.product_id, productsTable.id))
      .where(eq(productsTable.session_id, session_id))
      .execute();

    const totalReviews = reviewsCount[0]?.count || 0;

    // Count keywords for this session
    const keywordsCount = await db.select({ count: count() })
      .from(keywordsTable)
      .where(eq(keywordsTable.session_id, session_id))
      .execute();

    const totalKeywords = keywordsCount[0]?.count || 0;

    // Count recommendations for this session
    const recommendationsCount = await db.select({ count: count() })
      .from(recommendationsTable)
      .where(eq(recommendationsTable.session_id, session_id))
      .execute();

    const totalRecommendations = recommendationsCount[0]?.count || 0;

    // Determine status based on data completeness
    let status: 'started' | 'in_progress' | 'completed' | 'failed';
    let progress: number;
    let message: string;

    if (totalProducts > 0 && totalReviews === 0) {
      // Products scraped but no reviews yet
      status = 'started';
      progress = 25;
      message = `Products scraped (${totalProducts} found), analyzing reviews...`;
    } else if (totalReviews > 0 && totalKeywords === 0) {
      // Reviews available but no keyword analysis
      status = 'in_progress';
      progress = 50;
      message = `Reviews analyzed (${totalReviews} found), extracting keywords...`;
    } else if (totalKeywords > 0 && totalRecommendations === 0) {
      // Keywords available but no recommendations
      status = 'in_progress';
      progress = 75;
      message = `Keywords extracted (${totalKeywords} found), generating recommendations...`;
    } else if (totalRecommendations > 0) {
      // All data available
      status = 'completed';
      progress = 100;
      message = `Analysis completed successfully! ${totalProducts} products, ${totalReviews} reviews, ${totalKeywords} keywords, ${totalRecommendations} recommendations`;
    } else {
      // Fallback for edge cases
      status = 'in_progress';
      progress = 10;
      message = 'Processing data...';
    }

    return {
      session_id,
      status,
      progress,
      message
    };
  } catch (error) {
    console.error('Get session status failed:', error);
    return {
      session_id: input.session_id,
      status: 'failed',
      progress: 0,
      message: 'Error checking session status'
    };
  }
};