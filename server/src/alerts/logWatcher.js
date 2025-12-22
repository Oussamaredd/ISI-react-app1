import fetch from "node-fetch";
import { sendTelegramAlert } from "./sendTelegramAlert.js";

const ELASTIC_URL =
  process.env.ELASTIC_URL || "http://elasticsearch:9200";
const SEARCH_URL = `${ELASTIC_URL.replace(/\\/$/, "")}/backend-logs-*/_search`;

export async function checkErrors() {
  try {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: {
          match: {
            message: "ERROR",
          },
        },
        size: 0,
      }),
    });

    if (!res.ok) {
      throw new Error(`Elastic query failed: ${res.status}`);
    }

    const data = await res.json();
    const totalErrors = data?.hits?.total?.value ?? 0;

    if (totalErrors > 10) {
      await sendTelegramAlert(
        `HIGH ERROR RATE detected: ${totalErrors} errors in logs!`
      );
    }
  } catch (err) {
    console.error("Error checking logs:", err);
  }
}
