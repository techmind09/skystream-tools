import { ExtractorApi, IExtractorLink } from '../core/extractor_api';
import { Qualities } from '../core/qualities';
import { registerExtractor } from '../core/registry';
import { JsUnpacker } from '../utils/js_unpacker';

class VidHidePro extends ExtractorApi {
  name = 'VidHidePro';
  mainUrl = 'https://vidhidepro.com';
  requiresReferer = false;

  async getUrl(url: string, referer?: string): Promise<IExtractorLink[]> {
    const res = await http_get(url);
    if (res.status !== 200) return [];

    let body = res.body;
    if (body.includes('p,a,c,k,e,d')) {
      body = JsUnpacker.unpack(body);
    }

    const fileMatch = /file:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body) || /sources:\s*\[{file:\s*["']([^"']+)["']/.exec(body);
    if (!fileMatch) return [];

    return [{
      name: this.name,
      source: this.name,
      url: fileMatch[1],
      quality: Qualities.Unknown,
      type: 'm3u8',
      headers: { Referer: this.mainUrl }
    }];
  }
}

registerExtractor(new VidHidePro());
