import fetch from "node-fetch";
import { sendTelegramAlert } from "./sendTelegramAlert.js";

const ELASTIC_URL = "http://elasticsearch:9200/backend-logs-*/_search";

export async function checkErrors() {
  try {
    const res = await fetch(ELASTIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: {
          match: {
            "message": "ERROR"
          }
        },
        size: 0
      })
    });

    const data = await res.json();
    const totalErrors = data.hits.total.value;

    if (totalErrors > 10) {
      await sendTelegramAlert(`⚠️ HIGH ERROR RATE detected: ${totalErrors} errors in logs!`);
    }
  } catch (err) {
    console.error("Error checking logs:", err);
  }
}
