import fetch from "node-fetch";

export async function sendTelegramAlert(message) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn(
        "Telegram alert skipped (missing TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID)"
      );
      return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });

    console.log("Telegram alert sent:", message);
  } catch (err) {
    console.error("ƒ?O Error sending Telegram alert:", err.message);
  }
}
