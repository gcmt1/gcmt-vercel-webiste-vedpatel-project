import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { createServer } = await import("vite");
const routes = {
  "/api/create-order": (await import("../api/create-order.js")).default.fetch,
  "/api/payment-response": (await import("../api/payment-response.js")).default
    .fetch,
  "/api/order": (await import("../api/order.js")).default.fetch,
  "/api/cod-payment": (await import("../api/cod-payment.js")).default.fetch,
};
const server = await createServer({
  server: { host: "127.0.0.1", port: 3000, strictPort: true },
});
server.middlewares.use(async (req, res, next) => {
  const path = (req.url || "").split("?")[0];
  if (!path.startsWith("/api/")) return next();
  const handler = routes[path];
  if (!handler) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 150000) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request("http://127.0.0.1:3000" + req.url, {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("The request could not be completed.");
  }
});
await server.listen();
server.printUrls();
