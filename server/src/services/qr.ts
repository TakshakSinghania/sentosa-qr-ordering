import QRCode from 'qrcode';
import { config } from '../config/env.js';

export function getTableMenuUrl(restaurantSlug: string, tableToken: string): string {
  return `${config.appUrl}/menu/${restaurantSlug}/t/${tableToken}`;
}

export async function generateTableQrDataUrl(
  restaurantSlug: string,
  tableToken: string
): Promise<string> {
  const url = getTableMenuUrl(restaurantSlug, tableToken);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });
}

export async function generateTableQrSvg(
  restaurantSlug: string,
  tableToken: string
): Promise<string> {
  const url = getTableMenuUrl(restaurantSlug, tableToken);
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });
}
