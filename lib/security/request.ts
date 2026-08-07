import { createHash } from 'node:crypto';

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex');
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
