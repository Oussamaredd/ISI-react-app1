const rawArgs = process.argv.slice(2);
const hasExplicitSuite = rawArgs[0] && !rawArgs[0].startsWith("-");
const suite = hasExplicitSuite ? rawArgs[0] : "all";
const forwardedArgs = hasExplicitSuite ? rawArgs.slice(1) : rawArgs;

process.env.ECOTRACK_MOBILE_TEST_SUITE = suite;
process.argv = [process.argv[0], process.argv[1], ...forwardedArgs];

await import("./run-vitest.mjs");
