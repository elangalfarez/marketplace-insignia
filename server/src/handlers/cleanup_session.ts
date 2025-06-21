
import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type GetAnalysisInput } from '../schema';
import { eq } from 'drizzle-orm';

export const cleanupSession = async (input: GetAnalysisInput): Promise<{ success: boolean }> => {
  try {
    const { session_id } = input;

    // Delete reviews first (foreign key dependency on products)
    await db.delete(reviewsTable)
      .where(eq(reviewsTable.product_id, 
        db.select({ id: productsTable.id })
          .from(productsTable)
          .where(eq(productsTable.session_id, session_id))
      ))
      .execute();

    // Delete products
    await db.delete(productsTable)
      .where(eq(productsTable.session_id, session_id))
      .execute();

    // Delete keywords
    await db.delete(keywordsTable)
      .where(eq(keywordsTable.session_id, session_id))
      .execute();

    // Delete recommendations
    await db.delete(recommendationsTable)
      .where(eq(recommendationsTable.session_id, session_id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Session cleanup failed:', error);
    throw error;
  }
};
