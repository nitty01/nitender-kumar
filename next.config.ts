import type { NextConfig } from "next";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://embed.diagrams.net https://www.google-analytics.com https://www.googletagmanager.com",
  "media-src 'self' https://res.cloudinary.com",
  "frame-src 'self' https://viewer.diagrams.net https://embed.diagrams.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.google-analytics.com https://*.clarity.ms https://res.cloudinary.com https://cdn.jsdelivr.net https://embed.diagrams.net https://viewer.diagrams.net",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/public/about.html", destination: "/about", permanent: true },
      { source: "/public/contact.html", destination: "/contact", permanent: true },
      { source: "/public/tech-playground.html", destination: "/tech-playground", permanent: true },
      {
        source: "/public/project-:slug.html",
        destination: "/projects/:slug",
        permanent: true,
      },
      { source: "/admin/posts", destination: "/admin/blog", permanent: false },
      { source: "/admin/posts/new", destination: "/admin/blog/new", permanent: false },
      { source: "/admin/posts/:id", destination: "/admin/blog/:id", permanent: false },
    ];
  },
};

export default nextConfig;
