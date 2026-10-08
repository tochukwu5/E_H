import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, _res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.issues[0]?.message || 'Check the highlighted fields.',
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
    });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ message: field === 'email' ? 'An account with this email already exists.' : `That ${field} is already in use.` });
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'That file is over 5 MB. Upload a smaller PDF.' : err.message });
  }
  const status = err.status || 500;
  if (status >= 500) logger.error(err);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on our side. Try again in a moment.' : err.message, details: err.details });
}
