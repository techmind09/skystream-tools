import { ExtractorApi, IExtractorLink } from '../core/extractor_api';
import { Qualities } from '../core/qualities';

export class StreamTape extends ExtractorApi {
  name = 'StreamTape';
  mainUrl = 'https://streamtape.com';
  requiresReferer = false;

  async getUrl(url: string, referer?: string): Promise<IExtractorLink[]> {
    // Header ko simple object ki tarah pass karein
    const res = await http_get(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    if (res.status !== 200) return [];

    // Streamtape ka dynamic link dhundhne ke liye Regex
    // Ye code 'robotlink' ke andar ka JS logic pakdega
    const scriptMatch = /document\.getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*(.*?)\.substring/i.exec(res.body) ||
                        /document\.getElementById\(['"]robotlink['"]\)\.innerHTML\s*=\s*(.*)/i.exec(res.body);

    if (scriptMatch && scriptMatch[1]) {
      try {
        // String mein se quotes aur brackets hatakar direct URL join karein
        const rawCode = scriptMatch[1].replace(/['"\+\s\(\)]/g, '');
        const videoUrl = 'https:' + rawCode + '&stream=1';

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
