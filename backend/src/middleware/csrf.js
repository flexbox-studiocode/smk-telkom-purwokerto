import crypto from 'node:crypto';
import { HttpError } from '../utils/http.js';

export function csrfToken(req, res) {
  const token = crypto.randomBytes(24).toString('base64url');
  res.cookie('csrf_token', token, { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ csrfToken: token });
}

export function requireCsrf(req, _res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const cookie = req.cookies?.csrf_token;
  const header = req.get('x-csrf-token');
  if (!cookie || !header || cookie.length !== header.length || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new HttpError(400, 'CSRF token tidak valid.', 'csrf_failed'));
  }
  next();
}
