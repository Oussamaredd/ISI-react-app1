const path = require("node:path");

const resolveQualityOutputRoot = () => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(__dirname, "..", configuredRoot);
  }

  return path.resolve(__dirname, "..", process.env.CI ? "tmp/ci/quality" : "tmp/quality");
};

module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:4173/",
        "http://127.0.0.1:4173/login",
        "http://127.0.0.1:4173/app/dashboard"
      ],
      numberOfRuns: 2,
      startServerCommand: ""
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "first-contentful-paint": ["error", { maxNumericValue: 2900 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3500 }],
        interactive: ["error", { maxNumericValue: 4500 }],
        "speed-index": ["error", { maxNumericValue: 4800 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-byte-weight": ["error", { maxNumericValue: 1000000 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: path.join(resolveQualityOutputRoot(), "lighthouse")
    }
  }
};
