import { ExtractorApi, IExtractorLink } from '../core/extractor_api';
import { Qualities } from '../core/qualities';
import vm from 'vm'; 

export class StreamTape extends ExtractorApi {
  name = 'StreamTape';
  mainUrl = 'https://streamtape.com';
  requiresReferer = false;

  async getUrl(url: string, referer?: string): Promise<IExtractorLink[]> {
    // 1. Header ke saath request karein
    const res = await http_get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
    });

    if (res.status !== 200) return [];

    // 2. Streamtape ka naya JS logic pakdein
    const scriptMatch = /document\.getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*(.*)/.exec(res.body);
    
    if (scriptMatch) {
        try {
            const sandbox = { document: { getElementById: () => ({ innerHTML: '' }) } };
            vm.createContext(sandbox);
            vm.runInContext(`var result = ${scriptMatch[1]}`, sandbox);
            
            const videoUrl = 'https:' + (sandbox as any).result + '&stream=1';

            return [{
                name: this.name,
                source: this.name,
                url: videoUrl,
                quality: Qualities.Unknown,
                type: 'video',
                headers: { Referer: url }
            }];
        } catch (e) {
            console.error("Extraction error:", e);
        }
    }
    return [];
  }
}
