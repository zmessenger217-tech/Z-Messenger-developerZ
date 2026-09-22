import app, { ensureDataInitialized } from "../server.ts";

export default async function handler(req: any, res: any) {
  // 1. Normalize request body from Vercel Serverless Function runtime
  if (req.body !== undefined && req.body !== null) {
    req._body = true;
    if (typeof req.body === "string" && req.body.trim()) {
      try {
        req.body = JSON.parse(req.body);
      } catch (_e) {}
    } else if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString("utf8"));
      } catch (_e) {}
    }
  } else if (req.readableEnded || req.complete) {
    req.body = {};
    req._body = true;
  }

  // 2. Comprehensive URL normalization across Vercel rewrite modes and dynamic routes
  let targetPath = "";
  let queryString = "";

  // Extract query string from original req.url if present
  if (typeof req.url === "string" && req.url.includes("?")) {
    const qIdx = req.url.indexOf("?");
    const rawParams = new URLSearchParams(req.url.slice(qIdx + 1));
    rawParams.delete("path");
    rawParams.delete("__route");
    const qs = rawParams.toString();
    if (qs) queryString = "?" + qs;
  }

  // A. Check if invoked from dynamic catch-all route api/[...path].ts
  if (req.query?.path) {
    const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    targetPath = "/api/" + segments.map((s: string) => encodeURIComponent(s)).join("/") + queryString;
  }

  // B. Check if rewritten with __route query param: /api?__route=auth/login
  if (!targetPath && (req.query?.__route || (typeof req.url === "string" && req.url.includes("__route=")))) {
    try {
      const parsedUrl = new URL(req.url, "http://localhost");
      const subRoute = req.query?.__route || parsedUrl.searchParams.get("__route");
      if (subRoute) {
        parsedUrl.searchParams.delete("__route");
        parsedUrl.searchParams.delete("path");
        const remainingQuery = parsedUrl.searchParams.toString();
        targetPath = "/api/" + String(subRoute).replace(/^\//, "") + (remainingQuery ? "?" + remainingQuery : "");
      }
    } catch (_e) {}
  }

  // C. Check forwarded URI or original URL headers (never accept pattern placeholders like [...path])
  if (!targetPath) {
    const fwdUri = (req.headers?.["x-forwarded-uri"] as string) || (req.headers?.["x-original-url"] as string) || (req.headers?.["x-matched-path"] as string);
    if (fwdUri && (fwdUri.startsWith("/api") || fwdUri.startsWith("/uploads")) && !fwdUri.includes("[")) {
      targetPath = fwdUri;
    }
  }

  // D. Check raw req.url
  if (!targetPath) {
    const rawUrl = req.url || "";
    if ((rawUrl.startsWith("/api") || rawUrl.startsWith("/uploads")) && !rawUrl.includes("[")) {
      targetPath = rawUrl;
    }
  }

  // E. Fallback
  if (!targetPath) {
    targetPath = req.url || "/api";
  }

  // Ensure request URL preserves the /api route prefix expected by Express
  if (!targetPath.startsWith("/api") && !targetPath.startsWith("/uploads")) {
    targetPath = "/api" + (targetPath.startsWith("/") ? targetPath : "/" + targetPath);
  }

  req.url = targetPath;
  req.originalUrl = targetPath;

  // 3. Ensure Cloud Firestore and initial server records are loaded with a non-blocking timeout
  try {
    await Promise.race([
      ensureDataInitialized(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (err) {
    console.warn("Notice: ensureDataInitialized background warning in Vercel handler:", err);
  }

  // 4. Wrap Express invocation in a safe Promise that guarantees termination
  return new Promise<void>((resolve) => {
    let completed = false;
    const done = () => {
      if (!completed) {
        completed = true;
        resolve();
      }
    };

    res.once("finish", done);
    res.once("close", done);
    res.once("error", () => done());

    // 25-second maximum safety timeout to guarantee the promise never hangs indefinitely
    const timer = setTimeout(done, 25000);

    try {
      app(req, res, (err: any) => {
        clearTimeout(timer);
        if (err) {
          console.error("Vercel Express serverless error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err?.message || "Internal server error" });
          }
        } else if (!res.headersSent) {
          console.warn(`[Vercel Serverless] Unmatched route: ${req.method} ${req.url}`);
          res.status(404).json({ error: `Not found: ${req.method} ${req.url}` });
        }
        done();
      });
    } catch (invocationErr: any) {
      clearTimeout(timer);
      console.error("Vercel Express invocation exception:", invocationErr);
      if (!res.headersSent) {
        res.status(500).json({ error: invocationErr?.message || "Internal server error" });
      }
      done();
    }
  });
}

