import app from "./app";
import { connectDB } from "@workspace/db";
import { logger } from "./lib/logger";
import { cleanupExpiredJitsiSessions } from "./services/jitsi-session";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await connectDB();
    logger.info("MongoDB connected");

    setInterval(() => {
      void cleanupExpiredJitsiSessions().catch((err) => {
        logger.warn({ err }, "Jitsi session cleanup failed");
      });
    }, 5 * 60 * 1000);
  } catch (err) {
    logger.error({ err }, "MongoDB connection error");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start();
