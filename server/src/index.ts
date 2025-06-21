
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import { searchInputSchema, getAnalysisInputSchema } from './schema';
import { searchProducts } from './handlers/search_products';
import { getAnalysis } from './handlers/get_analysis';
import { getSessionStatus } from './handlers/get_session_status';
import { cleanupSession } from './handlers/cleanup_session';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  searchProducts: publicProcedure
    .input(searchInputSchema)
    .mutation(({ input }) => searchProducts(input)),
    
  getAnalysis: publicProcedure
    .input(getAnalysisInputSchema)
    .query(({ input }) => getAnalysis(input)),
    
  getSessionStatus: publicProcedure
    .input(getAnalysisInputSchema)
    .query(({ input }) => getSessionStatus(input)),
    
  cleanupSession: publicProcedure
    .input(getAnalysisInputSchema)
    .mutation(({ input }) => cleanupSession(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
