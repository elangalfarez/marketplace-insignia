
import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type GetAnalysisInput, type AnalysisResult } from '../schema';
import { eq } from 'drizzle-orm';

export const getAnalysis = async (input: GetAnalysisInput): Promise<AnalysisResult> => {
  try {
    const { session_id } = input;

    // Fetch products for the session
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.session_id, session_id))
      .execute();

    // Convert numeric fields to numbers
    const processedProducts = products.map(product => ({
      ...product,
      average_rating: product.average_rating ? parseFloat(product.average_rating) : null
    }));

    // Fetch reviews for all products in the session
    const productIds = products.map(p => p.id);
    let reviews: any[] = [];
    
    if (productIds.length > 0) {
      // Get reviews for products in this session
      const reviewsWithProducts = await db.select({
        review: reviewsTable,
        product: productsTable
      })
        .from(reviewsTable)
        .innerJoin(productsTable, eq(reviewsTable.product_id, productsTable.id))
        .where(eq(productsTable.session_id, session_id))
        .execute();

      reviews = reviewsWithProducts.map(result => result.review);
    }

    // Fetch keywords for the session
    const keywords = await db.select()
      .from(keywordsTable)
      .where(eq(keywordsTable.session_id, session_id))
      .execute();

    // Fetch recommendations for the session
    const recommendations = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.session_id, session_id))
      .execute();

    // Calculate summary statistics
    const totalProducts = processedProducts.length;
    const totalReviews = reviews.length;
    
    // Calculate average rating across all products
    const validRatings = processedProducts
      .map(p => p.average_rating)
      .filter((rating): rating is number => rating !== null);
    const averageRating = validRatings.length > 0 
      ? validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length
      : 0;

    // Calculate sentiment distribution from reviews
    const sentimentCounts = reviews.reduce((counts, review) => {
      if (review.sentiment === 'positive') counts.positive++;
      else if (review.sentiment === 'negative') counts.negative++;
      else counts.neutral++;
      return counts;
    }, { positive: 0, neutral: 0, negative: 0 });

    return {
      session_id,
      products: processedProducts,
      reviews,
      keywords,
      recommendations,
      summary: {
        total_products: totalProducts,
        total_reviews: totalReviews,
        average_rating: averageRating,
        sentiment_distribution: sentimentCounts
      }
    };
  } catch (error) {
    console.error('Analysis retrieval failed:', error);
    throw error;
  }
};
