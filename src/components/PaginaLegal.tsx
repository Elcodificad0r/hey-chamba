/* ─────────────────────────────────────────────────────────────
   PÁGINA LEGAL
   Las cuatro páginas de lectura (avisos, términos, cookies) comparten
   esta plantilla. Son páginas para leer, no para convertir: fondo
   blanco con la retícula del sitio, una sola columna y nada más.

   El markdown se convierte a HTML con `marked`. El contenido viene de
   archivos del propio repo (src/content/legal/*.md), no de nadie de
   fuera, así que insertarlo como HTML es seguro aquí.
   ───────────────────────────────────────────────────────────── */
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { marked } from "marked";
import { ArrowLeft } from "lucide-react";

marked.setOptions({ gfm: true, breaks: false });

/* `marked` no le pone id a los encabezados, y sin eso los enlaces con ancla
   (#5-como-otorgar...) no llevan a ningún lado. Se los ponemos sobre el HTML
   ya generado: es más simple que pelearse con el renderer de la librería. */
function conAnclas(html: string): string {
  return html.replace(/<(h[23])>(.*?)<\/\1>/g, (_, etiqueta, contenido) => {
    const slug = contenido
      .replace(/<[^>]*>/g, "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `<${etiqueta} id="${slug}">${contenido}</${etiqueta}>`;
  });
}

/* Los cuatro documentos legales. El menú deja saltar entre ellos sin
   tener que volver al inicio y buscarlos otra vez en el pie de página. */
const DOCUMENTOS = [
  { ruta: "/aviso-de-privacidad", nombre: "Aviso de Privacidad" },
  { ruta: "/aviso-de-privacidad-simplificado", nombre: "Aviso Simplificado" },
  { ruta: "/uso-de-informacion", nombre: "Uso de Información" },
  { ruta: "/terminos-y-condiciones", nombre: "Términos y Condiciones" },
] as const;

export function PaginaLegal({ markdown }: { markdown: string }) {
  const html = conAnclas(marked.parse(markdown) as string);
  const menu = useRef<HTMLElement>(null);

  /* En celular el menú es una fila que se desliza, y el documento abierto
     puede quedar fuera de vista. Lo traemos al centro al entrar. */
  useEffect(() => {
    const actual = menu.current?.querySelector('[aria-current="page"]');
    actual?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return <main className="legal">
    <div className="survey-grid" aria-hidden="true" />
    <div className="legal-marco">
      <header className="legal-header">
        <Link to="/" className="legal-logo">HeyChamba</Link>
      </header>

      <div className="legal-layout">
        <nav ref={menu} className="legal-menu" aria-label="Documentos legales">
          <span className="legal-menu-titulo">Legal</span>
          {DOCUMENTOS.map(({ ruta, nombre }) => (
            <Link key={ruta} to={ruta} className="legal-menu-item"
              activeProps={{ className: "legal-menu-item is-actual", "aria-current": "page" }}>
              {nombre}
            </Link>
          ))}
        </nav>

        <article className="legal-cuerpo" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div className="legal-pie">
        <Link to="/" className="legal-boton"><ArrowLeft/> Volver al inicio</Link>
        <p>
          Hey Chamba es un nombre comercial registrado.<br/>
          Col. Juárez, Alcaldía Cuauhtémoc, CDMX, C.P. 06600.<br/>
          Contacto en materia de datos personales:{" "}
          <a href="mailto:misdatos@heychamba.com">misdatos@heychamba.com</a>
        </p>
      </div>
    </div>
  </main>;
}
