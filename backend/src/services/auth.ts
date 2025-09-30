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
