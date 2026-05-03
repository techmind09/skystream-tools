import { ExtractorApi, IExtractorLink } from '../core/extractor_api';
import { registerExtractor } from '../core/registry';
import { JsUnpacker } from '../utils/js_unpacker';
import { M3u8Helper } from '../utils/m3u8_helper';

class StreamWish extends ExtractorApi {
  name = 'StreamWish';
  mainUrl = 'https://streamwish.com';
  requiresReferer = false;

  async getUrl(url: string, referer?: string): Promise<IExtractorLink[]> {
    const res = await http_get(url);
    if (res.status !== 200) return [];

    let body = res.body;
    if (body.includes('p,a,c,k,e,d')) {
      body = JsUnpacker.unpack(body);
    }

    const fileMatch = /file:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body) || /source:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(body);
    if (!fileMatch) return [];

    return await M3u8Helper.getM3U8Qualities(fileMatch[1], { Referer: this.mainUrl });
  }
}

registerExtractor(new StreamWish());
