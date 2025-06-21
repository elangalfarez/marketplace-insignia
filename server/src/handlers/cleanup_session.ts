import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type CleanupSessionInput } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const cleanupSession = async (input: CleanupSessionInput): Promise<{
  session_id: string;
  message: string;
  deleted_counts: {
    products: number;
    reviews: number;
    keywords: number;
    recommendations: number;
  };
}> => {
  try {
    const { session_id } = input;

    // Get product IDs for this session before deletion
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.session_id, session_id))
      .execute();

    const productIds = products.map(p => p.id);

    // Delete reviews first (foreign key constraint)
    let deletedReviews = 0;
    if (productIds.length > 0) {
      const reviewsToDelete = await db.select()
        .from(reviewsTable)
        .where(inArray(reviewsTable.product_id, productIds))
        .execute();
      
      deletedReviews = reviewsToDelete.length;
      
      if (deletedReviews > 0) {
        await db.delete(reviewsTable)
          .where(inArray(reviewsTable.product_id, productIds))
          .execute();
      }
    }

    // Delete keywords
    const keywordsToDelete = await db.select()
      .from(keywordsTable)
      .where(eq(keywordsTable.session_id, session_id))
      .execute();

    const deletedKeywords = keywordsToDelete.length;
    if (deletedKeywords > 0) {
      await db.delete(keywordsTable)
        .where(eq(keywordsTable.session_id, session_id))
        .execute();
    }

    // Delete recommendations
    const recommendationsToDelete = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.session_id, session_id))
      .execute();

    const deletedRecommendations = recommendationsToDelete.length;
    if (deletedRecommendations > 0) {
      await db.delete(recommendationsTable)
        .where(eq(recommendationsTable.session_id, session_id))
        .execute();
    }

    // Delete products last
    const deletedProducts = products.length;
    if (deletedProducts > 0) {
      await db.delete(productsTable)
        .where(eq(productsTable.session_id, session_id))
        .execute();
    }

    return {
      session_id,
      message: 'Session data cleaned up successfully',
      deleted_counts: {
        products: deletedProducts,
        reviews: deletedReviews,
        keywords: deletedKeywords,
        recommendations: deletedRecommendations
      }
    };
  } catch (error) {
    console.error('Session cleanup failed:', error);
    throw error;
  }
};