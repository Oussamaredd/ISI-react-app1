import winston from "winston";
import net from "node:net";

const LOGSTASH_HOST = "logstash";
const LOGSTASH_PORT = 5001;

// Create persistent TCP socket
const socket = new net.Socket();
socket.connect(LOGSTASH_PORT, LOGSTASH_HOST, () => {
  console.log("Connected to Logstash");
});

socket.on("error", (err) => {
  console.error("Logstash connection error", err.message);
});

const logstashTransport = new winston.transports.Stream({
  stream: {
    write: (message) => {
      try {
        socket.write(message.trim() + "\n");
      } catch (e) {
        console.error("Failed to send log", e);
      }
    },
  },
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    logstashTransport,
  ],
});

export default logger;
