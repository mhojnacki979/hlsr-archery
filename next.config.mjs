/** @type {import('next').NextConfig} */

// Served from the root of its own domain (hlsr.eyesonscore.com), so no base
// path. Set BASE_PATH='/hlsr-archery' to build for the github.io project URL.
const basePath = process.env.BASE_PATH ?? ''

const nextConfig = {
  // Static HTML export — no Node server needed. Output lands in ./out
  output: 'export',
  // Folder-style URLs (/index.html) for clean static hosting.
  trailingSlash: true,
  // The export has no image optimizer; serve images as-is.
  images: { unoptimized: true },
  ...(basePath !== '' ? { basePath, assetPrefix: basePath } : {}),
  // Exposed so plain <img> srcs can be basePath-prefixed (next/image does not
  // do this under output:'export' + unoptimized).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

export default nextConfig
