import { withSentryConfig } from "@sentry/nextjs";

// Bundle analyzer (only enabled when ANALYZE=true)
// Use dynamic import to avoid ES module issues
let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === 'true') {
  const bundleAnalyzer = require('@next/bundle-analyzer');
  withBundleAnalyzer = bundleAnalyzer.default({
    enabled: true,
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow 127.0.0.1 in dev mode (Playwright E2E tests connect via this origin)
  allowedDevOrigins: ['http://127.0.0.1:3000', '127.0.0.1'],

  // Note: ESLint config moved to eslint.config.mjs (Next.js 16+)
  // To ignore during builds, use: ESLINT_NO_DEV_ERRORS=true or run lint separately
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Fix turbopack root detection with multiple lockfiles
  turbopack: {
    root: process.cwd(),
  },

  // Compression for better performance
  compress: true,


  // Optimize for production
  productionBrowserSourceMaps: false,

  // Add headers for better caching and security.
  // NOTE: Content-Security-Policy is set per-request in middleware.ts so we can
  // use a fresh nonce for script-src in production. Do NOT duplicate CSP
  // here — a static CSP would collide with the nonce CSP.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          // HSTS - enforce HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          },
        ],
      },
      {
        // Cache hashed Next.js static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache all static media files (path-to-regexp with regex parameter)
        source: '/:path*.:ext(svg|jpg|jpeg|png|webp|avif|woff|woff2|ttf|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Redirects for old routes (do NOT redirect /sitemap.xml — Next.js serves it from app/sitemap.ts)
  async redirects() {
    return [
      {
        source: '/learn/glossary',
        destination: '/education/glossary',
        permanent: true,
      },
      {
        source: '/learn',
        destination: '/education',
        permanent: true,
      },
      {
        source: '/situation',
        destination: '/warnings',
        permanent: true,
      },
      {
        source: '/extremes',
        destination: '/education',
        permanent: true,
      },
    ]
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: false, // CSS optimization disabled - not helping performance
    scrollRestoration: true,
    // Tree-shake heavy icon/chart/map barrel imports into per-symbol chunks.
    optimizePackageImports: ['lucide-react', 'recharts', 'ol'],
  },

  // PERFORMANCE: Enable compiler optimizations
  compiler: {
    // Remove console logs in production (except errors)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // PERFORMANCE: Code splitting for large dependencies
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate OpenLayers into its own chunk (~400KB)
          openlayers: {
            test: /[\\/]node_modules[\\/](ol)[\\/]/,
            name: 'openlayers',
            chunks: 'all',
            priority: 30,
          },
          maplibre: {
            test: /[\\/]node_modules[\\/](maplibre-gl)[\\/]/,
            name: 'maplibre',
            chunks: 'all',
            priority: 28,
          },
          recharts: {
            test: /[\\/]node_modules[\\/](recharts)[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 25,
          },
          // Separate Sentry into its own chunk (~200KB)
          sentry: {
            test: /[\\/]node_modules[\\/](@sentry)[\\/]/,
            name: 'sentry',
            chunks: 'all',
            priority: 20,
          },
        },
      }
    }
    return config
  },
}

export default withBundleAnalyzer(withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG || "justin-elrod",
  project: process.env.SENTRY_PROJECT || "16bit-weather-web",

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Webpack-specific build options (sentry-cli/webpack plugin). In
  // @sentry/nextjs v10 the top-level `disableLogger` and `automaticVercelMonitors`
  // options were deprecated in favor of these nested `webpack.*` equivalents.
  webpack: {
    // Tree-shake Sentry SDK logger statements to reduce bundle size
    // (replaces the deprecated top-level `disableLogger: true`).
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatic instrumentation of Vercel Cron Monitors
    // (replaces the deprecated top-level `automaticVercelMonitors: true`).
    // https://docs.sentry.io/product/crons/
    automaticVercelMonitors: true,
  },
}));
