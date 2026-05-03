import * as extractors from './src/index';
import { JSDOM } from 'jsdom';

const _global = global as any;

_global.http_get = async (url: string, headers: any = {}) => {
  try {
    const res = await fetch(url, { headers });
    const body = await res.text();
    return {
      status: res.status,
      body: body,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (e: any) {
    return { status: 500, body: e.message, headers: {} };
  }
};

_global.parse_html = async (htmlStr: string, selector: string, attr?: string) => {
  const dom = new JSDOM(htmlStr);
  const els = Array.from(dom.window.document.querySelectorAll(selector));
  return els.map((el) => ({
    text: el.textContent || '',
    html: el.innerHTML || '',
    attr: attr ? (el.getAttribute(attr) || '') : '',
  }));
};

_global.getAndUnpack = (js: string) => js;

async function run() {
    const url = process.argv[2];
    if (!url) {
        console.error("Please provide a URL to test");
        process.exit(1);
    }
    console.log('Testing Extractor with URL:', url);
    
    let results: any[] = [];
    let found = false;

    for (const key of Object.keys(extractors)) {
        const ExtractorClass = (extractors as any)[key];
        if (typeof ExtractorClass === 'function' && ExtractorClass.prototype && ExtractorClass.prototype.getUrl) {
            try {
                const instance = new ExtractorClass();
                const hostnameMatch = instance.mainUrl && url.includes(new URL(instance.mainUrl).hostname.split('.')[0]);
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
