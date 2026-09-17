import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { icons } from "@/lib/heychamba-assets";

export function HeyNav({ onLanding = false }: { onLanding?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 py-3 md:px-8">
        <Button aria-label="Abrir menú" onClick={() => setOpen(true)} className="hc-square justify-self-start bg-lime text-ink shadow-hard hover:bg-lime/90"><Menu /></Button>
        <Link to="/" className="font-display text-2xl font-black text-lime [text-shadow:2px_2px_0_var(--ink)]">HeyChamba</Link>
        {onLanding ? <a href="#registro" className="hc-pill justify-self-end bg-lime text-sm text-ink shadow-hard">Entrar</a> : <Link to="/" className="hc-pill justify-self-end bg-lime text-sm text-ink shadow-hard">Salir</Link>}
      </header>
      {open && <div className="fixed inset-0 z-[70] overflow-auto bg-lime p-5 md:p-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between border-b-2 border-ink pb-5"><span className="font-display text-2xl font-black">HeyChamba</span><Button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="hc-square bg-ink text-lime"><X /></Button></div>
          <nav className="my-10 flex flex-col font-display text-[clamp(3rem,10vw,7rem)] font-black leading-[.9]">
            <Link to="/" onClick={() => setOpen(false)}>Inicio</Link>
            <Link to="/registro" search={{ folio: "", k: "", nombre: "", telefono: "", email: "" }} onClick={() => setOpen(false)} className="text-transparent [-webkit-text-stroke:2px_var(--ink)]">Registro</Link>
          </nav>
          <div className="flex gap-4 border-t-2 border-ink pt-6">
            {[icons.lightning, icons.pacman, icons.rock].map((src) => <img key={src} src={src} alt="" className="h-16 w-16 object-contain" />)}
          </div>
        </div>
      </div>}
    </>
  );
}