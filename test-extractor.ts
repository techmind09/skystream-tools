import { loadExtractor } from './extractors/src/core/registry';
import './extractors/src/index';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const _global = global as any;

_global.http_get = async (url: string, headers?: Record<string, string>) => {
  try {
    const res = await axios.get(url, { headers });
    return {
      status: res.status,
      body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      headers: res.headers,
    };
  } catch (e: any) {
    return { status: e.response?.status || 500, body: e.message, headers: {} };
  }
};

_global.parse_html = async (htmlStr: string, selector: string, attr?: string) => {
  const dom = new JSDOM(htmlStr);
  const els = Array.from(dom.window.document.querySelectorAll(selector));
  return els.map((el: any) => ({
    text: el.textContent || '',
    html: el.innerHTML || '',
    attr: attr ? (el.getAttribute(attr) || '') : '',
  }));
};

async function run() {
    const url = process.argv[2];
    if (!url) {
        console.error("Please provide a URL to test");
        process.exit(1);
    }
    console.log('Testing Extractor with URL:', url);
    const results = await loadExtractor(url);
    console.log(JSON.stringify(results, null, 2));
}

run();
