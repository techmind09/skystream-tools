import { ExtractorApi, IExtractorLink } from './extractor_api';

const _registry: ExtractorApi[] = [];

export function registerExtractor(e: ExtractorApi): void {
  _registry.unshift(e);
}

const schemaStrip = /^https?:\/\/(www\.)?/;

export async function loadExtractor(
  url: string,
  referer?: string
): Promise<IExtractorLink[]> {
  const cleanUrl = url.toLowerCase().replace(schemaStrip, '');

  // Step 1: Exact prefix match
  for (const ext of [..._registry].reverse()) {
    const cleanMain = ext.mainUrl.toLowerCase()
      .replace(schemaStrip, '').replace('*', '');
    if (cleanUrl.startsWith(cleanMain)) {
      try {
        return await ext.getUrl(url, referer);
      } catch (e) {
        console.error(`[${ext.name}]`, e);
      }
    }
  }

  // Step 2: SLD fuzzy match for mirror domains
  for (const ext of [..._registry].reverse()) {
    if (_sld(ext.mainUrl) && _sld(ext.mainUrl) === _sld(url)) {
      try {
        return await ext.getUrl(url, referer);
      } catch {
        // continue
      }
    }
  }
  return [];
}

function _sld(url: string): string | null {
  try {
    const parts = new URL(url.includes('://') ? url : `https://${url}`)
      .hostname.split('.');
    return parts.length >= 2 ? parts[parts.length - 2] : null;
  } catch {
    return null;
  }
}
