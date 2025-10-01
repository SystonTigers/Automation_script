
import jwt from "jsonwebtoken";

export async function requireJWT(req: Request, env: any): Promise<{ sub: string; tenantId: string }> {
  const hdr = req.headers.get("authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }) as any;
    return { sub: payload.sub, tenantId: payload.tenantId };
  } catch {
    throw new Response("Unauthorized", { status: 401 });
  }
}
import { jwtVerify } from 'jose';
import type { Env, UserContext } from '../types';
import { failure, json, withCORS } from '../util';

const BEARER_PREFIX = 'bearer ';

export class AuthError extends Error {
  public status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireJWT(request: Request, env: Env): Promise<UserContext> {
  const header = request.headers.get('authorization');
  if (!header) {
    throw new AuthError('Missing Authorization header');
  }
  if (!header.toLowerCase().startsWith(BEARER_PREFIX)) {
    throw new AuthError('Invalid Authorization header format');
  }
  const token = header.substring(BEARER_PREFIX.length).trim();
  if (!token) {
    throw new AuthError('Empty bearer token');
  }

  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new AuthError('Server misconfigured', 500);
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    const tenantId = (payload['tenant'] ?? payload['tenantId']) as string | undefined;
    if (!tenantId) {
      throw new AuthError('Token missing tenant');
    }

    const rolesClaim = payload['roles'];
    const roles = Array.isArray(rolesClaim)
      ? (rolesClaim as string[])
      : typeof rolesClaim === 'string'
        ? rolesClaim.split(',').map((role) => role.trim())
        : [];

    return {
      sub: String(payload.sub ?? ''),
      tenantId,
      roles,
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Token verification failed');
  }
}

export function unauthorized(env: Env, message: string): Response {
  return withCORS(json(failure('UNAUTHORIZED', message), 401), env);
}
