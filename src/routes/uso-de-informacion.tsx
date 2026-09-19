import { createFileRoute } from "@tanstack/react-router";
import { PaginaLegal } from "@/components/PaginaLegal";
import { meta } from "@/lib/seo";
import markdown from "@/content/legal/uso-de-informacion-y-cookies.md?raw";

export const Route = createFileRoute("/uso-de-informacion")({
  head: () => meta({
    titulo: "Uso de Información y Cookies — HeyChamba",
    descripcion: "Cómo usa Hey Chamba las cookies y tecnologías de rastreo, qué categorías existen y cómo administrar tu consentimiento.",
    ruta: "/uso-de-informacion",
    /* Son páginas legales: no las queremos en resultados de búsqueda,
       pero sí que Google siga los enlaces que contienen. */
    noindexSeguir: true,
  }),
  component: () => <PaginaLegal markdown={markdown} />,
});
