const { loadExtractor } = require('./dist/index.js');
const { JSDOM } = require('../cli/node_modules/jsdom');
require('./dist/index.js'); // ensuring registry is populated

const _global = global;

_global.http_get = async (url, headers = {}) => {
  try {
    const res = await fetch(url, { headers });
    const body = await res.text();
    return {
      status: res.status,
      body: body,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (e) {
    return { status: 500, body: e.message, headers: {} };
  }
};

_global.parse_html = async (htmlStr, selector, attr) => {
  const dom = new JSDOM(htmlStr);
  const els = Array.from(dom.window.document.querySelectorAll(selector));
  return els.map((el) => ({
    text: el.textContent || '',
    html: el.innerHTML || '',
    attr: attr ? (el.getAttribute(attr) || '') : '',
  }));
};

_global.getAndUnpack = (js) => js;

async function run() {
    const url = process.argv[2];
    if (!url) {
        console.error("Please provide a URL to test");
        process.exit(1);
    }
    console.log('Testing Extractor with URL:', url);
    
    // We pass empty referer just for testing
    const results = await loadExtractor(url);
    console.log("\nResults:");
    console.log(JSON.stringify(results, null, 2));
}

run();
