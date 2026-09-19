/* ─────────────────────────────────────────────────────────────
   SEO
   Un solo lugar para los metadatos. Cada ruta llama a `meta()` con lo
   suyo y de aquí salen las etiquetas completas: las de Google, las de
   Open Graph (WhatsApp, Facebook, LinkedIn) y las de X.
   ───────────────────────────────────────────────────────────── */

export const SITIO = "https://www.heychamba.com";
export const NOMBRE = "HeyChamba";
const IMAGEN = `${SITIO}/og-image.png`;

type Opciones = {
  titulo: string;
  descripcion: string;
  /* Ruta con diagonal inicial, ej. "/registro". La canónica evita que
     Google trate /registro?folio=X como páginas distintas. */
  ruta: string;
  /* Las pantallas privadas (pase, confirmación, asistencia) no se indexan. */
  privada?: boolean;
  /* Las páginas legales tampoco se indexan, pero sí queremos que Google
     siga los enlaces que llevan de vuelta al sitio. */
  noindexSeguir?: boolean;
};

export function meta({ titulo, descripcion, ruta, privada = false, noindexSeguir = false }: Opciones) {
  const url = `${SITIO}${ruta}`;
  return {
    meta: [
      { title: titulo },
      { name: "description", content: descripcion },
      ...(privada
        ? [{ name: "robots", content: "noindex, nofollow" }]
        : noindexSeguir
          ? [{ name: "robots", content: "noindex, follow" }]
          : [{ name: "robots", content: "index, follow, max-image-preview:large" }]),

      /* Open Graph: WhatsApp, Facebook, LinkedIn, Slack */
      { property: "og:site_name", content: NOMBRE },
      { property: "og:locale", content: "es_MX" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descripcion },
      { property: "og:image", content: IMAGEN },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "HeyChamba · Chamba de temporada, cerca de tu casa." },

      /* X / Twitter */
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: titulo },
      { name: "twitter:description", content: descripcion },
      { name: "twitter:image", content: IMAGEN },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/* Datos estructurados: es lo que le permite a Google entender que somos
   una organización mexicana y que el festival es un evento con fecha. */
export function datosEstructurados() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITIO}/#organizacion`,
        name: NOMBRE,
        url: SITIO,
        logo: `${SITIO}/icon-512.png`,
        image: IMAGEN,
        email: "contacto@heychamba.com",
        description: "HeyChamba conecta a personas que buscan trabajo de temporada con tiendas de retail que contratan para Buen Fin, Hot Sale y Navidad.",
        areaServed: { "@type": "City", name: "Ciudad de México" },
        sameAs: [
          "https://www.instagram.com/heychamba/",
          "https://www.tiktok.com/@heychamba",
          "https://www.facebook.com/profile.php?id=61593944916264",
          "https://www.linkedin.com/company/heychamba/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITIO}/#sitio`,
        url: SITIO,
        name: NOMBRE,
        inLanguage: "es-MX",
        publisher: { "@id": `${SITIO}/#organizacion` },
      },
    ],
  };
}
