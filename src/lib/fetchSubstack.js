// src/lib/fetchSubstack.js
import { readFileSync, writeFileSync, existsSync } from "fs";

const FEED_URL = "https://architecturalbytes.substack.com/feed";
const CACHE_FILE = "src/lib/feed.xml";

/**
 * Gets a DOM parser that works in both browser and Node environments.
 * Falls back to linkedom for server-side rendering.
 */
async function getDOMParser() {
  // Browser environment
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  
  // Node/SSR environment - use linkedom as a lightweight fallback
  try {
    const { parseHTML } = await import('linkedom');
    return {
      parseFromString: (xml, type) => parseHTML(xml).document
    };
  } catch (err) {
    throw new Error(
      'DOMParser not available. In Node, install linkedom: npm install linkedom'
    );
  }
}

/**
 * Fetches recent posts from Substack and caches the XML feed.
 * Falls back to the last cached feed if the network call fails.
 */
export async function fetchSubstackPosts(limit = 3) {
  let xml = null;
  let fromCache = false;

  try {
    const res = await fetch(FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    xml = await res.text();

    // Update local cache
    writeFileSync(CACHE_FILE, xml, "utf8");
    console.log("✅ Substack feed fetched and cached.");
  } catch (err) {
    console.warn("⚠️ Substack feed fetch failed:", err.message);

    // Fallback to cached version if available
    if (existsSync(CACHE_FILE)) {
      xml = readFileSync(CACHE_FILE, "utf8");
      fromCache = true;
      console.log("📦 Using cached feed.xml");
    } else {
      console.warn("❌ No cached feed available. Returning empty list.");
      return [];
    }
  }

  // Parse the XML (either from live or cached)
  try {
    const parser = await getDOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, limit);

    const posts = items.map(item => {
      // Extract title and strip CDATA wrapping if present
      let title = item.querySelector("title")?.textContent?.trim() ?? "";
      title = title.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
      
      // Extract link - try textContent first, then check for href attribute or guid as fallback
      let link = item.querySelector("link")?.textContent?.trim() ?? "";
      if (!link) {
        link = item.querySelector("guid")?.textContent?.trim() ?? "";
      }
      
      return {
        title,
        link,
        pubDate: new Date(
          item.querySelector("pubDate")?.textContent ?? Date.now()
        ).toLocaleDateString(),
      };
    });

    if (fromCache) console.log(`ℹ️ Loaded ${posts.length} posts from cache.`);
    return posts;
  } catch (parseErr) {
    console.error("❌ Failed to parse feed XML:", parseErr.message);
    return [];
  }
};