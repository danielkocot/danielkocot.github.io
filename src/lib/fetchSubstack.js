// src/lib/fetchSubstack.js
import { readFileSync, writeFileSync, existsSync } from "fs";

const ARCHIVE_URL = "https://architecturalbytes.substack.com/api/v1/archive";
const CACHE_FILE = "src/lib/substack-archive.json";
const PAGE_SIZE = 20;

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Add delay between retries (exponential backoff: 2s, 4s, 8s)
      if (i > 0) {
        const delayMs = Math.pow(2, i) * 1000;
        console.log(`Retrying in ${delayMs}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      const res = await fetch(url, options);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err;
    }
  }
  
  throw lastError;
}

export async function fetchSubstackPosts(limit = 3) {
  let archive = [];
  let fromCache = false;
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  try {
    if (!isCI) {
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://architecturalbytes.substack.com/",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      };

      let offset = 0;
      while (true) {
        const url = `${ARCHIVE_URL}?sort=new&offset=${offset}&limit=${PAGE_SIZE}`;
        const res = await fetchWithRetry(url, { headers });
        const page = await res.json();

        if (!Array.isArray(page) || page.length === 0) {
          break;
        }

        archive.push(...page);

        if (page.length < PAGE_SIZE) {
          break;
        }

        offset += PAGE_SIZE;
      }

      writeFileSync(CACHE_FILE, JSON.stringify(archive, null, 2), "utf8");
      console.log(`✅ Substack archive fetched and cached (${archive.length} posts).`);
    } else {
      throw new Error('Running in CI - using cached feed only');
    }
  } catch (err) {
    console.warn("⚠️ Substack archive fetch failed:", err.message);

    if (existsSync(CACHE_FILE)) {
      archive = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      fromCache = true;
      console.log("📦 Using cached substack-archive.json");
    } else {
      console.warn("❌ No cached archive available. Returning empty list.");
      return [];
    }
  }

  const posts = archive
    .map((post) => ({
      title: post.title?.trim?.() ?? post.title ?? "",
      link: post.canonical_url || (post.slug ? `https://architecturalbytes.substack.com/p/${post.slug}` : ""),
      pubDate: new Date(post.post_date ?? Date.now()).toLocaleDateString(),
    }))
    .slice(0, limit);

  if (fromCache) console.log(`ℹ️ Loaded ${posts.length} posts from cache.`);
  return posts;
};
