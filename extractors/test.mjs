var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DoodExtractor: () => DoodExtractor,
  ExtractorApi: () => ExtractorApi,
  Filemoon: () => Filemoon,
  HubCloud: () => HubCloud,
  JsHunter: () => JsHunter,
  JsUnpacker: () => JsUnpacker,
  M3u8Helper: () => M3u8Helper,
  MixDrop: () => MixDrop,
  Qualities: () => Qualities,
  RabbitStream: () => RabbitStream,
  StreamSb: () => StreamSb,
  StreamTape: () => StreamTape,
  StreamWish: () => StreamWish,
  SubtitleHelper: () => SubtitleHelper,
  VidHidePro: () => VidHidePro,
  Voe: () => Voe,
  httpsify: () => httpsify,
  imdbUrlToId: () => imdbUrlToId,
  qualityFromString: () => qualityFromString
});

// src/core/extractor_api.ts
var ExtractorApi = class {
  fixUrl(url) {
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `${this.mainUrl}${url}`;
    return `${this.mainUrl}/${url}`;
  }
};

// src/core/qualities.ts
var Qualities = {
  Unknown: 400,
  P144: 144,
  P240: 240,
  P360: 360,
  P480: 480,
  P720: 720,
  P1080: 1080,
  P2160: 2160
};
function qualityFromString(name) {
  if (!name) return Qualities.Unknown;
  if (/4k/i.test(name)) return Qualities.P2160;
  return parseInt(name.replace(/p/i, "")) || Qualities.Unknown;
}

// src/utils/js_unpacker.ts
var JsUnpacker = {
  unpack: (js) => {
    return getAndUnpack(js);
  }
};

// src/utils/m3u8_helper.ts
var M3u8Helper = class {
  static async getM3U8Qualities(masterUrl, headers) {
    try {
      const resp = await http_get(masterUrl, headers);
      if (resp.status !== 200 || !resp.body) return [];
      const lines = resp.body.split("\n");
      const results = [];
      let currentQuality = 400;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXT-X-STREAM-INF")) {
          const resMatch = /RESOLUTION=\d+x(\d+)/.exec(line);
          if (resMatch) {
            currentQuality = qualityFromString(`${resMatch[1]}p`);
          } else {
            const nameMatch = /NAME="([^"]+)"/.exec(line);
            if (nameMatch) currentQuality = qualityFromString(nameMatch[1]);
          }
        } else if (line && !line.startsWith("#")) {
          results.push({
            name: "M3U8",
            source: "M3u8Helper",
            url: line.startsWith("http") ? line : new URL(line, masterUrl).toString(),
            quality: currentQuality,
            type: "m3u8",
            headers
          });
        }
      }
      return results;
    } catch (e) {
      console.error("[M3u8Helper] getM3U8Qualities error:", e);
      return [];
    }
  }
};

// src/utils/js_hunter.ts
var JsHunter = class {
  static findFromJs(js, variableName) {
    try {
      const regex = new RegExp(`(?:var|let|const)\\s+${variableName}\\s*=\\s*(\\[[\\s\\S]*?\\]|{[\\s\\S]*?});?`);
      const match = regex.exec(js);
      if (match) {
        let jsonStr = match[1].replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        jsonStr = jsonStr.replace(/'/g, '"');
        return JSON.parse(jsonStr);
      }
    } catch (e) {
      console.error("[JsHunter] findFromJs error:", e);
    }
    return null;
  }
};

// src/utils/subtitle_helper.ts
var SubtitleHelper = class {
  static fromLanguageToTagIETF(lang) {
    const lower = lang.toLowerCase();
    if (lower === "english") return "en";
    if (lower === "spanish") return "es";
    if (lower === "hindi") return "hi";
    if (lower === "japanese") return "ja";
    return lower.substring(0, 2);
  }
  static fromTagToEnglishLanguageName(tag) {
    const lower = tag.toLowerCase();
    if (lower === "en") return "English";
    if (lower === "es") return "Spanish";
    if (lower === "hi") return "Hindi";
    if (lower === "ja") return "Japanese";
    return tag;
  }
  static getFlagFromIso(tag) {
    if (tag === "en") return "\u{1F1FA}\u{1F1F8}";
    if (tag === "ja") return "\u{1F1EF}\u{1F1F5}";
    if (tag === "hi") return "\u{1F1EE}\u{1F1F3}";
    return "\u{1F3F3}\uFE0F";
  }
};

// src/utils/url_utils.ts
function httpsify(url) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}
function imdbUrlToId(url) {
  if (!url) return null;
  const match = /title\/(tt\d+)/.exec(url);
  return match ? match[1] : null;
}

