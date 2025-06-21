import { db } from '../db';
import { productsTable, reviewsTable, keywordsTable, recommendationsTable } from '../db/schema';
import { type SearchInput, type SearchResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const searchProducts = async (input: SearchInput): Promise<SearchResponse> => {
  try {
    // Generate session_id if not provided
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

    // Start asynchronous simulation task
    simulateScrapingAndAnalysis(session_id, input.query, input.platforms);

    return {
      session_id,
      status: 'started',
      message: `Started scraping for query: "${input.query}" on platforms: ${input.platforms.join(', ')}`
    };
  } catch (error) {
    console.error('Search products failed:', error);
    throw error;
  }
};

// Simulate the scraping and analysis process
const simulateScrapingAndAnalysis = async (
  session_id: string, 
  query: string, 
  platforms: string[]
) => {
  try {
    // Step 1: Insert dummy products (after 2 seconds delay)
    setTimeout(async () => {
      try {
        const dummyProducts = generateDummyProducts(session_id, query, platforms);
        const insertedProducts = await db.insert(productsTable)
          .values(dummyProducts.map(product => ({
            ...product,
            average_rating: product.average_rating?.toString() || null
          })))
          .returning()
          .execute();

        console.log(`Inserted ${insertedProducts.length} products for session ${session_id}`);

        // Step 2: Insert dummy reviews (after another 3 seconds)
        setTimeout(async () => {
          try {
            const dummyReviews = generateDummyReviews(insertedProducts);
            await db.insert(reviewsTable)
              .values(dummyReviews)
              .execute();

            console.log(`Inserted ${dummyReviews.length} reviews for session ${session_id}`);

            // Step 3: Insert dummy keywords (after another 2 seconds)
            setTimeout(async () => {
              try {
                const dummyKeywords = generateDummyKeywords(session_id, query);
                await db.insert(keywordsTable)
                  .values(dummyKeywords)
                  .execute();

                console.log(`Inserted ${dummyKeywords.length} keywords for session ${session_id}`);

                // Step 4: Insert dummy recommendations (after another 2 seconds)
                setTimeout(async () => {
                  try {
                    const dummyRecommendations = generateDummyRecommendations(session_id, query);
                    await db.insert(recommendationsTable)
                      .values(dummyRecommendations)
                      .execute();

                    console.log(`Inserted ${dummyRecommendations.length} recommendations for session ${session_id}`);
                    console.log(`Analysis completed for session ${session_id}`);
                  } catch (error) {
                    console.error('Failed to insert recommendations:', error);
                  }
                }, 2000);
              } catch (error) {
                console.error('Failed to insert keywords:', error);
              }
            }, 2000);
          } catch (error) {
            console.error('Failed to insert reviews:', error);
          }
        }, 3000);
      } catch (error) {
        console.error('Failed to insert products:', error);
      }
    }, 2000);
  } catch (error) {
    console.error('Simulation process failed:', error);
  }
};

// Generate dummy products based on query and platforms
const generateDummyProducts = (session_id: string, query: string, platforms: string[]) => {
  const productNames = [
    `${query} Pro Max`,
    `Premium ${query}`,
    `${query} Elite`,
    `Smart ${query}`,
    `${query} Plus`,
    `Advanced ${query}`,
    `${query} Deluxe`,
    `Ultra ${query}`
  ];

  const products = [];
  let productIndex = 0;

  for (const platform of platforms) {
    const productsPerPlatform = Math.min(3, Math.ceil(8 / platforms.length));
    
    for (let i = 0; i < productsPerPlatform && productIndex < productNames.length; i++) {
      products.push({
        name: productNames[productIndex],
        platform: platform as any,
        url: `https://${platform}.com/product/${productIndex + 1}`,
        average_rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10, // 3.5 to 5.0
        total_reviews: Math.floor(50 + Math.random() * 500), // 50 to 550 reviews
        session_id,
        scraped_at: new Date()
      });
      productIndex++;
    }
  }

  return products;
};

// Generate dummy reviews for products
const generateDummyReviews = (products: any[]) => {
  const positiveReviews = [
    "Amazing product! Exactly what I was looking for. Highly recommend!",
    "Great quality and fast shipping. Will buy again!",
    "Exceeded my expectations. Perfect for my needs.",
    "Love it! Great value for money.",
    "Excellent product quality. Very satisfied with my purchase.",
    "Fast delivery and exactly as described. Thumbs up!",
    "Outstanding quality! Worth every penny.",
    "Perfect! Exactly what I needed."
  ];

  const neutralReviews = [
    "Product is okay, nothing special but does the job.",
    "Average quality, decent for the price.",
    "It's fine, meets basic expectations.",
    "Not bad, but not great either.",
    "Does what it's supposed to do.",
    "Acceptable quality for the price point.",
    "It's okay, nothing to complain about."
  ];

  const negativeReviews = [
    "Not as described. Quality is poor.",
    "Disappointing. Expected better quality.",
    "Not worth the money. Poor materials.",
    "Arrived damaged. Not happy with purchase.",
    "Quality is below expectations.",
    "Not satisfied with this purchase.",
    "Poor quality, would not recommend."
  ];

  const reviews = [];
  
  for (const product of products) {
    const numReviews = Math.min(product.total_reviews, 20); // Limit to 20 reviews per product
    
    for (let i = 0; i < numReviews; i++) {
      const sentiment = Math.random();
      let reviewText: string;
      let rating: number;
      let sentimentLabel: 'positive' | 'neutral' | 'negative';

      if (sentiment < 0.6) { // 60% positive
        reviewText = positiveReviews[Math.floor(Math.random() * positiveReviews.length)];
        rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
        sentimentLabel = 'positive';
      } else if (sentiment < 0.8) { // 20% neutral
        reviewText = neutralReviews[Math.floor(Math.random() * neutralReviews.length)];
        rating = 3; // 3 stars
        sentimentLabel = 'neutral';
      } else { // 20% negative
        reviewText = negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
        rating = Math.floor(Math.random() * 2) + 1; // 1 or 2 stars
        sentimentLabel = 'negative';
      }

      reviews.push({
        product_id: product.id,
        text: reviewText,
        rating,
        sentiment: sentimentLabel,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        created_at: new Date()
      });
    }
  }

  return reviews;
};

// Generate dummy keywords based on query
const generateDummyKeywords = (session_id: string, query: string) => {
  const commonKeywords = [
    { keyword: 'quality', sentiment: 'positive' as const, frequency: 45 },
    { keyword: 'fast shipping', sentiment: 'positive' as const, frequency: 32 },
    { keyword: 'value for money', sentiment: 'positive' as const, frequency: 28 },
    { keyword: 'excellent', sentiment: 'positive' as const, frequency: 25 },
    { keyword: 'recommended', sentiment: 'positive' as const, frequency: 22 },
    { keyword: 'durable', sentiment: 'positive' as const, frequency: 18 },
    { keyword: 'easy to use', sentiment: 'positive' as const, frequency: 16 },
    { keyword: 'good design', sentiment: 'positive' as const, frequency: 14 },
    { keyword: 'okay', sentiment: 'neutral' as const, frequency: 12 },
    { keyword: 'average', sentiment: 'neutral' as const, frequency: 10 },
    { keyword: 'decent', sentiment: 'neutral' as const, frequency: 8 },
    { keyword: 'poor quality', sentiment: 'negative' as const, frequency: 15 },
    { keyword: 'disappointed', sentiment: 'negative' as const, frequency: 12 },
    { keyword: 'not as described', sentiment: 'negative' as const, frequency: 9 },
    { keyword: 'damaged', sentiment: 'negative' as const, frequency: 6 }
  ];

  // Add query-specific keywords
  const queryWords = query.toLowerCase().split(' ');
  const queryKeywords = queryWords.map(word => ({
    keyword: word,
    sentiment: 'neutral' as const,
    frequency: Math.floor(20 + Math.random() * 30)
  }));

  return [...commonKeywords, ...queryKeywords].map(kw => ({
    session_id,
    keyword: kw.keyword,
    frequency: kw.frequency,
    sentiment: kw.sentiment
  }));
};

// Generate dummy recommendations
const generateDummyRecommendations = (session_id: string, query: string) => {
  const recommendations = [
    {
      title: "Improve Product Description Accuracy",
      description: "Several reviews mention products not matching descriptions. Ensure all product details, dimensions, and features are accurately represented.",
      priority: 'high' as const,
      category: 'Product Information'
    },
    {
      title: "Enhance Quality Control",
      description: "Some customers received damaged items. Implement stricter quality control measures before shipping.",
      priority: 'high' as const,
      category: 'Quality Assurance'
    },
    {
      title: "Leverage Positive Feedback",
      description: "Many customers praise the fast shipping and quality. Highlight these strengths in marketing materials.",
      priority: 'medium' as const,
      category: 'Marketing'
    },
    {
      title: "Address Packaging Concerns",
      description: "Consider improving packaging to prevent damage during shipping, based on customer feedback.",
      priority: 'medium' as const,
      category: 'Logistics'
    },
    {
      title: "Customer Service Training",
      description: "Improve response times and resolution quality for customer complaints to boost satisfaction.",
      priority: 'low' as const,
      category: 'Customer Service'
    },
    {
      title: "Price Competitiveness Analysis",
      description: "Customers appreciate value for money. Regularly analyze competitor pricing to maintain competitive advantage.",
      priority: 'low' as const,
      category: 'Pricing Strategy'
    }
  ];

  return recommendations.map(rec => ({
    session_id,
    title: rec.title,
    description: rec.description,
    priority: rec.priority,
    category: rec.category,
    created_at: new Date()
  }));
};