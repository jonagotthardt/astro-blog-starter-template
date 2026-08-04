#!/usr/bin/env node
// Rewrites root-absolute local asset/link paths (href="/x", src="/x") in every
// dist/**/*.html file into depth-correct relative paths ("../x" as needed).
//
// Why: this build is deployed once (./dist) but served from two different
// URL prefixes at once - the custom domain root (jonagotthardt.de/) and the
// GitHub Pages project URL (jonagotthardt.github.io/jona/, where GitHub
// automatically mounts the dist/ artifact under a /jona/ prefix). A single
// set of root-absolute paths can only ever be correct for one of the two.
// Relative paths resolve against the *current page's* URL in the browser,
// so the same dist/ output works correctly under both prefixes without a
// duplicate build.
//
// Only touches same-origin absolute paths (starting with exactly one "/").
// Leaves alone: protocol-relative ("//..."), absolute URLs (http(s)://...,
// mailto:, tel:), fragment-only ("#..."), and already-relative paths.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

const ATTR_RE = /\b(href|src)="(\/[^"/][^"]*)"/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

function relPrefix(htmlFile) {
  // Depth = number of path segments between dist/ and the file's directory.
  // dist/index.html -> depth 0 -> ""
  // dist/downloads/index.html -> depth 1 -> "../"
  // dist/de/downloads/index.html -> depth 2 -> "../../"
  const rel = path.relative(distDir, path.dirname(htmlFile));
  if (rel === "") return "";
  const depth = rel.split(path.sep).length;
  return "../".repeat(depth);
}

async function processFile(file) {
  const prefix = relPrefix(file);
  const original = await readFile(file, "utf8");
  let changed = 0;
  const rewritten = original.replace(ATTR_RE, (match, attr, value) => {
    changed++;
    return `${attr}="${prefix}${value.slice(1)}"`;
  });
  if (changed > 0) {
    await writeFile(file, rewritten, "utf8");
  }
  return changed;
}

async function main() {
  const st = await stat(distDir).catch(() => null);
  if (!st || !st.isDirectory()) {
    console.error(`relativize.mjs: dist directory not found at ${distDir} - run 'astro build' first`);
    process.exit(1);
  }
  const htmlFiles = await walk(distDir);
  let totalFiles = 0;
  let totalRewrites = 0;
  for (const file of htmlFiles) {
    const n = await processFile(file);
    if (n > 0) {
      totalFiles++;
      totalRewrites += n;
    }
  }
  console.log(
    `relativize.mjs: rewrote ${totalRewrites} absolute path(s) across ${totalFiles}/${htmlFiles.length} HTML file(s) in dist/`
  );
}

main();