// src/extractors/hub_cloud.ts
var HubCloud = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "HubCloud";
    this.mainUrl = "https://hubcloud.club";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url, referer ? { Referer: referer } : {});
    if (res.status !== 200) return [];
    let finalPageBody = res.body;
    const downloadBtn = await parse_html(res.body, "a#download", "href");
    if (downloadBtn && downloadBtn.length > 0 && downloadBtn[0].attr) {
      let nextUrl = downloadBtn[0].attr;
      if (nextUrl.startsWith("/")) {
        nextUrl = `https://${new URL(url).hostname}${nextUrl}`;
      }
      const nextRes = await http_get(nextUrl, { Referer: url });
      if (nextRes.status === 200) {
        finalPageBody = nextRes.body;
      }
    }
    const serverLinks = await parse_html(finalPageBody, "a.btn", "href");
    const results = [];
    for (const link of serverLinks) {
      const href = link.attr;
      const text = link.text || "HubCloud Server";
      if (!href || href.startsWith("/") || href.includes("winexch") || href.includes("tinyurl")) continue;
      results.push({
        name: "HubCloud",
        source: text.replace("Download", "").replace(/[\[\]]/g, "").trim() || "HubCloud",
        url: href,
        quality: qualityFromString("Unknown"),
        type: "video",
        headers: { Referer: this.mainUrl }
      });
    }
    return results;
  }
};

// src/extractors/mix_drop.ts
var MixDrop = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "MixDrop";
    this.mainUrl = "https://mixdrop.co";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url, referer ? { Referer: referer } : {});
    if (res.status !== 200) return [];
    const unpacked = JsUnpacker.unpack(res.body);
    const match = /wurl="(https?:[^"]+)"/.exec(unpacked);
    if (!match) return [];
    let finalUrl = match[1];
    if (finalUrl.startsWith("//")) {
      finalUrl = "https:" + finalUrl;
    }
    return [{
      name: "MixDrop",
      source: "MixDrop",
      url: finalUrl,
      quality: Qualities.Unknown,
      type: "video",
      headers: { Referer: this.mainUrl }
    }];
  }
};

// src/extractors/voe.ts
var Voe = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "Voe";
    this.mainUrl = "https://voe.sx";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    const hlsMatch = /'hls':\s*'([^']+)'/.exec(res.body) || /"hls":\s*"([^"]+)"/.exec(res.body);
    const videoUrl = hlsMatch ? hlsMatch[1] : null;
    if (!videoUrl) return [];
    return [{
      name: this.name,
      source: this.name,
      url: videoUrl,
      quality: Qualities.Unknown,
      type: "m3u8",
      headers: { Referer: this.mainUrl }
    }];
  }
};

// src/extractors/stream_tape.ts
var StreamTape = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "StreamTape";
    this.mainUrl = "https://streamtape.com";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    const robotLinkElements = await parse_html(res.body, "#norobotlink", "innerHTML");
    if (!robotLinkElements || robotLinkElements.length === 0) return [];
    const innerHtml = robotLinkElements[0].html;
    const part1Match = /'([^']+)'/.exec(innerHtml) || /"([^"]+)"/.exec(innerHtml);
    const part2Match = /innerHTML\s*=\s*['"](.*?)['"]\s*\+\s*\(['"](.*?)['"]/.exec(res.body);
    let videoUrl = "";
    if (part2Match) {
      videoUrl = `https:${part2Match[1]}${part2Match[2]}`;
    } else if (part1Match) {
      videoUrl = `https:${part1Match[1]}`;
    }
    if (!videoUrl || videoUrl === "https:") return [];
    const finalUrl = videoUrl.replace(/&amp;/g, "&");
    return [{
      name: this.name,
      source: this.name,
      url: finalUrl,
      quality: Qualities.Unknown,
      type: "video",
      headers: { Referer: this.mainUrl }
    }];
  }
};

// src/extractors/filemoon.ts
var Filemoon = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "Filemoon";
    this.mainUrl = "https://filemoon.sx";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    let body = res.body;
    if (body.includes("p,a,c,k,e,d")) {
      body = JsUnpacker.unpack(body);
    }
    const fileMatch = /file:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body);
    if (!fileMatch) return [];
    const m3u8Url = fileMatch[1];
    return await M3u8Helper.getM3U8Qualities(m3u8Url, { Referer: this.mainUrl });
  }
};

// src/extractors/stream_wish.ts
var StreamWish = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "StreamWish";
    this.mainUrl = "https://streamwish.com";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    let body = res.body;
    if (body.includes("p,a,c,k,e,d")) {
      body = JsUnpacker.unpack(body);
    }
    const fileMatch = /file:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body) || /source:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body);
    if (!fileMatch) return [];
    return await M3u8Helper.getM3U8Qualities(fileMatch[1], { Referer: this.mainUrl });
  }
};

