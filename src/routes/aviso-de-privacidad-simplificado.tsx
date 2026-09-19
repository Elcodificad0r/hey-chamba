import { createFileRoute } from "@tanstack/react-router";
import { PaginaLegal } from "@/components/PaginaLegal";
import { meta } from "@/lib/seo";
import markdown from "@/content/legal/aviso-privacidad-simplificado.md?raw";

export const Route = createFileRoute("/aviso-de-privacidad-simplificado")({
  head: () => meta({
    titulo: "Aviso de Privacidad Simplificado — HeyChamba",
    descripcion: "Versión corta del Aviso de Privacidad de Hey Chamba: identidad del responsable, datos que tratamos y finalidades.",
    ruta: "/aviso-de-privacidad-simplificado",
    /* Son páginas legales: no las queremos en resultados de búsqueda,
       pero sí que Google siga los enlaces que contienen. */
    noindexSeguir: true,
  }),
  component: () => <PaginaLegal markdown={markdown} />,
});
