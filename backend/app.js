import express from 'express';
import cors from 'cors';
import { fileRoutes } from './routes/files.js';
import { errorHandler, HttpError } from './middleware/errors.js';

export function createApp(storage, origin = 'http://localhost:5173') {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && req.headers.origin !== origin)
      return next(
        new HttpError(
          403,
          'This browser origin is not allowed.',
          'ORIGIN_DENIED',
        ),
      );
    next();
  });
  app.use(cors({ origin, methods: ['GET', 'POST', 'DELETE'] }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/cloud/status', async (req, res) =>
    res.json(await storage.status()),
  );
  app.use('/api/files', fileRoutes(storage));
  app.use((req, res) =>
    res.status(404).json({ error: 'Endpoint not found.', code: 'NOT_FOUND' }),
  );
  app.use(errorHandler);
  return app;
}
