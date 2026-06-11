/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/vulcano",
        destination: "/app/vulcano",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // .well-known de OAuth (RFC 9728 / RFC 8414). Next ignora directorios que
    // empiezan con punto, así que servimos la metadata desde /api/mcp/oauth/* y
    // la exponemos en la ruta canónica .well-known vía rewrite. Incluye las
    // variantes con el path del recurso que algunos clientes MCP prueban.
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/mcp/oauth/protected-resource-metadata",
      },
      {
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/api/mcp/oauth/protected-resource-metadata",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/mcp/oauth/authorization-server-metadata",
      },
      {
        source: "/.well-known/oauth-authorization-server/api/mcp",
        destination: "/api/mcp/oauth/authorization-server-metadata",
      },
    ];
  },
}

export default nextConfig
