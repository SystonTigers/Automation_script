import { z } from "zod";

export const PostReqSchema = z.object({
  tenant: z.string().min(1),
  template: z.string().min(1),
  channels: z.array(z.string().min(1)).min(1),
  data: z.record(z.any())
});

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

export function cors(originList: string[] | null, reqOrigin: string | null) {
  const allowOrigin = originList?.includes(reqOrigin || "") ? reqOrigin! : (originList ? originList[0] : "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,authorization,Idempotency-Key",
    "Vary": "Origin"
  };
}

export function readIdempotencyKey(req: Request) {
  return req.headers.get("Idempotency-Key") || "";
}
