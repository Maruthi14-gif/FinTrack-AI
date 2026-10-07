import { Request, Response, NextFunction } from 'express';
import env from '../config/env.js';

// Any /api request that matched no route.
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Last middleware in the chain: anything thrown in a route ends up here,
// so the client always gets JSON and never a raw stack trace.
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = Number(err?.status || err?.statusCode) || 500;
  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(status).json({
    error: status >= 500 && env.isProduction ? 'Something went wrong. Please try again.' : err?.message || 'Unexpected error'
  });
};