// src/extractors/stream_sb.ts
var StreamSb = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "StreamSB";
    this.mainUrl = "https://streamsb.com";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    const fileMatch = /master\.m3u8/.exec(res.body);
    return [];
  }
};

// src/extractors/vid_hide_pro.ts
var VidHidePro = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "VidHidePro";
    this.mainUrl = "https://vidhidepro.com";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    let body = res.body;
    if (body.includes("p,a,c,k,e,d")) {
      body = JsUnpacker.unpack(body);
    }
    const fileMatch = /file:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body) || /sources:\s*\[{file:\s*["']([^"']+)["']/.exec(body);
    if (!fileMatch) return [];
    return [{
      name: this.name,
      source: this.name,
      url: fileMatch[1],
      quality: Qualities.Unknown,
      type: "m3u8",
      headers: { Referer: this.mainUrl }
    }];
  }
};

// src/extractors/dood_extractor.ts
var DoodExtractor = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "DoodStream";
    this.mainUrl = "https://dood.watch";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url);
    if (res.status !== 200) return [];
    const md5Match = /\/pass_md5\/[^']*/.exec(res.body);
    if (!md5Match) return [];
    const md5Url = `https://${new URL(url).hostname}${md5Match[0]}`;
    const md5Res = await http_get(md5Url, { Referer: url });
    const tokenMatch = /token=([^&]+)/.exec(md5Url);
    const token = tokenMatch ? tokenMatch[1] : "";
    function makeid(length) {
      let result = "";
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    }
    const videoUrl = md5Res.body + makeid(10) + "?token=" + token + "&expiry=" + Date.now();
    return [{
      name: this.name,
      source: this.name,
      url: videoUrl,
      quality: Qualities.Unknown,
      type: "video",
      headers: { Referer: url }
    }];
  }
};

// src/extractors/rabbitstream.ts
var RabbitStream = class extends ExtractorApi {
  constructor() {
    super(...arguments);
    this.name = "RabbitStream";
    this.mainUrl = "https://rabbitstream.net";
    this.requiresReferer = false;
  }
  async getUrl(url, referer) {
    const res = await http_get(url, { Referer: referer || this.mainUrl });
    if (res.status !== 200) return [];
    const idMatch = url.split("/").pop()?.split("?")[0];
    if (!idMatch) return [];
    const apiUrl = `${this.mainUrl}/ajax/embed-4/getSources?id=${idMatch}`;
    const apiRes = await http_get(apiUrl, {
      "X-Requested-With": "XMLHttpRequest",
      "Referer": url
    });
    try {
      const json = JSON.parse(apiRes.body);
      if (!json.sources) return [];
      let sources = json.sources;
      return [{
        name: this.name,
        source: this.name,
        url: sources[0].file,
        quality: Qualities.Unknown,
        type: "m3u8",
        headers: { Referer: this.mainUrl }
      }];
    } catch {
      return [];
    }
  }
};

// test-extractor.ts
import { JSDOM } from "jsdom";
var _global = global;
_global.http_get = async (url, headers = {}) => {
  try {
    const res = await fetch(url, { headers });
    const body = await res.text();
    return {
      status: res.status,
      body,
      headers: Object.fromEntries(res.headers.entries())
    };
  } catch (e) {
    return { status: 500, body: e.message, headers: {} };
  }
};
_global.parse_html = async (htmlStr, selector, attr) => {
  const dom = new JSDOM(htmlStr);
  const els = Array.from(dom.window.document.querySelectorAll(selector));
  return els.map((el) => ({
    text: el.textContent || "",
    html: el.innerHTML || "",
    attr: attr ? el.getAttribute(attr) || "" : ""
  }));
};
_global.getAndUnpack = (js) => js;
async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error("Please provide a URL to test");
    process.exit(1);
  }
  console.log("Testing Extractor with URL:", url);
  let results = [];
  let found = false;
  for (const key of Object.keys(src_exports)) {
    const ExtractorClass = src_exports[key];
    if (typeof ExtractorClass === "function" && ExtractorClass.prototype && ExtractorClass.prototype.getUrl) {
      try {
        const instance = new ExtractorClass();
        const hostnameMatch = instance.mainUrl && url.includes(new URL(instance.mainUrl).hostname.split(".")[0]);
        const nameMatch = url.toLowerCase().includes(key.toLowerCase());
        if (hostnameMatch || nameMatch) {
          console.log(`Matched extractor: ${key}`);
          found = true;
          results = await instance.getUrl(url);
          break;
        }
      } catch (e) {
      }
    }
  }
  if (!found) {
    console.log("No matching extractor found for this URL.");
  } else {
    console.log("\nResults:");
    console.log(JSON.stringify(results, null, 2));
  }
}
run();
