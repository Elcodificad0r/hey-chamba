/* ─────────────────────────────────────────────────────────────
   CASILLA DE CONSENTIMIENTO
   Usa un <input type="checkbox"> real, escondido pero presente: así
   funciona con teclado (Espacio), con lectores de pantalla y con el
   autocompletado del navegador sin que tengamos que reimplementarlo.
   Lo que se ve es el cuadrito dibujado al lado.

   El detalle que rompe este patrón en todos lados: al tocar un enlace
   dentro del texto, el <label> alterna la casilla. Por eso los enlaces
   van en <EnlaceLegal>, que corta la propagación del clic.
   ───────────────────────────────────────────────────────────── */
import { type ReactNode } from "react";
import { Check } from "lucide-react";

export function EnlaceLegal({ href, children }: { href: string; children: ReactNode }) {
  return <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    /* Sin esto, leer el aviso marcaría o desmarcaría la casilla. */
    onClick={event => event.stopPropagation()}
    className="casilla-enlace"
  >{children}</a>;
}

export function CasillaLegal({ id, checked, onChange, error, children }: {
  id: string;
  checked: boolean;
  onChange: (valor: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  const idError = `${id}-error`;
  return <div className="casilla-campo">
    <div className={`casilla ${error ? "is-error" : ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? idError : undefined}
        className="casilla-input"
      />
      <label htmlFor={id} className="casilla-caja" aria-hidden="true"><Check/></label>
      <label htmlFor={id} className="casilla-texto">{children}</label>
    </div>
    {error && <span id={idError} role="alert" className="casilla-error">{error}</span>}
  </div>;
}
