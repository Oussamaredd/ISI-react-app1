// server/src/logger/logger.js
import winston from "winston";
// ❌ don't import logstash by default
// import "winston-logstash";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    // Always log to console
    new winston.transports.Console(),
  ],
});

// Optional: enable logstash ONLY if env flag is set AND package is installed
if (process.env.ENABLE_LOGSTASH === "true") {
  try {
    // uncomment this line ONLY if you have the package installed
    // import "winston-logstash";

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const LogstashTransport = require("winston-logstash").LogstashTransport;

    logger.add(
      new LogstashTransport({
        port: 5000,
        host: "logstash",
      })
    );

    logger.info("Logstash transport enabled");
  } catch (err) {
    logger.error("Failed to enable Logstash transport", { error: err.message });
  }
}

export default logger;
