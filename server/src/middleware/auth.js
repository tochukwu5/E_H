import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { HttpError } from './error.js';

export const COOKIE = 'eh_token';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: '30d' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE, { path: '/', secure: env.isProd, sameSite: env.isProd ? 'none' : 'lax' });
}

function readToken(req) {
  if (req.cookies?.[COOKIE]) return req.cookies[COOKIE];
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function requireAuth(req, _res, next) {
  try {
    const token = readToken(req);
    if (!token) throw new HttpError(401, 'Sign in to continue.');
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, 'Your session has ended. Sign in again.');
    req.user = user;
    next();
  } catch (e) {
    next(e instanceof HttpError ? e : new HttpError(401, 'Your session has ended. Sign in again.'));
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = readToken(req);
    if (token) {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = await User.findById(payload.sub);
    }
  } catch {
    /* anonymous */
  }
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Admins only.'));
  next();
}
