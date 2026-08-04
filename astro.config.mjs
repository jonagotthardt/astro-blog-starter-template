// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Allows the CI build to produce a second copy of the site under /jona/
// for the GitHub Pages project URL (jonagotthardt.github.io/jona/), while
// the default build stays rooted at "/" for the custom domain
// (jonagotthardt.de, see public/CNAME). See .github/workflows/deploy.yml.
const base = process.env.BASE_PATH || "/";
const site = process.env.SITE_URL || "https://jonagotthardt.de";

// https://astro.build/config
export default defineConfig({
  site,
  base,
  integrations: [mdx(), sitemap()],
  output: "static",
});
