import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vm from 'vm';
import * as nodeCrypto from 'crypto';

export interface RuntimeOptions {
  manifest: any;
  pluginPath: string;
}

export class SkyStreamRuntime {
  private context: any;

  constructor(private options: RuntimeOptions) {
    this.context = this.createMockContext();
  }

  private createMockContext() {
    const sandbox = Object.create(null);
    Object.assign(sandbox, {
      manifest: this.options.manifest,
      console: {
        log: (...args: any[]) => console.log('[Plugin Log]:', ...args),
        error: (...args: any[]) => console.error('[Plugin Error]:', ...args),
        warn: (...args: any[]) => console.warn('[Plugin Warn]:', ...args),
      },
      http_get: async (url: string, headers: any, cb: any) => {
        try {
          console.log(`[Runtime HTTP] GET ${url}`, JSON.stringify(headers));
          const res = await axios.get(url, { headers: headers || {} });
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          const result = { status: res.status, statusCode: res.status, body, headers: res.headers };
          if (cb) cb(result);
          return result;
        } catch (e: any) {
          const res = { status: e.response?.status || 500, statusCode: e.response?.status || 500, body: e.response?.data || e.message, headers: e.response?.headers || {} };
          if (cb) cb(res);
          return res;
        }
      },
      http_post: async (url: string, headers: any, body: any, cb: any) => {
        try {
          const res = await axios.post(url, body, { headers: headers || {} });
          const respBody = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          const result = { status: res.status, statusCode: res.status, body: respBody, headers: res.headers };
          if (cb) cb(result);
          return result;
        } catch (e: any) {
          const res = { status: e.response?.status || 500, statusCode: e.response?.status || 500, body: e.response?.data || e.message, headers: e.response?.headers || {} };
          if (cb) cb(res);
          return res;
        }
      },
      btoa: (s: string) => Buffer.from(s).toString('base64'),
      atob: (s: string) => Buffer.from(s, 'base64').toString('utf8'),
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      registerSettings: (schema: any[]) => {
        console.log('[Mock SDK]: Plugin registered settings:', JSON.stringify(schema, null, 2));
      },
      solveCaptcha: async (siteKey: string, url: string) => {
        console.log('[Mock SDK]: solveCaptcha requested for ' + url);
        return "mock_token";
      },
      crypto: {
        decryptAES: (dataB64: string, keyB64: string, ivB64: string, options?: any) => {
          const mode = (options?.mode || 'cbc').toLowerCase();
          const key = Buffer.from(keyB64, 'base64');
          const iv = Buffer.from(ivB64, 'base64');
          const data = Buffer.from(dataB64, 'base64');

          if (mode === 'gcm') {
            const tag = data.slice(data.length - 16);
            const ciphertext = data.slice(0, data.length - 16);
            
            const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
          } else {
            const decipher = nodeCrypto.createDecipheriv('aes-256-cbc', key, iv);
            return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
          }
        },
        pbkdf2: (password: string, saltB64: string, iterations: number, keyLength: number) => {
          const salt = Buffer.from(saltB64, 'base64');
          const key = nodeCrypto.pbkdf2Sync(password, salt, iterations || 10000, keyLength || 32, 'sha256');
          return key.toString('base64');
        }
      },
      Actor: class Actor {
        constructor(data: any) { Object.assign(this, data); }
      },
      Trailer: class Trailer {
        constructor(data: any) { Object.assign(this, data); }
      },
      NextAiring: class NextAiring {
        constructor(data: any) { Object.assign(this, data); }
      },
      MultimediaItem: class MultimediaItem {
        constructor(data: any) { 
          Object.assign(this, {
            type: 'movie',
            status: 'ongoing',
            playbackPolicy: 'none',
            isAdult: false,
            streams: [],
            syncData: {},
            ...data
          }); 
        }
      },
      Episode: class Episode {
        constructor(data: any) { 
          Object.assign(this, {
            season: 0,
            episode: 0,
            dubStatus: 'none',
            playbackPolicy: 'none',
            streams: [],
            ...data
          }); 
        }
      },
      StreamResult: class StreamResult {
        constructor(data: any) { Object.assign(this, data); }
      },
      JSDOM: JSDOM,
      URL: URL,
    });
    sandbox.globalThis = sandbox;
    return vm.createContext(sandbox);
  }

  public async run(jsContent: string) {
    try {
      vm.runInContext(jsContent, this.context, {
        timeout: 5000,
        breakOnSigint: true,
      });
    } catch (e: any) {
      console.error('[Runtime Error]:', e);
      throw e;
    }
    return this.context.globalThis;
  }
}
