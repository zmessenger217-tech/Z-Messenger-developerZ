import app, { ensureDataInitialized } from "../server.ts";

export default async function handler(req: any, res: any) {
  // Ensure Firebase Firestore and initial server records are loaded
  await ensureDataInitialized();

  // Handle URL normalization across Vercel rewrite modes
  const forwardedUri = req.headers?.["x-forwarded-uri"] as string | undefined;
  if (forwardedUri && (req.url === "/api" || req.url === "/api/" || !req.url.startsWith("/api"))) {
    req.url = forwardedUri;
  }

  // Ensure request URL preserves the /api route prefix expected by Express
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/uploads")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }

  return app(req, res);
}
