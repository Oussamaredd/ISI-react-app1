import "../../infrastructure/scripts/node-preload/disable-vite-net-use.cjs";

if (process.env.ECOTRACK_VITE_SPAWN_RESTRICTED === "1") {
  console.log("[bundle-check] Skipped in spawn-restricted fallback mode.");
} else {
  await import("./check-bundle-size.mjs");
}
