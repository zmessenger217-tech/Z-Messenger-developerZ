import serverless from "serverless-http";
import app, { ensureDataInitialized } from "../../server.ts";

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  try {
    await ensureDataInitialized();
  } catch (err) {
    console.warn("Netlify function ensureDataInitialized notice:", err);
  }

  // Normalize path if Netlify strips or modifies the /api prefix
  if (event.path && !event.path.startsWith("/api") && !event.path.startsWith("/uploads")) {
    event.path = "/api" + (event.path.startsWith("/") ? event.path : "/" + event.path);
  }

  return serverlessHandler(event, context);
};

