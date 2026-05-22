import express from 'express';
import cors from 'cors';
import routes from './routes';
import { config } from '../config';

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, _res, next) => {
    console.log(`[api] ${req.method} ${req.path}`);
    next();
  });

  // Mount routes
  app.use('/', routes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not found',
      availableEndpoints: [
        'GET /healthz',
        'GET /map/state',
        'GET /region/:id/history',
        'GET /leaderboard',
        'GET /faction/:id',
        'GET /stats',
      ],
    });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export function startServer() {
  const app = createServer();
  const server = app.listen(config.port, () => {
    console.log(`[api] REST API listening on port ${config.port}`);
    console.log(`[api] Endpoints:`);
    console.log(`  GET /healthz`);
    console.log(`  GET /map/state`);
    console.log(`  GET /region/:id/history`);
    console.log(`  GET /leaderboard`);
    console.log(`  GET /faction/:id`);
    console.log(`  GET /stats`);
  });
  return server;
}
