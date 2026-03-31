import { cleanupDevServiceWorkerState } from "./lib/registerMapServiceWorker";

await cleanupDevServiceWorkerState();
await import("./main");
