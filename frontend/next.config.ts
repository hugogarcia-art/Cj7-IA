import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exportación estática: `next build` escribe HTML plano en `out/`, que el
  // backend NestJS sirve como archivos estáticos. Así la aplicación y la API
  // viven en un unico servicio (y en el mismo origen, sin CORS).
  //
  // Es viable porque todas las páginas son "use client" y piden los datos
  // desde el navegador: no hay renderizado en servidor que perder.
  output: "export",

  // Genera out/login/index.html en vez de out/login.html. Sin esto, Next crea
  // un directorio "login/" (con sus payloads) junto a "login.html", y cualquier
  // servidor de estaticos entra al directorio, no encuentra index.html y falla.
  trailingSlash: true,

  images: {
    // El optimizador de imágenes necesita un servidor Next en marcha, que aquí
    // no existe. Las fotos de Supabase se sirven tal cual.
    unoptimized: true,
  },

  // Las cabeceras de seguridad las pone helmet en el backend: con `output:
  // "export"` no hay servidor Next que pueda añadirlas.
};

export default nextConfig;
