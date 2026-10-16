import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDb } from './server/db.js';
import { apiRouter } from './server/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize SQLite database
await getDb();

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || 'boya-financial-secret-2026'));

// CORS configuration (supports external GitHub Pages or remote frontends if specified)
const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;
if (allowedOrigin) {
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
} else {
  // Allow same-origin & standard requests
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
}

import fs from 'fs';

// Security headers (allowing embedding in AI Studio preview iframe)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Mount backend API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'BOYA.COM',
    database: 'SQLite (investment.db)',
    environment: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

// Vite dev middleware or static serving
if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  // Serve transformed index.html for all SPA routes in development
  app.use('*', async (req: Request, res: Response, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace?.(e);
      next(e);
    }
  });
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BOYA.COM] Production Server running at http://0.0.0.0:${PORT}`);
  console.log(`[BOYA.COM] Database connected: investment.db`);
});
