import { icons } from "@/lib/heychamba-assets";
import { Link } from "@tanstack/react-router";

/* Mismo menú de la landing, para que el formulario abra idéntico. */
export function HeyChambaMenu({ onClose, onNavigate }: { onClose: () => void; onNavigate?: (hash: string) => void }) {
  const item = (num: string, label: string, href: string, outline?: boolean) => (
    <Link to="/" hash={href.slice(2)} onClick={(event) => { if (onNavigate) { event.preventDefault(); onNavigate(href.slice(2)); } else onClose(); }} className="hc-menu-link flex items-baseline gap-[clamp(10px,2vw,20px)] no-underline [padding:2px_0]">
      <span className="[flex:0_0_auto] [font-weight:700] [font-size:13px] [color:#1E1E1E] [transform:translateY(-0.9em)]">{num}</span>
      <span className={`font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] ${outline ? "[color:transparent] [-webkit-text-stroke:2px_#1E1E1E]" : "[color:#1E1E1E]"}`}>{label}</span>
    </Link>
  );

  return (
    <div className="fixed inset-0 [z-index:60] [background:#C4E539] overflow-y-auto [padding:16px_clamp(20px,5vw,72px)_40px]">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(30,30,30,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,30,30,0.10)_1px,transparent_1px)] [background-size:25%_120px]" />
      <div className="relative [max-width:1180px] [margin:0_auto]">
        <div className="flex items-center justify-between gap-[16px] [padding:12px_0_16px]">
          <span className="font-title [font-weight:900] [font-size:23px] [letter-spacing:-0.02em] [color:#1E1E1E]">HeyChamba</span>
          <button type="button" aria-label="Cerrar menú" onClick={onClose} className="[width:52px] [height:44px] flex items-center justify-center [background:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:14px] [box-shadow:4px_4px_0_#005742] cursor-pointer [padding:0] font-title [font-weight:900] [font-size:22px] [line-height:1] [color:#C4E539]">×</button>
        </div>
        <div className="flex justify-between items-baseline gap-[16px] [border-bottom:2px_solid_#1E1E1E] [padding-bottom:12px] [margin-bottom:24px]">
          <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">[00] A dónde quieres ir</span>
          <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">15 de octubre</span>
        </div>
        <div className="flex flex-col">
          {item("[01]", "Registro", "/#registro")}
          {item("[02]", "Pláticas", "/#festival", true)}
          {item("[03]", "Marcas", "/#marcas")}
          {item("[04]", "Preguntas", "/#faq", true)}
        </div>
        <div className="flex flex-wrap items-center gap-[16px] [margin-top:28px] [border-top:2px_solid_#1E1E1E] [padding-top:24px]">
          <Link to="/" hash="registro" onClick={(event) => { if (onNavigate) { event.preventDefault(); onNavigate("registro"); } else onClose(); }} className="hc-menu-cta inline-flex items-center justify-center [min-height:56px] [padding:0_34px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] no-underline [box-shadow:5px_5px_0_#AF1C7B]">Quiero mi lugar</Link>
          {[icons.lightning, icons.pacman, icons.rock].map((src) => (
            <img key={src} src={src} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(52px,6vw,80px)] [height:clamp(52px,6vw,80px)] object-contain" />
          ))}
        </div>
      </div>
    </div>
  );
}
