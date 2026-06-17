/**
 * check-bundle-budget.js
 * Verifies that the initial JS bundle size is within the performance budget.
 * Run after `next build` to check the output bundle.
 * 
 * Usage: node scripts/check-bundle-budget.js
 * CI: Fails with exit code 1 if budget is exceeded.
 */

const fs = require("fs");
const path = require("path");

const BUDGET_KB = 150; // Maximum initial JS bundle size in KB
const BUILD_DIR = path.join(__dirname, "..", ".next");

function getInitialBundleSize() {
  const buildManifestPath = path.join(BUILD_DIR, "build-manifest.json");

  if (!fs.existsSync(buildManifestPath)) {
    console.error("❌ No build found. Run 'next build' first.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(buildManifestPath, "utf8"));
  const initialChunks = new Set();

  // Collect all pages' initial JS files
  const rootPage = manifest.pages["/"] || [];
  const sharedChunks = manifest.pages["/_app"] || [];

  [...rootPage, ...sharedChunks].forEach((chunk) => {
    if (chunk.endsWith(".js")) {
      initialChunks.add(chunk);
    }
  });

  let totalBytes = 0;
  for (const chunk of initialChunks) {
    const chunkPath = path.join(BUILD_DIR, chunk);
    if (fs.existsSync(chunkPath)) {
      totalBytes += fs.statSync(chunkPath).size;
    }
  }

  return totalBytes;
}

function main() {
  try {
    const bytes = getInitialBundleSize();
    const kb = (bytes / 1024).toFixed(1);

    console.log(`\n📦 Initial JS bundle: ${kb}KB (budget: ${BUDGET_KB}KB)\n`);

    if (bytes > BUDGET_KB * 1024) {
      const overBy = ((bytes - BUDGET_KB * 1024) / 1024).toFixed(1);
      console.error(`❌ OVER BUDGET by ${overBy}KB!`);
      console.error(`   Reduce imports, use dynamic() for heavy components,`);
      console.error(`   or check for unnecessary dependencies in the initial bundle.\n`);
      process.exit(1);
    } else {
      const remaining = (BUDGET_KB - bytes / 1024).toFixed(1);
      console.log(`✅ Within budget. ${remaining}KB remaining.\n`);
      process.exit(0);
    }
  } catch (err) {
    console.error("Error checking bundle:", err.message);
    process.exit(1);
  }
}

main();
