import { loadExtractor } from './src/core/registry';
import './src/index';
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

_global.http_post = async (url: string, headers?: Record<string, string>, body?: string) => {
  try {
    const res = await axios.post(url, body, { headers });
    return {
      status: res.status,
      body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      headers: res.headers,
    };
  } catch (e: any) {
    return { status: e.response?.status || 500, body: e.message, headers: {} };
  }
};

_global.http_parallel = async (requests: any[]) => {
  return Promise.all(requests.map(async (r) => {
    try {
      const res = await axios({ method: r.method || 'GET', url: r.url, headers: r.headers, data: r.body });
      return { status: res.status, body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data), headers: res.headers };
    } catch (e: any) {
      return { status: e.response?.status || 500, body: e.message, headers: {} };
    }
  }));
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

_global.getAndUnpack = (js: string) => js;

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
