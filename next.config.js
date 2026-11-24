// next.config.js
const nextConfig = {
  // Permite medir o build de produção sem sobrescrever o servidor de dev.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  devIndicators: false,
  // O pdfjs carrega pdf.worker.mjs relativo ao próprio pacote no Node.
  // Se o Next empacotar o módulo, o worker é procurado em .next/chunks e falha.
  serverExternalPackages: ['pdfjs-dist'],
  turbopack: {
    root: __dirname,
  },
  experimental: {
    proxyClientMaxBodySize: '70mb',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "media-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
module.exports = nextConfig
