import { randomUUID } from "node:crypto";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function readBody(request, limit = 8192) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "Request body is too large.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function readJson(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON is required.");
  try {
    return JSON.parse(await readBody(request));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function siteUrl(env) {
  let site;
  try {
    site = new URL(env.SITE_URL);
  } catch {
    throw new HttpError(503, "Service is not configured.");
  }
  if (
    site.protocol !== "https:" &&
    !(
      site.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(site.hostname)
    )
  )
    throw new HttpError(503, "Service is not configured.");
  if (
    site.username ||
    site.password ||
    site.search ||
    site.hash ||
    site.pathname !== "/"
  )
    throw new HttpError(503, "Service is not configured.");
  return site.origin;
}
export function checkOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (origin && origin !== siteUrl(env))
    throw new HttpError(403, "Origin is not allowed.");
}
export function requireMethod(request, expected) {
  if (request.method !== expected)
    throw new HttpError(405, "Method not allowed.");
}
export function guarded(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      const requestId = randomUUID();
      // Never log request bodies, tokens, payment payloads or database error details.
      console.error("Request failed", { requestId, code: "UNEXPECTED_ERROR" });
      return json(
        { error: "The request could not be completed.", requestId },
        500,
      );
    }
  };
}
