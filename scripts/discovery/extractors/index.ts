import { extractAstellKern } from './astellkern';
import { extractCayin } from './cayin';
import { extractCowon } from './cowon';
import { extractFiio } from './fiio';
import { extractHiby } from './hiby';
import { extractHidizs } from './hidizs';
import { extractIbasso } from './ibasso';
import { extractLotoo } from './lotoo';
import { extractQls } from './qls';
import { extractRetailer } from './retailer';
import { extractShanling } from './shanling';
import { extractSony } from './sony';
import type { DiscoveredProduct, DiscoverySource } from '../types';

export function extractProducts(html: string, source: DiscoverySource): DiscoveredProduct[] {
  switch (source.extractor) {
    case 'astellkern':
      return extractAstellKern(html, source);
    case 'cowon':
      return extractCowon(html, source);
    case 'fiio':
      return extractFiio(html, source);
    case 'shanling':
      return extractShanling(html, source);
    case 'ibasso':
      return extractIbasso(html, source);
    case 'cayin':
      return extractCayin(html, source);
    case 'hiby':
      return extractHiby(html, source);
    case 'hidizs':
      return extractHidizs(html, source);
    case 'qls':
      return extractQls(html, source);
    case 'lotoo':
      return extractLotoo(html, source);
    case 'sony':
      return extractSony(html, source);
    case 'retailer':
      return extractRetailer(html, source);
    default:
      return [];
  }
}
