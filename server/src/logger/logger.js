import winston from "winston";
import net from "node:net";
import { Writable } from "node:stream";

const LOGSTASH_HOST = "logstash";
const LOGSTASH_PORT = 5001;

// Persistent TCP socket to Logstash
const socket = new net.Socket();

socket.connect(LOGSTASH_PORT, LOGSTASH_HOST, () => {
  console.log("🔌 Connected to Logstash");
});

socket.on("error", (err) => {
  console.error("❌ Logstash connection error:", err.message);
});

// Create a proper writable stream instance for Winston
const logstashStream = new Writable({
  write(chunk, encoding, callback) {
    try {
      socket.write(chunk.toString().trim() + "\n");
    } catch (err) {
      console.error("❌ Failed to send log to Logstash:", err.message);
    }
    callback();
  }
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),

    // VALID stream transport
    new winston.transports.Stream({ stream: logstashStream }),
  ],
});

function connect() {
  socket.connect(LOGSTASH_PORT, LOGSTASH_HOST, () => {
    console.log("🔌 Connected to Logstash");
  });
}

socket.on("close", () => {
  console.log("⚠️ Logstash connection closed. Reconnecting in 2s...");
  setTimeout(connect, 2000);
});

socket.on("error", (err) => {
  console.error("❌ Logstash connection error:", err.message);
});

connect();

export default logger;