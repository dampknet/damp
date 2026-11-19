import type { NextConfig } from "next";

// Browser security headers for every page and API response.
// (Add Strict-Transport-Security here once the site is served over HTTPS.)
const securityHeaders = [
  { key: "X-Frame-Options",         value: "DENY" },                                   // no embedding in other sites (clickjacking)
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",      value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" }, // camera: barcode scanner
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
