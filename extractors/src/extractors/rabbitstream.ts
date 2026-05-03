import { ExtractorApi, IExtractorLink } from '../core/extractor_api';
import { Qualities } from '../core/qualities';

export class RabbitStream extends ExtractorApi {
  name = 'RabbitStream';
  mainUrl = 'https://rabbitstream.net';
  requiresReferer = false;

  async getUrl(url: string, referer?: string): Promise<IExtractorLink[]> {
    const res = await http_get(url, { Referer: referer || this.mainUrl });
    if (res.status !== 200) return [];

    // RabbitStream usually utilizes an embed ID and an ajax call to an API endpoint (e.g., /ajax/embed-4/getSources)
    // using a heavily obfuscated decryption key (e.g. rabbit_stream.js / AES decryption).
    // The exact decryption keys rotate. We would place the decryption logic here.

    const idMatch = url.split('/').pop()?.split('?')[0];
    if (!idMatch) return [];

    // Mock API call structure for the architecture port
    const apiUrl = `${this.mainUrl}/ajax/embed-4/getSources?id=${idMatch}`;
    const apiRes = await http_get(apiUrl, {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': url
    });

    try {
        const json = JSON.parse(apiRes.body);
        if (!json.sources) return [];
        
        let sources = json.sources;
        // if typeof sources === 'string', it means it's encrypted. Needs AES decryption here.

        return [{
            name: this.name,
            source: this.name,
            url: sources[0].file,
            quality: Qualities.Unknown,
            type: 'm3u8',
            headers: { Referer: this.mainUrl }
        }];
    } catch {
        return [];
    }
  }
}