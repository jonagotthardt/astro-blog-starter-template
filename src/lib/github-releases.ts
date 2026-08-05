// Fetches the latest GitHub release for a repo at BUILD time (this runs in
// Astro's frontmatter/Node context during `astro build`, never in the
// browser) so download buttons can link straight at the actual asset file
// instead of the GitHub releases page - one less click, and it stays
// correct automatically as new versions are tagged, since every push to
// `main` re-runs the build and re-fetches.
//
// Unauthenticated GitHub API calls are rate-limited to 60/hour per IP,
// which is more than enough for the handful of repos this site links to
// per build. If a fetch fails for any reason (rate limit, network hiccup,
// repo has no releases yet), callers get `null` back and should fall back
// to linking `https://github.com/<repo>/releases/latest` instead of
// failing the whole build - a slightly worse link beats a broken deploy.

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
}

export interface LatestRelease {
  tag: string;
  htmlUrl: string;
  assets: ReleaseAsset[];
}

export async function getLatestRelease(repo: string): Promise<LatestRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "buildmc-website-build" },
    });
    if (!res.ok) {
      console.warn(`[github-releases] ${repo}: GitHub API returned ${res.status}, falling back to releases/latest link`);
      return null;
    }
    const data = await res.json();
    return {
      tag: data.tag_name,
      htmlUrl: data.html_url,
      assets: (data.assets ?? []).map((a: any) => ({ name: a.name, url: a.browser_download_url, size: a.size })),
    };
  } catch (err) {
    console.warn(`[github-releases] ${repo}: fetch failed (${err}), falling back to releases/latest link`);
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Best-effort human label for a release asset filename, for the common
// platform installer extensions these repos actually publish.
export function platformLabel(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".msi")) return "Windows (.msi)";
  if (lower.endsWith(".exe")) return "Windows (.exe)";
  if (lower.endsWith(".deb")) return "Linux (.deb)";
  if (lower.endsWith(".appimage")) return "Linux (.AppImage)";
  if (lower.endsWith(".flatpak")) return "Linux (.flatpak)";
  if (lower.endsWith(".dmg")) return "macOS (.dmg)";
  return filename;
}
