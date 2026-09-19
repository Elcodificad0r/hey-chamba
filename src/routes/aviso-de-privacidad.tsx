import { createFileRoute } from "@tanstack/react-router";
import { PaginaLegal } from "@/components/PaginaLegal";
import { meta } from "@/lib/seo";
import markdown from "@/content/legal/aviso-privacidad-integral.md?raw";

export const Route = createFileRoute("/aviso-de-privacidad")({
  head: () => meta({
    titulo: "Aviso de Privacidad — HeyChamba",
    descripcion: "Aviso de Privacidad Integral de Hey Chamba: qué datos tratamos, para qué, a quién los transferimos y cómo ejercer tus derechos ARCO.",
    ruta: "/aviso-de-privacidad",
    /* Son páginas legales: no las queremos en resultados de búsqueda,
       pero sí que Google siga los enlaces que contienen. */
    noindexSeguir: true,
  }),
  component: () => <PaginaLegal markdown={markdown} />,
});
