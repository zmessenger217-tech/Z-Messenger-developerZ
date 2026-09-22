import app, { ensureDataInitialized } from "../server.ts";

export default async function handler(req: any, res: any) {
  // 1. Normalize request body from Vercel Serverless Function runtime
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch (_e) {}
  }
  // Signal to Express body-parser that body is already parsed so it won't hang on consumed stream
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    req._body = true;
  }

  // 2. Comprehensive URL normalization across Vercel rewrite modes and proxies
  const matchedPath =
    (req.headers?.["x-matched-path"] as string) ||
    (req.headers?.["x-vercel-matched-path"] as string) ||
    (req.headers?.["x-forwarded-uri"] as string) ||
    (req.headers?.["x-original-url"] as string);

  if (matchedPath && (matchedPath.startsWith("/api") || matchedPath.startsWith("/uploads"))) {
    req.url = matchedPath;
  } else {
    try {
      const parsedUrl = new URL(req.url, "http://localhost");
      const subRoute = parsedUrl.searchParams.get("__route");
      if (subRoute) {
        parsedUrl.searchParams.delete("__route");
        const remainingQuery = parsedUrl.searchParams.toString();
        req.url = "/api/" + subRoute.replace(/^\//, "") + (remainingQuery ? "?" + remainingQuery : "");
      }
    } catch (_e) {}
  }

  // Ensure request URL preserves the /api route prefix expected by Express
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/uploads")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }

  // 3. Ensure Cloud Firestore and initial server records are loaded
  try {
    await ensureDataInitialized();
  } catch (err) {
    console.warn("Notice: ensureDataInitialized background warning in Vercel handler:", err);
  }

  // 4. Wrap Express invocation in a Promise that waits until response is fully sent
  // This prevents Vercel from terminating the serverless function early (which causes 500 errors)
  return new Promise<void>((resolve, reject) => {
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
    res.on("error", (err: any) => reject(err));

    app(req, res, (err: any) => {
      if (err) {
        console.error("Vercel Express serverless error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: err?.message || "Internal server error" });
        }
        resolve();
      }
    });
  });
}

