import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos de producto viven en Supabase Storage. Sin declarar el host,
    // next/image lanza "hostname is not configured" en producción.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Cabeceras básicas: el resto de seguridad la aplica helmet en el backend.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
