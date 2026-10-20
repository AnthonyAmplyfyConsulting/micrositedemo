import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Strict Content Security Policy
// Allows inline scripts/styles as required by Next.js / Three.js, blocks object/frame embeddings,
// restricts connect/img/font sources to self and trusted domains.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://services.leadconnectorhq.com;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://services.leadconnectorhq.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Prevent Next.js signature disclosure
  poweredByHeader: false,
  // Development origins
  allowedDevOrigins: ["192.168.68.163", "192.168.68.163:3000", "localhost:3000"],
  async redirects() {
    return [
      {
        source: "/play/amplyfy",
        destination: "/",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
