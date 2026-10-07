import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodType } from 'zod';

// Check req.body against a schema before the controller runs.
// On success the body is replaced with the cleaned version (trimmed strings,
// unknown fields removed), so controllers can trust what they receive.
export const validateBody = (schema: ZodType) => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join('.');
    res.status(400).json({
      error: field ? `${field}: ${first.message}` : first.message,
      details: result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
    });
    return;
  }
  req.body = result.data;
  next();
};

// Reject malformed ids early with a clear 400 instead of a database cast error.
export const validateObjectId = (req: Request, res: Response, next: NextFunction): void => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  next();
};
