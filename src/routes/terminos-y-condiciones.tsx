import { createFileRoute } from "@tanstack/react-router";
import { PaginaLegal } from "@/components/PaginaLegal";
import { meta } from "@/lib/seo";
import markdown from "@/content/legal/terminos-y-condiciones.md?raw";

export const Route = createFileRoute("/terminos-y-condiciones")({
  head: () => meta({
    titulo: "Términos y Condiciones — HeyChamba",
    descripcion: "Términos y Condiciones de uso de la plataforma Hey Chamba: objeto del servicio, requisitos, el pase del festival y responsabilidades.",
    ruta: "/terminos-y-condiciones",
    /* Son páginas legales: no las queremos en resultados de búsqueda,
       pero sí que Google siga los enlaces que contienen. */
    noindexSeguir: true,
  }),
  component: () => <PaginaLegal markdown={markdown} />,
});
