import { PKPass } from 'passkit-generator';
import path from 'path';
import fs from 'fs';

function getCertBuffer(envVarName: string, localFilePath: string): Buffer {
  // If base64 string provided in environment variables (for Vercel/serverless)
  if (process.env[envVarName]) {
    const raw = process.env[envVarName]!;
    // If it looks like base64
    if (!raw.includes('-----BEGIN')) {
      return Buffer.from(raw, 'base64');
    }
    return Buffer.from(raw, 'utf-8');
  }

  // Otherwise read from local disk
  const fullPath = path.isAbsolute(localFilePath)
    ? localFilePath
    : path.join(process.cwd(), localFilePath);

  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath);
  }

  throw new Error(`Certificate not found: ${envVarName} or ${localFilePath}`);
}

export async function generatePass(coupon: any, restaurant: any): Promise<Buffer> {
  const modelDir = path.join(process.cwd(), 'src/lib/pass/pass.model');

  const wwdr = getCertBuffer('APPLE_WWDR_CERT_BASE64', 'certs/wwdr.pem');
  const signerCert = getCertBuffer('APPLE_SIGNER_CERT_BASE64', 'certs/signerCert.pem');
  const signerKey = getCertBuffer('APPLE_SIGNER_KEY_BASE64', 'certs/signerKey.pem');

  const serial = coupon.pass_serial || coupon.id;

  const pass = await PKPass.from(
    {
      model: modelDir,
      certificates: {
        wwdr,
        signerCert,
        signerKey,
      }
    },
    {
      serialNumber: serial
    }
  );

  pass.headerFields.push({
    key: 'brand',
    label: 'REWARD',
    value: restaurant?.name || 'Amplyfy'
  });

  pass.primaryFields.push({
    key: 'discount',
    label: 'OFFER',
    value: `${coupon.prize_percent}% OFF`
  });

  pass.secondaryFields.push({
    key: 'guest',
    label: 'GUEST',
    value: coupon.guest_name || 'Guest'
  });

  const expiresDate = new Date(coupon.expires_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  pass.auxiliaryFields.push({
    key: 'expires',
    label: 'EXPIRES',
    value: expiresDate
  });

  pass.backFields.push(
    {
      key: 'instructions',
      label: 'HOW TO REDEEM',
      value: 'Show this pass to your server or cashier when ordering. Staff will scan the QR code to validate and enter their staff PIN to apply the discount.'
    },
    {
      key: 'terms',
      label: 'TERMS & CONDITIONS',
      value: `One-time use coupon. Valid for ${coupon.prize_percent}% off your bill at ${restaurant?.name || 'participating location'}. Cannot be combined with other offers or discounts.`
    }
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redeemUrl = `${baseUrl}/redeem/${coupon.id}`;

  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: redeemUrl,
    messageEncoding: 'iso-8859-1',
    altText: `Scan or tap to redeem`
  });

  return pass.getAsBuffer();
}
