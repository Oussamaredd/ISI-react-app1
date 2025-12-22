// server/src/logger/logger.js
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

if (process.env.ENABLE_LOGSTASH === "true") {
  try {
    const mod = await import("winston-logstash");
    const LogstashTransport =
      mod?.LogstashTransport || mod?.default?.LogstashTransport;

    if (!LogstashTransport) {
      throw new Error("winston-logstash LogstashTransport not found");
    }

    const host = process.env.LOGSTASH_HOST || "logstash";
    const port = Number(process.env.LOGSTASH_PORT || 5001);

    logger.add(new LogstashTransport({ host, port }));
    logger.info("Logstash transport enabled", { host, port });
  } catch (err) {
    logger.error("Failed to enable Logstash transport", { error: err?.message });
  }
}

export default logger;
