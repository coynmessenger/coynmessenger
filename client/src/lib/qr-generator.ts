const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
import QRCode from 'qrcode';

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code data URL for MetaMask mobile connections
 */
export async function generateMetaMaskQRCode(
  dappUrl: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions = {
    size: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };

  try {
    // Generate the MetaMask deep link URL using hostname-only for maximum compatibility
    const url = new URL(dappUrl);
    const hostname = url.hostname;
    const metamaskUrl = `https://metamask.app.link/dapp/${hostname}`;
    
    log('🔧 Generating QR code for MetaMask URL (hostname-only for compatibility):', metamaskUrl);
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(metamaskUrl, {
      width: defaultOptions.size,
      margin: defaultOptions.margin,
      color: defaultOptions.color,
      errorCorrectionLevel: 'M'
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('❌ Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code for any URL
 */
export async function generateQRCode(
  url: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions = {
    size: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };

  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: defaultOptions.size,
      margin: defaultOptions.margin,
      color: defaultOptions.color,
      errorCorrectionLevel: 'M'
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('❌ Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}