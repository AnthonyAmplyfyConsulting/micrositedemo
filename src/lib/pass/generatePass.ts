import { PKPass } from 'passkit-generator';
import path from 'path';
import fs from 'fs';
import forge from 'node-forge';

function extractCerts() {
  // If base64-encoded PEM strings are provided in env:
  if (process.env.APPLE_WWDR_CERT_BASE64 && process.env.APPLE_SIGNER_CERT_BASE64 && process.env.APPLE_SIGNER_KEY_BASE64) {
    const parse = (val: string) => {
      if (val.includes('-----BEGIN')) return Buffer.from(val, 'utf-8');
      return Buffer.from(val, 'base64');
    };
    return {
      wwdr: parse(process.env.APPLE_WWDR_CERT_BASE64),
      signerCert: parse(process.env.APPLE_SIGNER_CERT_BASE64),
      signerKey: parse(process.env.APPLE_SIGNER_KEY_BASE64),
    };
  }

  // If local .pem files exist on disk:
  const certsDir = path.join(process.cwd(), 'certs');
  const wwdrPath = path.join(certsDir, 'wwdr.pem');
  const certPath = path.join(certsDir, 'signerCert.pem');
  const keyPath = path.join(certsDir, 'signerKey.pem');

  if (fs.existsSync(wwdrPath) && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      wwdr: fs.readFileSync(wwdrPath),
      signerCert: fs.readFileSync(certPath),
      signerKey: fs.readFileSync(keyPath),
    };
  }

  // If running with .p12 and password (e.g. from Vercel env or local fallback):
  const p12Password = process.env.APPLE_PASS_CERT_PASSWORD || 'Flyfit_97$';
  let p12Buffer: Buffer | null = null;

  if (process.env.APPLE_PASS_P12_BASE64) {
    p12Buffer = Buffer.from(process.env.APPLE_PASS_P12_BASE64, 'base64');
  } else if (fs.existsSync(path.join(certsDir, 'amplyfy-pass.p12'))) {
    p12Buffer = fs.readFileSync(path.join(certsDir, 'amplyfy-pass.p12'));
  }

  let wwdrBuffer: Buffer | null = null;
  if (process.env.APPLE_WWDR_BASE64) {
    wwdrBuffer = Buffer.from(process.env.APPLE_WWDR_BASE64, 'base64');
  } else if (fs.existsSync(path.join(certsDir, 'AppleWWDRCAG4.cer'))) {
    wwdrBuffer = fs.readFileSync(path.join(certsDir, 'AppleWWDRCAG4.cer'));
  }

  if (p12Buffer && wwdrBuffer) {
    // Extract using node-forge in memory
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Password);

    let certPem = '';
    let keyPem = '';

    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.cert) {
          certPem += forge.pki.certificateToPem(safeBag.cert);
        }
        if (safeBag.key) {
          keyPem += forge.pki.privateKeyToPem(safeBag.key);
        }
      }
    }

    let wwdrPem = '';
    const wwdrStr = wwdrBuffer.toString('utf-8');
    if (wwdrStr.includes('-----BEGIN CERTIFICATE-----')) {
      wwdrPem = wwdrStr;
    } else {
      const wwdrAsn1 = forge.asn1.fromDer(wwdrBuffer.toString('binary'));
      const wwdrCert = forge.pki.certificateFromAsn1(wwdrAsn1);
      wwdrPem = forge.pki.certificateToPem(wwdrCert);
    }

    return {
      wwdr: Buffer.from(wwdrPem, 'utf-8'),
      signerCert: Buffer.from(certPem, 'utf-8'),
      signerKey: Buffer.from(keyPem, 'utf-8'),
    };
  }

  throw new Error('No valid Apple certificates found in environment variables or certs/ folder.');
}

export type PassOptions = {
  /** Demo passes are real, signed Wallet passes, but their QR code cannot be redeemed. */
  demo?: boolean;
};

export async function generatePass(
  coupon: any,
  restaurant: any,
  explicitBaseUrl?: string,
  options: PassOptions = {}
): Promise<Buffer> {
  const modelDir = path.join(process.cwd(), 'src/lib/pass/pass.model');
  const certificates = extractCerts();

  const serial = coupon.pass_serial || coupon.id;

  const pass = await PKPass.from(
    {
      model: modelDir,
      certificates,
    },
    {
      serialNumber: serial,
    }
  );

  const baseUrl = explicitBaseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://micrositedemo.vercel.app';
  const redeemUrl = options.demo ? `${baseUrl}/demo` : `${baseUrl}/redeem/${coupon.id}`;
  const venue = restaurant?.name || 'Amplyfy';

  // Layout mirrors the guided demo pass: wordmark + "GUEST REWARD", big offer, guest / use.
  pass.headerFields.push({
    key: 'brand',
    label: options.demo ? 'DEMO PASS' : 'GUEST REWARD',
    value: venue,
  });

  pass.primaryFields.push({
    key: 'discount',
    label: 'YOUR FIRST MONTH WITH US',
    value: `${coupon.prize_percent}% OFF`,
  });

  pass.secondaryFields.push(
    {
      key: 'guest',
      label: 'GUEST',
      value: coupon.guest_name || 'Guest',
    },
    {
      key: 'use',
      label: 'OFFER',
      value: 'First month',
      textAlignment: 'PKTextAlignmentRight',
    }
  );

  const expiresDate = new Date(coupon.expires_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  pass.auxiliaryFields.push(
    {
      key: 'offer',
      label: 'REWARD',
      value: `${coupon.prize_percent}% Off First Month`,
    },
    {
      key: 'expires',
      label: 'EXPIRES',
      value: expiresDate,
      textAlignment: 'PKTextAlignmentRight',
    }
  );

  if (options.demo) {
    pass.backFields.push(
      {
        key: 'demo_notice',
        label: 'EXCLUSIVE REWARD',
        value: `Valid for ${coupon.prize_percent}% off your first month with us at Amplyfy.`,
      },
      {
        key: 'terms',
        label: 'TERMS & CONDITIONS',
        value: `One-time use pass. Valid for ${coupon.prize_percent}% off your first month with us at Amplyfy. Cannot be combined with other offers or discounts.`,
      }
    );
  } else {
    // Back Fields - Apple automatically converts raw URLs into tappable links on iOS
    pass.backFields.push(
      {
        key: 'redeem_link',
        label: 'STAFF REDEEM LINK',
        value: `Tap here to redeem: ${redeemUrl}`,
      },
      {
        key: 'instructions',
        label: 'HOW TO REDEEM',
        value:
          'Show this pass to your server or bartender. Staff can tap the Staff Redeem Link above or scan the QR code on the front to enter their staff PIN.',
      },
      {
        key: 'terms',
        label: 'TERMS & CONDITIONS',
        value: `One-time use pass. Valid for ${coupon.prize_percent}% off your first month with us at ${
          restaurant?.name || 'Amplyfy'
        }. Cannot be combined with other offers or discounts.`,
      }
    );
  }

  // Front QR Code - Barcode altText shows the tap instruction
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: redeemUrl,
    messageEncoding: 'iso-8859-1',
    altText: options.demo ? 'Demo pass • Not redeemable' : `Tap (i) top right to redeem or scan QR`,
  });

  if (coupon.expires_at) {
    pass.setExpirationDate(new Date(coupon.expires_at));
  }

  return pass.getAsBuffer();
}
