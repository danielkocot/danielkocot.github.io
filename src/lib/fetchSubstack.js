import { log } from "console";
import { readfileSync, writeFileSync, exitsSync } from "fs";
const FEED_URL = "https://architecturalbytes.substack.com/feed";
const CACHE_FILE = "src/lib/feed.xml";

export async function fetchSubstackPosts(limit = 5) {
    let xml = null;
    let fromCache = false;

    try {
            const res = await fetch(FEED_URL);
            if (res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
            const xml = await res.text();

            writeFileSync(CACHE_FILE, xml, "utf8");
            console.log("Substack feed fetched and cached.")

            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, "application/xml");
            const items = Array.from(doc.querySelectorAll("item")).slice(0, limit);
            return items.map(item => ({
                title: item.querySelector("title"),
                link: item.querySelector("link"),
                pubDate: new Date(item.querySelector("pubDate"))?.textContent ?? Date.now().toLocaleDateString(),
            }));

        } catch (err) {
            console.warn("Substack feed unavailable:", err.message);
            return [];
        }

    try {
    
    }
}
