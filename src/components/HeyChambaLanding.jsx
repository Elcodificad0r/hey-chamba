import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* El portal de la cuenta. Mientras esté vacío, el botón de "mi cuenta" no
   se pinta en el encabezado: es preferible que no exista a que mande a un
   sitio que todavía no levanta. Se prende poniendo aquí la dirección. */
const PORTAL = '';
import { CasillaLegal, EnlaceLegal } from '@/components/CasillaLegal';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { icons, photos } from '@/lib/heychamba-assets';
import { preloadVoxelGlobe } from '@/lib/globe-loader';
import { guardarFase1 } from "@/lib/registros.functions";

/* Landing HeyChamba — React + Tailwind.
   Los valores vienen tal cual del diseño: utilidades de Tailwind donde existe
   equivalente exacto y propiedades arbitrarias ([prop:valor]) para el resto,
   así nada cambia de tamaño, color ni sombra. El corte móvil es max-[820px]. */

export default function Landing({ showGrid = true, showFotos = true, showFormulario = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  /* El FAQ arranca con la primera abierta y el resto cerradas: así se ve
     de un vistazo cuántas preguntas hay, y de paso queda claro que se abren. */
  const [abiertas, setAbiertas] = useState([1]);
  const [bloque, setBloque] = useState(1);
  const ancla = useRef(null);
  const root = useRef(null);

  const toggleMenu = () => setMenuOpen(v => !v);
  const closeMenu = () => setMenuOpen(false);
  const noSubmit = e => e.preventDefault();

  /* El formulario de marcas todavía no manda la información a ningún lado,
     pero la casilla obligatoria ya bloquea el envío: sin aceptar, no pasa. */
  const submitMarca = e => {
    e.preventDefault();
    if (!marca.aviso) {
      setErrorMarca('Necesitamos que aceptes el Aviso de Privacidad para continuar.');
      const casilla = e.target.querySelector('#hc-m-acepto');
      casilla?.closest('.casilla-campo')?.scrollIntoView({ block: 'center' });
      casilla?.focus();
      return;
    }
    setErrorMarca('');
  };
  const [errorNombre, setErrorNombre] = useState('');
  /* Consentimiento del candidato. Ninguna arranca marcada: el artículo 7
     de la LFPDPPP pide una acción afirmativa de la persona. */
  const [cand, setCand] = useState({ aviso: false, edad: false, comunicaciones: false });
  const [errorCand, setErrorCand] = useState({ aviso: '', edad: '' });
  /* Consentimiento de la marca. */
  const [marca, setMarca] = useState({ aviso: false, comunicaciones: false });
  const [errorMarca, setErrorMarca] = useState('');

  /* El globo del formulario se precarga aquí, en tiempo muerto. */
  useEffect(() => { preloadVoxelGlobe(); }, []);

  /* Necesitamos nombre y apellido: con el puro nombre de pila no podemos
     cotejar a nadie contra su identificación en la puerta del festival. */
  const nombreCompleto = valor => valor.trim().split(/\s+/).filter(parte => parte.length >= 2).length >= 2;

  const submitRegistro = async e => {
    e.preventDefault();
    const d = {};
    new FormData(e.target).forEach((v, k) => { d[k] = v; });
    d.enviado = new Date().toISOString();

    if (!nombreCompleto(d.nombre || '')) {
      setErrorNombre('Escribe tu nombre y tu apellido, separados por un espacio.');
      e.target.querySelector('#hc-nombre')?.focus();
      return;
    }
    setErrorNombre('');

    /* Sin las casillas obligatorias no sale nada: el consentimiento tiene
       que existir antes de que el dato salga del navegador. */
    const faltan = { aviso: cand.aviso ? '' : 'Necesitamos que aceptes el Aviso de Privacidad para continuar.',
                     edad: cand.edad ? '' : 'Solo podemos registrar a personas mayores de 18 años.' };
    setErrorCand(faltan);
    if (faltan.aviso || faltan.edad) {
      const primera = e.target.querySelector(faltan.aviso ? '#hc-acepto-aviso' : '#hc-soy-mayor');
      primera?.closest('.casilla-campo')?.scrollIntoView({ block: 'center' });
      primera?.focus();
      return;
    }
    /* Queda en el registro qué aceptó exactamente. */
    d.acepto_aviso = 'true';
    d.soy_mayor_de_edad = 'true';
    d.acepto_comunicaciones = String(cand.comunicaciones);

    /* Fase 1: guardamos nombre, telefono y correo en la base y nos traemos el folio interno. */
    let folio = '';
    try {
      const res = await guardarFase1({ data: { nombre: d.nombre || '', telefono: d.telefono || '', email: d.email || '' } });
      folio = res?.folio || '';
      d.folio = folio;
      /* La clave viaja con la persona: es lo que la deja retomar su registro
         desde el enlace del correo sin que baste con adivinar un folio. */
      if (res?.claveSesion) d.k = res.claveSesion;
    } catch (err) {}

    try {
      const previos = JSON.parse(localStorage.getItem('heychamba:registros') || '[]');
      previos.push(d);
      localStorage.setItem('heychamba:registros', JSON.stringify(previos));
      localStorage.setItem('heychamba:registro', JSON.stringify(d));
    } catch (err) {}

    /* Con esos datos ya nos pasamos al formulario y seguimos donde nos quedamos. */
    const q = new URLSearchParams();
    Object.keys(d).forEach(k => q.set(k, d[k]));
    window.location.href = '/registro?' + q.toString();
  };

  const toggle = n => setAbiertas(a => (a.includes(n) ? a.filter(x => x !== n) : a.concat(n)));
  const abierta = n => abiertas.includes(n);
  const ind = n => (abierta(n) ? '−' : '+');

  const b1open = bloque === 1;
  const b1ind = b1open ? '−' : '+';
  const tb1 = () => setBloque(b => (b === 1 ? null : 1));

  /* El navegador salta al #ancla antes de que React monte: se reintenta. */
  useEffect(() => {
    const irAlAncla = () => {
      const id = (window.location.hash || '').replace('#', '');
      if (!id) return;
      clearInterval(ancla.current);
      let intentos = 0;
      const salta = () => {
        intentos++;
        const el = document.getElementById(id);
        if (el) {
          const cont = document.scrollingElement || document.documentElement;
          cont.scrollTop = el.getBoundingClientRect().top + cont.scrollTop - 8;
        }
        if (el || intentos > 24) clearInterval(ancla.current);
      };
      ancla.current = setInterval(salta, 120);
      salta();
    };
    irAlAncla();
    window.addEventListener('hashchange', irAlAncla);
    return () => { window.removeEventListener('hashchange', irAlAncla); clearInterval(ancla.current); };
  }, []);

  const open1 = abierta(1), open2 = abierta(2), open3 = abierta(3), open4 = abierta(4), open5 = abierta(5), open6 = abierta(6);
  const ind1 = ind(1), ind2 = ind(2), ind3 = ind(3), ind4 = ind(4), ind5 = ind(5), ind6 = ind(6);
  const t1 = () => toggle(1), t2 = () => toggle(2), t3 = () => toggle(3), t4 = () => toggle(4), t5 = () => toggle(5), t6 = () => toggle(6);

  useLayoutEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const desktop = window.matchMedia('(min-width: 821px)').matches;
    const ctx = gsap.context(() => {
      gsap.from('[data-hc-hero] > *', { y: desktop ? 34 : 12, duration: desktop ? .8 : .38, stagger: desktop ? .07 : .035, ease: 'power3.out' });
      gsap.utils.toArray('section:not(:first-of-type)').forEach(section => {
        const content = section.querySelector(':scope > div');
        if (content) gsap.from(content, { y: desktop ? 42 : 14, duration: desktop ? .75 : .35, scrollTrigger: { trigger: section, start: 'top 90%', once: true }, ease: 'power3.out' });
      });
      gsap.utils.toArray('.hc-float').forEach((el, i) => gsap.to(el, { y: desktop ? (i % 2 ? 13 : -13) : (i % 2 ? 4 : -4), rotation: desktop ? (i % 2 ? 7 : -7) : 2, duration: desktop ? 2.8 + i % 3 : 4.5, repeat: -1, yoyo: true, ease: 'sine.inOut' }));
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <>
      <div ref={root} className="[background:#F3F0E9]">
      
        <header className="sticky [top:0] [z-index:50] [background:transparent] grid [grid-template-columns:1fr_auto_1fr] items-center gap-[12px] [padding:12px_16px] max-[400px]:gap-[8px] max-[400px]:[padding:10px_10px]">
          <button type="button" aria-label="Menú" onClick={toggleMenu} className="[justify-self:start] [width:52px] [height:44px] flex flex-col items-center justify-center gap-[5px] [background:#C4E539] [border:2px_solid_#1E1E1E] [border-radius:14px] [box-shadow:4px_4px_0_#1E1E1E] cursor-pointer [padding:0]">
            <span className="block [width:22px] [height:3px] [background:#1E1E1E] [border-radius:2px]"></span>
            <span className="block [width:22px] [height:3px] [background:#1E1E1E] [border-radius:2px]"></span>
            <span className="block [width:22px] [height:3px] [background:#1E1E1E] [border-radius:2px]"></span>
          </button>
          <span className="[justify-self:center] font-title [font-weight:900] [font-size:23px] max-[400px]:[font-size:19px] [letter-spacing:-0.02em] [color:#C4E539] [text-shadow:2px_2px_0_#1E1E1E] whitespace-nowrap">HeyChamba</span>
          <div className="[justify-self:end] flex items-center gap-[8px] max-[400px]:gap-[6px]">
            <a href="#registro" className="inline-flex items-center justify-center [height:44px] max-[400px]:[height:40px] [padding:0_18px] max-[400px]:[padding:0_12px] [background:#C4E539] [border:2px_solid_#1E1E1E] [border-radius:14px] [box-shadow:4px_4px_0_#1E1E1E] [font-weight:700] [font-size:14px] [color:#1E1E1E] no-underline whitespace-nowrap">Entrar</a>
            {PORTAL && <a href={PORTAL} target="_blank" rel="noreferrer" aria-label="Entrar a mi cuenta" title="Entrar a mi cuenta" className="inline-flex items-center justify-center [width:44px] [height:44px] max-[400px]:[width:40px] max-[400px]:[height:40px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:14px] [box-shadow:4px_4px_0_#1E1E1E] [color:#1E1E1E] no-underline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="[width:21px] [height:21px]" aria-hidden="true">
                <circle cx="12" cy="8" r="3.6"/>
                <path d="M4.8 20.2a7.6 7.6 0 0 1 14.4 0"/>
              </svg>
            </a>}
          </div>
        </header>
        {menuOpen && (<>
          <div className="fixed inset-0 [z-index:60] [background:#C4E539] overflow-y-auto [padding:16px_clamp(20px,5vw,72px)_40px]">
            {showGrid && (<>
              <div aria-hidden="true" className="hc-float absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(30,30,30,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,30,30,0.10)_1px,transparent_1px)] [background-size:25%_120px]"></div>
            </>)}
            <div className="relative [max-width:1180px] [margin:0_auto]">
              <div className="flex items-center justify-between gap-[16px] [padding:12px_0_16px]">
                <span className="font-title [font-weight:900] [font-size:23px] [letter-spacing:-0.02em] [color:#1E1E1E]">HeyChamba</span>
                <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="[width:52px] [height:44px] flex items-center justify-center [background:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:14px] [box-shadow:4px_4px_0_#005742] cursor-pointer [padding:0] font-title [font-weight:900] [font-size:22px] [line-height:1] [color:#C4E539]">×</button>
              </div>
              <div className="flex justify-between items-baseline gap-[16px] [border-bottom:2px_solid_#1E1E1E] [padding-bottom:12px] [margin-bottom:24px]">
                <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">[00] A dónde quieres ir</span>
                <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">15 de octubre</span>
              </div>
              <div className="flex flex-col">
              <a href="#registro" onClick={closeMenu} className="flex items-baseline gap-[clamp(10px,2vw,20px)] no-underline [padding:2px_0]">
                <span className="[flex:0_0_auto] [font-weight:700] [font-size:13px] [color:#1E1E1E] [transform:translateY(-0.9em)]">[01]</span>
                <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:#1E1E1E]">Registro</span>
              </a>
              <a href="#festival" onClick={closeMenu} className="flex items-baseline gap-[clamp(10px,2vw,20px)] no-underline [padding:2px_0]">
                <span className="[flex:0_0_auto] [font-weight:700] [font-size:13px] [color:#1E1E1E] [transform:translateY(-0.9em)]">[02]</span>
                <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:transparent] [-webkit-text-stroke:2px_#1E1E1E]">Pláticas</span>
              </a>
              <a href="#marcas" onClick={closeMenu} className="flex items-baseline gap-[clamp(10px,2vw,20px)] no-underline [padding:2px_0]">
                <span className="[flex:0_0_auto] [font-weight:700] [font-size:13px] [color:#1E1E1E] [transform:translateY(-0.9em)]">[03]</span>
                <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:#1E1E1E]">Marcas</span>
              </a>
              <a href="#faq" onClick={closeMenu} className="flex items-baseline gap-[clamp(10px,2vw,20px)] no-underline [padding:2px_0]">
                <span className="[flex:0_0_auto] [font-weight:700] [font-size:13px] [color:#1E1E1E] [transform:translateY(-0.9em)]">[04]</span>
                <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:transparent] [-webkit-text-stroke:2px_#1E1E1E]">Preguntas</span>
              </a>
              </div>
              <div className="flex flex-wrap items-center gap-[16px] [margin-top:28px] [border-top:2px_solid_#1E1E1E] [padding-top:24px]">
                <a href="#registro" onClick={closeMenu} className="inline-flex items-center justify-center [min-height:56px] [padding:0_34px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] no-underline [box-shadow:5px_5px_0_#AF1C7B]">Quiero mi lugar</a>
                {showFotos && (<>
                  <img src={icons.lightning} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(56px,7vw,88px)] [height:clamp(56px,7vw,88px)] object-contain [transform:rotate(6deg)]" />
                  <img src={icons.pacman} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(52px,6vw,80px)] [height:clamp(52px,6vw,80px)] object-contain [transform:rotate(-7deg)]" />
                  <img src={icons.rock} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(52px,6vw,80px)] [height:clamp(52px,6vw,80px)] object-contain [transform:rotate(8deg)]" />
                </>)}
              </div>
            </div>
          </div>
        </>)}
      
        <section className="relative [background:#5251F7] [margin-top:-68px] [padding:78px_clamp(32px,7vw,120px)_32px] [min-height:100vh] flex items-center overflow-hidden max-[820px]:![padding:78px_20px_44px] max-[820px]:![min-height:0]">
          {showGrid && (<>
            <div aria-hidden="true" className="hc-float absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(255,255,255,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.13)_1px,transparent_1px)] [background-size:25%_140px]"></div>
          </>)}
          <div data-hc-hero className="relative w-full [max-width:1200px] [margin:0_auto] flex flex-wrap items-center justify-center gap-y-[32px] gap-x-[24px]">
            <div className="[flex:1_1_420px] min-w-0 [max-width:720px] flex flex-col items-start text-left gap-[min(22px,2.6vh)] max-[820px]:!items-center max-[820px]:!text-center max-[820px]:!gap-[20px]">
              <div className="flex flex-wrap items-center justify-start gap-[18px] max-w-full [margin-bottom:min(-14px,-1vh)] max-[820px]:!justify-center max-[820px]:![margin-bottom:0]">
                <span className="[background:#C4E539] [color:#1E1E1E] [font-weight:700] [font-size:14px] [padding:8px_16px] [border-radius:999px] [box-shadow:3px_3px_0_#1E1E1E]">Festival virtual de empleo</span>
                {showFotos && (<>
                  <img src={icons.lightning} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(78px,10vw,130px)] [height:clamp(78px,10vw,130px)] object-contain [transform:rotate(6deg)] max-[820px]:hidden" />
                </>)}
              </div>
              <div className="relative w-full">
                {showFotos && (<>
                  <img src={icons.rock} alt="" aria-hidden="true" className="hc-float absolute [left:-10px] [top:18px] [width:66px] [height:66px] object-contain [transform:rotate(-6deg)] pointer-events-none hidden max-[820px]:block" />
                  <img src={icons.lightning} alt="" aria-hidden="true" className="hc-float absolute [right:-8px] [top:8px] [width:62px] [height:62px] object-contain [transform:rotate(6deg)] pointer-events-none hidden max-[820px]:block" />
                </>)}
                <h1 className="m-0 font-title [font-weight:900] [font-size:min(clamp(54px,11vw,112px),14vh)] [line-height:0.88] [letter-spacing:-0.03em] [color:#C4E539] [text-shadow:6px_6px_0_#1E1E1E]">Hey,<br />¿buscas<br />chamba?</h1>
              </div>
              <p className="m-0 [max-width:30ch] [color:#FFFFFF] [font-size:21px] [line-height:1.45]">Una chamba cerca de tu casa, para trabajar de temporada en tus marcas favoritas.</p>
              <div className="flex flex-wrap gap-[12px] max-w-full max-[820px]:!justify-center">
                <a href="#registro" className="inline-flex items-center justify-center [min-height:58px] [padding:0_36px] [background:#C4E539] [color:#1E1E1E] [border-radius:999px] [font-weight:700] [font-size:19px] no-underline [box-shadow:4px_4px_0_#1E1E1E]">Busco chamba</a>
                <a href="#marcas" className="inline-flex items-center justify-center [min-height:58px] [padding:0_36px] [background:transparent] [color:#FFFFFF] [border:2px_solid_#FFFFFF] [border-radius:999px] [font-weight:700] [font-size:19px] no-underline">Soy marca</a>
              </div>
              <p className="m-0 [color:rgba(255,255,255,0.85)] [font-size:17px] [font-weight:500]">Sin CV. Sin filas. Solo ganas.</p>
            </div>
            {showFotos && (<>
              <div className="relative [flex:1_1_340px] min-w-0 [max-width:520px] flex flex-col items-center gap-[16px]">
                <div className="relative w-full flex items-center justify-center">
                  {showFotos && (<>
                    <img src={icons.pacman} alt="" aria-hidden="true" className="hc-float absolute [left:0] [top:50%] [width:clamp(56px,6vw,84px)] [height:clamp(56px,6vw,84px)] object-contain [transform:translateY(-58%)_rotate(-7deg)] pointer-events-none max-[820px]:hidden" />
                  </>)}
                  <div className="min-w-0 flex flex-col items-center gap-[10px]">
                    <span className="[background:#FFFFFF] [color:#1E1E1E] [font-weight:700] [font-size:15px] [padding:12px_24px] [border-radius:999px] [box-shadow:4px_4px_0_#3535BA]">15 de octubre 2026</span>
                    <div className="max-w-full [background:#DFA0F9] [border:2px_solid_#1E1E1E] [border-radius:999px] [box-shadow:5px_5px_0_#AF1C7B] [padding:12px_22px] flex flex-wrap items-center justify-center gap-y-[6px] gap-x-[14px]">
                      <span className="font-title [font-weight:900] [font-size:20px] [line-height:1.1] [color:#1E1E1E]">Pláticas gratis</span>
                      <span className="[font-weight:700] [font-size:15px] [color:#1E1E1E]">Lineup en camino</span>
                    </div>
                  </div>
                  {showFotos && (<>
                    <img src={icons.pacman} alt="" aria-hidden="true" className="hc-float absolute [left:-6px] [top:-30px] [width:62px] [height:62px] object-contain [transform:rotate(-7deg)] pointer-events-none hidden max-[820px]:block" />
                    <img src={icons.rock} alt="" aria-hidden="true" className="hc-float absolute [right:0] [top:50%] [width:clamp(56px,6vw,84px)] [height:clamp(56px,6vw,84px)] object-contain [transform:translateY(-58%)_rotate(8deg)] pointer-events-none max-[820px]:hidden" />
                  </>)}
                </div>
                <div className="relative w-full">
                <div className="[border-radius:32px] overflow-hidden [box-shadow:8px_8px_0_#1E1E1E] [height:min(clamp(260px,44vw,420px),44vh)] [transform:rotate(-1.5deg)]">
                  <img src={photos.hero} alt="" className="block w-full h-full object-cover" />
                </div>
                <div className="absolute [top:-18px] [right:-6px] [width:70px] [height:70px] [transform:rotate(8deg)]">
                  <img src={icons.bomb} alt="" aria-hidden="true" className="hc-float w-full h-full object-contain block" />
                </div>
                </div>
              </div>
            </>)}
          </div>
        </section>
      
      
      
        <section className="[background:#F3F0E9] [padding:56px_20px]">
          <div className="[max-width:1200px] [margin:0_auto] flex flex-col gap-[32px]">
            <h2 className="m-0 font-title [font-weight:900] [font-size:clamp(36px,9vw,64px)] [line-height:0.95] [letter-spacing:-0.02em] [color:#1E1E1E]">Chamba de temporada, cerca de tu casa.</h2>
            <a href="#registro" className="[align-self:flex-start] inline-flex items-center justify-center [min-height:56px] [padding:0_34px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] no-underline [box-shadow:5px_5px_0_#AF1C7B]">Quiero mi lugar</a>
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-[20px]">
              <div className="[background:#EFFF94] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#005742] flex flex-col gap-[12px]">
                <div className="flex items-center justify-between gap-[12px]">
                  <span className="[background:#1E1E1E] [color:#EFFF94] [font-weight:700] [font-size:13px] [padding:6px_14px] [border-radius:999px]">Cerca</span>
                {showFotos && (<>
                  <img src={icons.chicken} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:56px] [height:56px] object-contain [transform:rotate(-7deg)]" />
                </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:22px] [line-height:1.1] [color:#1E1E1E]">Chamba cerca de tu casa</h3>
                <p className="m-0 [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Te conectamos con tiendas a menos de 45 minutos de tu código postal.</p>
              </div>
              <div className="[background:#A1DBFF] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#006BAD] flex flex-col gap-[12px]">
                <div className="flex items-center justify-between gap-[12px]">
                  <span className="[background:#1E1E1E] [color:#A1DBFF] [font-weight:700] [font-size:13px] [padding:6px_14px] [border-radius:999px]">Rápido</span>
                {showFotos && (<>
                  <img src={icons.crab} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:56px] [height:56px] object-contain [transform:rotate(8deg)]" />
                </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:22px] [line-height:1.1] [color:#1E1E1E]">Sin CV, sin filas</h3>
                <p className="m-0 [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Te registras desde el celular en 3 minutos. Nada de imprimir papeles.</p>
              </div>
              <div className="[background:#F2DEFC] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#AF1C7B] flex flex-col gap-[12px]">
                <div className="flex items-center justify-between gap-[12px]">
                  <span className="[background:#1E1E1E] [color:#F2DEFC] [font-weight:700] [font-size:13px] [padding:6px_14px] [border-radius:999px]">Marcas</span>
                {showFotos && (<>
                  <img src={icons.duck} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:56px] [height:56px] object-contain [transform:rotate(-6deg)]" />
                </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:22px] [line-height:1.1] [color:#1E1E1E]">Marcas que ya conoces</h3>
                <p className="m-0 [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Las tiendas donde compras están contratando para la temporada alta.</p>
              </div>
            </div>
          </div>
        </section>
      
        <section className="[background:#1E1E1E] [padding:52px_20px]">
          <div className="[max-width:900px] [margin:0_auto] flex flex-col gap-[16px]">
            <p className="m-0 font-title [font-weight:800] [font-size:clamp(26px,7.5vw,48px)] [line-height:1.06] [letter-spacing:-0.02em] [color:#C4E539]">“Necesitaba chamba para diciembre y la encontré a 15 minutos de mi casa.”</p>
            <div className="flex items-center justify-between gap-[16px]">
              <span className="[font-weight:700] [font-size:14px] [color:#FFFFFF]">Karla, 21 · Cajera de temporada, CDMX</span>
              {showFotos && (<>
                <img src={icons.dollar} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:64px] [height:64px] object-contain [transform:rotate(-9deg)]" />
              </>)}
            </div>
          </div>
        </section>
      
        <section className="relative [background:#5251F7] [padding:56px_20px] overflow-hidden">
          <div className="relative [max-width:1200px] [margin:0_auto] flex flex-col gap-[32px]">
            <div className="flex items-center justify-between gap-[12px]">
              <h2 className="m-0 font-title [font-weight:900] [font-size:clamp(36px,9vw,64px)] [line-height:0.95] [letter-spacing:-0.02em] [color:#C4E539] [text-shadow:5px_5px_0_#1E1E1E]">¿Cómo funciona?</h2>
              {showFotos && (<>
                <div className="[flex:0_0_auto] [width:74px] [height:74px] [transform:rotate(9deg)]">
                  <img src={icons.computer} alt="" aria-hidden="true" className="hc-float w-full h-full object-contain block" />
                </div>
              </>)}
            </div>
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))] gap-[20px]">
              <div className="[background:#FFFFFF] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#3535BA] flex flex-col gap-[10px] [transition:transform_.18s_ease,box-shadow_.18s_ease] hover:![transform:translate(-3px,-3px)] hover:![box-shadow:10px_10px_0_#3535BA]">
                <div className="flex items-center justify-between gap-[12px]"><span className="font-title [font-weight:900] [font-size:40px] [line-height:1] [color:#5251F7]">01</span>
                {showFotos && (<>
                  <img src={icons.arrow} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:52px] [height:52px] object-contain [transform:rotate(-7deg)]" />
                </>)}</div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:21px] [line-height:1.1] [color:#1E1E1E]">Te registras</h3>
                <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]">Nombre, teléfono y tu código postal. Nada más.</p>
              </div>
              <div className="[background:#C4E539] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#005742] flex flex-col gap-[10px] [transition:transform_.18s_ease,box-shadow_.18s_ease] hover:![transform:translate(-3px,-3px)] hover:![box-shadow:10px_10px_0_#005742]">
                <div className="flex items-center justify-between gap-[12px]"><span className="font-title [font-weight:900] [font-size:40px] [line-height:1] [color:#1E1E1E]">02</span>
                {showFotos && (<>
                  <img src={icons.cactus} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:52px] [height:52px] object-contain [transform:rotate(8deg)]" />
                </>)}</div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:21px] [line-height:1.1] [color:#1E1E1E]">Validamos tu zona</h3>
                <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]">Vemos qué tiendas te quedan cerca y te lo decimos.</p>
              </div>
              <div className="[background:#FFFFFF] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#3535BA] flex flex-col gap-[10px] [transition:transform_.18s_ease,box-shadow_.18s_ease] hover:![transform:translate(-3px,-3px)] hover:![box-shadow:10px_10px_0_#3535BA]">
                <div className="flex items-center justify-between gap-[12px]"><span className="font-title [font-weight:900] [font-size:40px] [line-height:1] [color:#5251F7]">03</span>
                {showFotos && (<>
                  <img src={icons.disco} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:52px] [height:52px] object-contain [transform:rotate(-6deg)]" />
                </>)}</div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:21px] [line-height:1.1] [color:#1E1E1E]">Recibes tu QR</h3>
                <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]">Tu pase al festival llega por correo, en cuanto lo confirmas.</p>
              </div>
              <div className="[background:#CCC7FF] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#3535BA] flex flex-col gap-[10px] [transition:transform_.18s_ease,box-shadow_.18s_ease] hover:![transform:translate(-3px,-3px)] hover:![box-shadow:10px_10px_0_#3535BA]">
                <div className="flex items-center justify-between gap-[12px]"><span className="font-title [font-weight:900] [font-size:40px] [line-height:1] [color:#3535BA]">04</span>
                {showFotos && (<>
                  <img src={icons.dino} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:52px] [height:52px] object-contain [transform:rotate(7deg)]" />
                </>)}</div>
                <h3 className="m-0 font-title [font-weight:800] [font-size:21px] [line-height:1.1] [color:#1E1E1E]">Vives el festival</h3>
                <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]">Un día completo de entrevistas en línea con marcas de retail.</p>
              </div>
            </div>
            <a href="#registro" className="[align-self:flex-start] inline-flex items-center justify-center [min-height:56px] [padding:0_34px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] no-underline [box-shadow:5px_5px_0_#AF1C7B]">Empezar mi registro</a>
          </div>
        </section>
      
        <section className="relative [background:#C4E539] [padding:48px_clamp(20px,5vw,72px)_56px] overflow-hidden">
          {showGrid && (<>
            <div aria-hidden="true" className="hc-float absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(30,30,30,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,30,30,0.10)_1px,transparent_1px)] [background-size:25%_120px]"></div>
          </>)}
          <div className="relative [max-width:1180px] [margin:0_auto]">
            <div className="flex justify-between items-baseline gap-[16px] [border-bottom:2px_solid_#1E1E1E] [padding-bottom:12px] [margin-bottom:24px]">
              <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">[01] Las chambas del festival</span>
              <div className="flex items-center gap-[10px]">
                {showFotos && (<>
                  <img src={icons.chicken} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(64px,8vw,104px)] [height:clamp(64px,8vw,104px)] object-contain [transform:rotate(-8deg)] max-[820px]:![width:44px] max-[820px]:![height:44px]" />
                  <img src={icons.duck} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(58px,7vw,92px)] [height:clamp(58px,7vw,92px)] object-contain [transform:rotate(7deg)] max-[820px]:![width:40px] max-[820px]:![height:40px]" />
                </>)}
                <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Temporada</span>
              </div>
            </div>
            <div className="relative flex flex-col">
              {showFotos && (<>
                <img src={icons.dollar} alt="" aria-hidden="true" className="hc-float absolute [right:-4px] [bottom:2px] [width:clamp(110px,16vw,230px)] [height:clamp(110px,16vw,230px)] object-contain [transform:rotate(-8deg)] pointer-events-none max-[820px]:![width:96px] max-[820px]:![height:96px]" />
              </>)}
              <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:#1E1E1E]">Vendedor</span>
              <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:transparent] [-webkit-text-stroke:2px_#1E1E1E]">Cajero</span>
              <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:#1E1E1E]">Bodega</span>
              <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:transparent] [-webkit-text-stroke:2px_#1E1E1E]">Acomodo</span>
              <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:#1E1E1E]">Almacén</span>
              <span className="font-title [font-weight:900] [font-size:clamp(38px,12vw,104px)] [line-height:0.94] [letter-spacing:-0.03em] [color:transparent] [-webkit-text-stroke:2px_#1E1E1E]">Atención</span>
            </div>
            <p className="[margin:16px_0_0] [max-width:30ch] [font-size:17px] [line-height:1.5] [color:#1E1E1E] [font-weight:500]">Turnos de temporada alta: Buen Fin, Navidad y Reyes. Medio tiempo o completo, tú eliges.</p>
            <a href="#registro" className="inline-flex items-center justify-center [min-height:56px] [padding:0_34px] [margin-top:20px] [background:#5251F7] [color:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] no-underline [box-shadow:5px_5px_0_#3535BA]">Ver si hay chamba cerca</a>
          </div>
        </section>
      
        <section id="festival" className="relative [background:#DFA0F9] [padding:56px_20px_64px] overflow-hidden">
          {showGrid && (<>
            <div aria-hidden="true" className="hc-float absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(30,30,30,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,30,30,0.10)_1px,transparent_1px)] [background-size:25%_120px]"></div>
          </>)}
          <div className="relative [max-width:1200px] [margin:0_auto] flex flex-col gap-[24px]">
            <div className="flex flex-wrap items-center gap-[12px]">
              <span className="[background:#1E1E1E] [color:#DFA0F9] [font-weight:700] [font-size:14px] [padding:8px_16px] [border-radius:999px]">Gratis · en línea · un solo día</span>
              <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">[02]</span>
            </div>
            <div className="flex items-start justify-between gap-[16px]">
              <h2 className="m-0 [max-width:22ch] font-title [font-weight:900] [font-size:clamp(34px,10vw,76px)] [line-height:0.94] [letter-spacing:-0.03em] [color:#1E1E1E]">Seis pláticas que sí te sirven para conseguir chamba.</h2>
              {showFotos && (<>
                <img src={icons.bomb} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:74px] [height:74px] object-contain [transform:rotate(10deg)]" />
              </>)}
            </div>
            <p className="m-0 [max-width:44ch] [font-size:18px] [font-weight:500] [line-height:1.5] [color:#1E1E1E]">Gente que contrata en retail te va a contar cómo se pasa un filtro, qué te toca por ley y qué hacen los que se quedan después de enero. Entras con el mismo registro, sin pagar nada.</p>
            <div className="flex flex-col gap-[12px]">
              <div className="grid [grid-template-columns:minmax(0,1fr)] gap-[12px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:24px] [padding:18px_20px] items-center">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="font-title [font-weight:900] [font-size:30px] [line-height:1] [color:#AF1C7B]">01</span>
                  <span className="[background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">BLOQUE MAÑANA</span>
                  {showFotos && (<>
                    <img src={icons.alien} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(-8deg)] [margin-left:auto]" />
                  </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E] [text-transform:uppercase]">Cómo pasar tu primera entrevista</h3>
                <p className="m-0 [max-width:52ch] [font-size:16px] [line-height:1.45] [color:#1E1E1E]">Qué preguntan de verdad en tienda y qué contestar cuando no tienes experiencia.</p>
              </div>
              <div className="grid [grid-template-columns:minmax(0,1fr)] gap-[12px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:24px] [padding:18px_20px] items-center">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="font-title [font-weight:900] [font-size:30px] [line-height:1] [color:#AF1C7B]">02</span>
                  <span className="[background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">BLOQUE MAÑANA</span>
                  {showFotos && (<>
                    <img src={icons.bee} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(9deg)] [margin-left:auto]" />
                  </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E] [text-transform:uppercase]">Tu perfil sin CV</h3>
                <p className="m-0 [max-width:52ch] [font-size:16px] [line-height:1.45] [color:#1E1E1E]">Armar tu perfil con lo que ya sabes hacer, aunque nunca hayas chambeado.</p>
              </div>
              <div className="grid [grid-template-columns:minmax(0,1fr)] gap-[12px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:24px] [padding:18px_20px] items-center">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="font-title [font-weight:900] [font-size:30px] [line-height:1] [color:#AF1C7B]">03</span>
                  <span className="[background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">BLOQUE TARDE</span>
                  {showFotos && (<>
                    <img src={icons.dollar} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(-7deg)] [margin-left:auto]" />
                  </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E] [text-transform:uppercase]">Sueldo, turnos y prestaciones</h3>
                <p className="m-0 [max-width:52ch] [font-size:16px] [line-height:1.45] [color:#1E1E1E]">Qué te toca por ley en un contrato de temporada y qué preguntar antes de firmar.</p>
              </div>
              <div className="grid [grid-template-columns:minmax(0,1fr)] gap-[12px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:24px] [padding:18px_20px] items-center">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="font-title [font-weight:900] [font-size:30px] [line-height:1] [color:#AF1C7B]">04</span>
                  <span className="[background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">BLOQUE TARDE</span>
                  {showFotos && (<>
                    <img src={icons.burger} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(8deg)] [margin-left:auto]" />
                  </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E] [text-transform:uppercase]">Aguantar la temporada alta</h3>
                <p className="m-0 [max-width:52ch] [font-size:16px] [line-height:1.45] [color:#1E1E1E]">Cómo se sobrevive un Buen Fin sin quemarte: turnos, descansos y metas.</p>
              </div>
              <div className="grid [grid-template-columns:minmax(0,1fr)] gap-[12px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:24px] [padding:18px_20px] items-center">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="font-title [font-weight:900] [font-size:30px] [line-height:1] [color:#AF1C7B]">05</span>
                  <span className="[background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">BLOQUE NOCHE</span>
                  {showFotos && (<>
                    <img src={icons.crab} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(-6deg)] [margin-left:auto]" />
                  </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E] [text-transform:uppercase]">De temporada a planta</h3>
                <p className="m-0 [max-width:52ch] [font-size:16px] [line-height:1.45] [color:#1E1E1E]">Qué hicieron distinto los que siguen contratados después de Reyes.</p>
              </div>
              <div className="grid [grid-template-columns:minmax(0,1fr)] gap-[12px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:24px] [padding:18px_20px] items-center">
                <div className="flex flex-wrap items-center gap-[12px]">
                  <span className="font-title [font-weight:900] [font-size:30px] [line-height:1] [color:#AF1C7B]">06</span>
                  <span className="[background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">BLOQUE NOCHE</span>
                  {showFotos && (<>
                    <img src={icons.coin} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(7deg)] [margin-left:auto]" />
                  </>)}
                </div>
                <h3 className="m-0 font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E] [text-transform:uppercase]">Tu lana, tu primer sueldo</h3>
                <p className="m-0 [max-width:52ch] [font-size:16px] [line-height:1.45] [color:#1E1E1E]">Qué hacer con el primer pago para que no se te vaya en dos semanas.</p>
              </div>
            </div>
            <div className="flex flex-col gap-[20px]">
              <div className="relative [background:#F3F0E9] [border:2px_solid_#1E1E1E] [border-radius:32px] [box-shadow:8px_8px_0_#AF1C7B] [padding:20px_14px] overflow-hidden">
                <div className="flex flex-wrap items-center justify-center gap-[8px] [margin-bottom:14px]">
                  <span className="[border:2px_solid_#1E1E1E] [border-radius:999px] [padding:8px_18px] font-title [font-weight:900] [font-size:16px] [letter-spacing:-0.01em] [color:#1E1E1E] whitespace-nowrap">HEYCHAMBA 2026 · 15 OCT</span>
                  <span className="[background:#C4E539] [border:2px_solid_#1E1E1E] [border-radius:999px] [padding:8px_18px] [font-weight:700] [font-size:12px] [letter-spacing:0.1em] [color:#1E1E1E] whitespace-nowrap">LINE UP</span>
                </div>
                <div className="flex flex-col gap-[16px] [border-top:2px_solid_#1E1E1E] [border-bottom:2px_solid_#1E1E1E] [padding:18px_4px]">
                  <div className="flex flex-col items-center gap-[8px]">
                    <span className="[background:#C4E539] [border:2px_solid_#1E1E1E] [border-radius:999px] [padding:4px_14px] [font-weight:700] [font-size:10px] [letter-spacing:0.16em] [color:#1E1E1E]">PLÁTICA PRINCIPAL</span>
                    <div className="flex flex-wrap items-baseline justify-center gap-y-[4px] gap-x-[14px]">
                      <span aria-hidden="true" className="hc-float [filter:blur(9px)] font-title [font-weight:900] [font-size:30px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-[8px]">
                    <span className="[background:#DFA0F9] [border:2px_solid_#1E1E1E] [border-radius:999px] [padding:4px_14px] [font-weight:700] [font-size:10px] [letter-spacing:0.16em] [color:#1E1E1E]">A–Z</span>
                    <div className="flex flex-wrap items-baseline justify-center gap-y-[4px] gap-x-[14px]">
                      <span aria-hidden="true" className="hc-float [filter:blur(7px)] font-title [font-weight:900] [font-size:21px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(7px)] font-title [font-weight:900] [font-size:21px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(7px)] font-title [font-weight:900] [font-size:21px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-[8px]">
                    <span className="[background:#A1DBFF] [border:2px_solid_#1E1E1E] [border-radius:999px] [padding:4px_14px] [font-weight:700] [font-size:10px] [letter-spacing:0.16em] [color:#1E1E1E]">A–Z</span>
                    <div className="flex flex-wrap items-baseline justify-center gap-y-[4px] gap-x-[12px]">
                      <span aria-hidden="true" className="hc-float [filter:blur(6px)] font-title [font-weight:900] [font-size:16px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(6px)] font-title [font-weight:900] [font-size:16px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(6px)] font-title [font-weight:900] [font-size:16px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(6px)] font-title [font-weight:900] [font-size:16px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(6px)] font-title [font-weight:900] [font-size:16px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(6px)] font-title [font-weight:900] [font-size:16px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-[8px]">
                    <span className="[background:#F2DEFC] [border:2px_solid_#1E1E1E] [border-radius:999px] [padding:4px_14px] [font-weight:700] [font-size:10px] [letter-spacing:0.16em] [color:#1E1E1E]">A–Z</span>
                    <div className="flex flex-wrap items-baseline justify-center gap-y-[4px] gap-x-[10px]">
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">POR ANUNCIAR</span>
                      <span aria-hidden="true" className="hc-float [filter:blur(5px)] font-title [font-weight:900] [font-size:13px] [line-height:1.06] [letter-spacing:-0.02em] [color:#1E1E1E] [user-select:none]">Y MUCHO MÁS</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-[8px] [margin-top:16px]">
                  <span className="[font-weight:700] [font-size:12px] [letter-spacing:0.14em] [color:#1E1E1E]">REGISTRO EN:</span>
                  <span className="font-title [font-weight:900] [font-size:17px] [letter-spacing:-0.01em] [color:#1E1E1E]">heychamba.com</span>
                </div>
                <div className="absolute [left:-8%] [right:-8%] [top:50%] [transform:translateY(-50%)_rotate(-4deg)] [background:#1E1E1E] [border-top:2px_solid_#C4E539] [border-bottom:2px_solid_#C4E539] [padding:14px_20px] flex items-center justify-center">
                  <span className="font-title [font-weight:900] [font-size:clamp(26px,7vw,44px)] [line-height:1] [letter-spacing:-0.02em] [color:#C4E539] whitespace-nowrap">PRÓXIMAMENTE</span>
                </div>
              </div>
              <div className="[background:#1E1E1E] [border-radius:32px] [padding:24px] flex flex-wrap items-center justify-between gap-[20px]">
                <div className="flex flex-col gap-[10px] [min-width:min(100%,280px)] [flex:1_1_280px]">
                  <span className="[font-weight:700] [font-size:13px] [color:#DFA0F9]">Lineup en camino</span>
                  <p className="m-0 font-title [font-weight:800] [font-size:clamp(22px,6vw,32px)] [line-height:1.1] [color:#C4E539]">Todavía no decimos quién da cada plática. Los registrados se enteran primero.</p>
                  <a href="#registro" className="[align-self:flex-start] inline-flex items-center justify-center [min-height:52px] [padding:0_30px] [background:#C4E539] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:700] [font-size:16px] no-underline [box-shadow:5px_5px_0_#005742]">Avísenme del lineup</a>
                </div>
                {showFotos && (<>
                  <div className="flex items-center gap-[14px]">
                    <img src={icons.computer} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:62px] [height:62px] object-contain [transform:rotate(-9deg)]" />
                    <img src={icons.disco} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:62px] [height:62px] object-contain [transform:rotate(8deg)]" />
                    <img src={icons.asterisk} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:62px] [height:62px] object-contain [transform:rotate(-5deg)]" />
                  </div>
                </>)}
              </div>
            </div>
            {showFotos && (<>
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-[16px] max-[820px]:![grid-template-columns:minmax(0,1fr)] max-[820px]:[&>div]:![height:clamp(220px,58vw,320px)]">
                <div className="[height:clamp(200px,46vw,300px)] [border-radius:32px] overflow-hidden [box-shadow:8px_8px_0_#AF1C7B] [transform:rotate(-1.5deg)]">
                  <img src={photos.city} alt="" className="block w-full h-full object-cover" />
                </div>
                <div className="[height:clamp(200px,46vw,300px)] [border-radius:32px] overflow-hidden [box-shadow:8px_8px_0_#AF1C7B] [transform:rotate(2deg)]">
                  <img src={photos.shoes} alt="" className="block w-full h-full object-cover" />
                </div>
                <div className="[height:clamp(200px,46vw,300px)] [border-radius:32px] overflow-hidden [box-shadow:8px_8px_0_#AF1C7B] [transform:rotate(-2.5deg)]">
                  <img src={photos.park} alt="" className="block w-full h-full object-cover" />
                </div>
              </div>
            </>)}
          </div>
        </section>
      
        {showFormulario && (<>
          <section id="registro" className="relative [background:#FFFFFF] [padding:56px_clamp(20px,5vw,72px)_64px] overflow-hidden">
            <div className="relative [max-width:1180px] [margin:0_auto] flex flex-wrap items-start gap-y-[32px] gap-x-[40px]">
            <div className="[flex:1_1_340px] min-w-0 [max-width:520px] flex flex-col gap-[24px]">
              <div className="flex items-start justify-between gap-[16px]">
                <h2 className="m-0 font-title [font-weight:900] [font-size:clamp(32px,8vw,52px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E]">Aparta tu lugar</h2>
                {showFotos && (<>
                  <img src={icons.bee} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:70px] [height:70px] object-contain [transform:rotate(9deg)]" />
                </>)}
              </div>
              <p className="m-0 [font-size:17px] [line-height:1.5] [color:#1E1E1E]">Te faltan 2 minutos.</p>
      
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-baseline justify-between gap-[12px]">
                  <span className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Fase 1 de 3</span>
                  <span className="[font-weight:700] [font-size:14px] [color:#565656]">Las otras dos las llenas después</span>
                </div>
                <div role="progressbar" aria-valuenow="33" aria-valuemin="0" aria-valuemax="100" aria-label="Avance de tu perfil" className="flex gap-[6px]">
                  <div className="[flex:1] [height:16px] [background:#C4E539] [border:2px_solid_#1E1E1E] [border-radius:999px]"></div>
                  <div className="[flex:1] [height:16px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:999px]"></div>
                  <div className="[flex:1] [height:16px] [background:#FFFFFF] [border:2px_solid_#1E1E1E] [border-radius:999px]"></div>
                </div>
                <span className="[font-size:13px] [font-weight:500] [line-height:1.4] [color:#565656]">Con esto ya tienes lugar. Las fases 2 y 3 las contestas aquí mismo, en nuestro formulario interactivo.</span>
              </div>
      
              <div className="flex flex-col gap-[14px] [border-top:2px_solid_#1E1E1E] [padding-top:20px] max-[820px]:hidden">
                <span className="[font-weight:700] [font-size:13px] [letter-spacing:0.08em] [color:#565656]">QUÉ PASA DESPUÉS</span>
                <div className="flex items-start gap-[14px]">
                  <img src={icons.arrow} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(-8deg)]" />
                  <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]"><strong>Validamos tu zona</strong> y te decimos qué tiendas te quedan cerca.</p>
                </div>
                <div className="flex items-start gap-[14px]">
                  <img src={icons.disco} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(7deg)]" />
                  <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]"><strong>Completas las fases 2 y 3</strong> en nuestro formulario interactivo, a tu ritmo. Si te sales a medias, te mandamos un enlace para seguirle donde te quedaste.</p>
                </div>
                <div className="flex items-start gap-[14px]">
                  <img src={icons.coin} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:44px] [height:44px] object-contain [transform:rotate(-6deg)]" />
                  <p className="m-0 [font-size:16px] [line-height:1.5] [color:#1E1E1E]"><strong>Recibes tu QR</strong> para entrar el 15 de octubre.</p>
                </div>
              </div>
            </div>
      
              <form onSubmit={submitRegistro} className="[flex:1_1_380px] min-w-0 [max-width:560px] flex flex-col gap-[20px]">
      
                <div className="[background:#5251F7] [border-radius:32px] [padding:24px] [box-shadow:6px_6px_0_#3535BA] flex flex-col gap-[20px]">
                  <div className="flex flex-col gap-[6px]">
                    <span className="[font-weight:700] [font-size:13px] [color:#C4E539]">Fase 1 · 33%</span>
                    <h3 className="m-0 font-title [font-weight:800] [font-size:24px] [line-height:1.1] [color:#FFFFFF]">Tus datos</h3>
                  </div>
                  <div className="[background:#FFFFFF] [border-radius:24px] [padding:20px] flex flex-col gap-[20px]">
                    <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-[20px]">
                      <div className="flex flex-col gap-[8px]">
                        <label htmlFor="hc-nombre" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Nombre y apellido</label>
                        <input id="hc-nombre" name="nombre" type="text" placeholder="Ana Ramírez" autoComplete="name" aria-invalid={!!errorNombre} aria-describedby={errorNombre ? 'hc-nombre-error' : undefined} onInput={() => setErrorNombre('')} className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" style={errorNombre ? { borderColor: '#C0392B', background: '#FDECEA' } : undefined} />
                        {errorNombre && <span id="hc-nombre-error" role="alert" className="[font-size:13px] [font-weight:700] [color:#C0392B]">{errorNombre}</span>}
                      </div>
                      <div className="flex flex-col gap-[8px]">
                        <label htmlFor="hc-tel" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Teléfono</label>
                        <input id="hc-tel" name="telefono" type="tel" placeholder="10 dígitos" className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" />
                      </div>
                    </div>
                      <div className="flex flex-col gap-[8px]">
                        <label htmlFor="hc-email" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Correo</label>
                        <input id="hc-email" name="email" type="email" placeholder="tu@correo.com" className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" />
                      </div>
                    <div className="flex flex-col gap-[14px]">
                      <CasillaLegal id="hc-acepto-aviso" checked={cand.aviso} error={errorCand.aviso}
                        onChange={v => { setCand(c => ({ ...c, aviso: v })); if (v) setErrorCand(x => ({ ...x, aviso: '' })); }}>
                        Acepto el <EnlaceLegal href="/aviso-de-privacidad">Aviso de Privacidad</EnlaceLegal> y los <EnlaceLegal href="/terminos-y-condiciones">Términos y Condiciones</EnlaceLegal>, y autorizo que mis datos sean transferidos a las empresas empleadoras para ser considerado en sus vacantes.
                      </CasillaLegal>
                      <CasillaLegal id="hc-soy-mayor" checked={cand.edad} error={errorCand.edad}
                        onChange={v => { setCand(c => ({ ...c, edad: v })); if (v) setErrorCand(x => ({ ...x, edad: '' })); }}>
                        Confirmo que soy mayor de 18 años.
                      </CasillaLegal>
                      <CasillaLegal id="hc-comunicaciones" checked={cand.comunicaciones}
                        onChange={v => setCand(c => ({ ...c, comunicaciones: v }))}>
                        Quiero recibir vacantes, invitaciones a eventos y comunicaciones de temporadas posteriores. <span className="[color:#565656]">(Opcional)</span>
                      </CasillaLegal>
                    </div>
                    <button type="submit" disabled={!cand.aviso || !cand.edad} className="[align-self:flex-start] [min-height:56px] [padding:0_36px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] [box-shadow:5px_5px_0_#AF1C7B] cursor-pointer disabled:[opacity:0.45] disabled:cursor-not-allowed disabled:[box-shadow:none]">Quiero mi lugar</button>
                    <span className="[font-size:13px] [font-weight:500] [line-height:1.4] [color:#565656]">Tus datos no se venden.</span>
                  </div>
                </div>
      
              </form>
            </div>
          </section>
        </>)}
      
        <section id="marcas" className="relative [background:#5251F7] [padding:56px_clamp(20px,5vw,72px)_64px] overflow-hidden">
          <div className="relative [max-width:1180px] [margin:0_auto] flex flex-wrap items-start gap-y-[32px] gap-x-[40px]">
            <div className="[flex:1_1_340px] min-w-0 [max-width:520px] flex flex-col gap-[24px]">
            <span className="[align-self:flex-start] [background:#C4E539] [color:#1E1E1E] [font-weight:700] [font-size:14px] [padding:8px_16px] [border-radius:999px] [box-shadow:3px_3px_0_#1E1E1E]">Para retail y empresas con alta rotación</span>
            <h2 className="m-0 [max-width:24ch] font-title [font-weight:900] [font-size:clamp(34px,9vw,64px)] [line-height:0.95] [letter-spacing:-0.02em] [color:#C4E539] [text-shadow:5px_5px_0_#1E1E1E]">Contrata en volumen sin perder tiempo.</h2>
            <div className="flex items-end justify-between gap-[16px]">
              <p className="m-0 [max-width:30ch] [color:#FFFFFF] [font-size:18px] [line-height:1.5]">Te mandamos candidatos cerca de tus puntos de trabajo, ya filtrados por disponibilidad y experiencia.</p>
              {showFotos && (<>
                <img src={icons.burger} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:74px] [height:74px] object-contain [transform:rotate(-10deg)]" />
              </>)}
            </div>
            <div className="flex flex-col gap-[12px] [border-top:2px_solid_rgba(255,255,255,0.4)] [padding-top:20px] max-[820px]:hidden">
              <div className="flex items-baseline gap-[14px]">
                <span className="font-title [font-weight:900] [font-size:34px] [line-height:1] [color:#C4E539]">45 min</span>
                <span className="[font-size:16px] [font-weight:500] [line-height:1.4] [color:#FFFFFF]">de radio máximo entre candidato y tu ubicación</span>
              </div>
              <div className="flex items-baseline gap-[14px]">
                <span className="font-title [font-weight:900] [font-size:34px] [line-height:1] [color:#C4E539]">3 fases</span>
                <span className="[font-size:16px] [font-weight:500] [line-height:1.4] [color:#FFFFFF]">de perfilado antes de que llegue a tu bandeja</span>
              </div>
              <div className="flex items-baseline gap-[14px]">
                <span className="font-title [font-weight:900] [font-size:34px] [line-height:1] [color:#C4E539]">1 día</span>
                <span className="[font-size:16px] [font-weight:500] [line-height:1.4] [color:#FFFFFF]">de entrevistas en línea, sin montar stand</span>
              </div>
            </div>
            </div>
            <div className="[flex:1_1_380px] min-w-0 [max-width:560px] flex flex-col gap-[24px]">
              <div className="[background:#FFFFFF] [border-radius:32px] [padding:24px] [box-shadow:8px_8px_0_#3535BA] flex flex-col gap-[20px]">
              <h3 className="m-0 font-title [font-weight:800] [font-size:22px] [line-height:1.1] [color:#1E1E1E]">Quiero el paquete de participación</h3>
              <form onSubmit={submitMarca} className="flex flex-col gap-[20px]">
                <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-[20px]">
                  <div className="flex flex-col gap-[8px]">
                    <label htmlFor="hc-m-nombre" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Nombre</label>
                    <input id="hc-m-nombre" name="marca-nombre" type="text" placeholder="Quién nos escribe" className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" />
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <label htmlFor="hc-m-mail" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Correo corporativo</label>
                    <input id="hc-m-mail" name="marca-mail" type="email" placeholder="nombre@tumarca.com" className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" />
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <label htmlFor="hc-m-tel" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Teléfono</label>
                    <input id="hc-m-tel" name="marca-tel" type="tel" inputMode="numeric" placeholder="10 dígitos" className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" />
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <label htmlFor="hc-m-vacantes" className="[font-weight:700] [font-size:14px] [color:#1E1E1E]">Vacantes estimadas</label>
                    <input id="hc-m-vacantes" name="marca-vacantes" type="text" inputMode="numeric" placeholder="Ej. 120" className="[height:56px] [padding:16px_20px] [border:2px_solid_#1E1E1E] [border-radius:24px] [font-size:16px] [color:#1E1E1E] [background:#FFFFFF]" />
                  </div>
                </div>
                <div className="flex flex-col gap-[14px]">
                  <CasillaLegal id="hc-m-acepto" checked={marca.aviso} error={errorMarca}
                    onChange={v => { setMarca(m => ({ ...m, aviso: v })); if (v) setErrorMarca(''); }}>
                    Acepto el <EnlaceLegal href="/aviso-de-privacidad">Aviso de Privacidad</EnlaceLegal>, los <EnlaceLegal href="/terminos-y-condiciones">Términos y Condiciones</EnlaceLegal> y el <EnlaceLegal href="/uso-de-informacion">Uso de Información</EnlaceLegal>.
                  </CasillaLegal>
                  <CasillaLegal id="hc-m-comunicaciones" checked={marca.comunicaciones}
                    onChange={v => setMarca(m => ({ ...m, comunicaciones: v }))}>
                    Quiero recibir comunicaciones comerciales de Hey Chamba. <span className="[color:#565656]">(Opcional)</span>
                  </CasillaLegal>
                </div>
                <button type="submit" disabled={!marca.aviso} className="[align-self:flex-start] [min-height:52px] [padding:0_32px] [background:#5251F7] [color:#FFFFFF] border-none [border-radius:999px] [font-weight:700] [font-size:17px] [box-shadow:4px_4px_0_#3535BA] cursor-pointer disabled:[opacity:0.45] disabled:cursor-not-allowed disabled:[box-shadow:none]">Soy marca</button>
              </form>
              </div>

              {/* Los datos del pitch. Van solo en escritorio: llenan el hueco
                  que queda debajo del formulario cuando las dos columnas se
                  ponen lado a lado. En celular las columnas se apilan, no hay
                  hueco, y este bloque estorbaría antes del siguiente tema. */}
              <div className="max-[820px]:hidden flex flex-col gap-[16px]">
                <span className="[align-self:flex-start] [background:#1E1E1E] [color:#FFFFFF] [font-weight:700] [font-size:11px] [letter-spacing:0.12em] [padding:6px_14px] [border-radius:999px]">POR QUÉ PASA</span>
                <div className="grid [grid-template-columns:repeat(3,minmax(0,1fr))] gap-[12px]">
                  {[
                    { color: '#C4E539', dato: '20%', texto: 'de las bajas ocurren con CERO días trabajados' },
                    { color: '#DFA0F9', dato: '2 de 3', texto: 'candidatos viven lejos de donde los contratan' },
                    { color: '#A1DBFF', dato: '80%', texto: 'del talento de alto volumen tiene 18–28 años' },
                  ].map(({ color, dato, texto }) => (
                    <div key={dato} className="[background:#1E1E1E] [border-radius:24px] [box-shadow:8px_8px_0_#3535BA] overflow-hidden flex flex-col">
                      <div className="[height:8px]" style={{ background: color }}></div>
                      <div className="flex flex-col gap-[8px] [padding:18px_20px]">
                        <span className="font-title [font-weight:900] [font-size:34px] [line-height:1] [letter-spacing:-0.02em]" style={{ color }}>{dato}</span>
                        <span className="[font-size:14px] [font-weight:500] [line-height:1.4] [color:#FFFFFF]">{texto}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="m-0 [font-size:13px] [font-style:italic] [line-height:1.45] [color:rgba(255,255,255,0.72)]">Fuente: análisis de 5,615 bajas reales de retail en México (2023–2026) y 203 contrataciones.</p>
              </div>
            </div>
          </div>
        </section>
      
        <section id="faq" className="[background:#F3F0E9] [padding:56px_clamp(20px,5vw,72px)]">
          <div className="[max-width:1180px] [margin:0_auto] flex flex-col gap-[24px]">
            <div className="flex items-start justify-between gap-[16px]">
              <h2 className="m-0 font-title [font-weight:900] [font-size:clamp(34px,9vw,56px)] [line-height:0.98] [letter-spacing:-0.02em] [color:#1E1E1E]">Preguntas</h2>
              {showFotos && (<>
                <div className="[flex:0_0_auto] [width:72px] [height:72px] [transform:rotate(-7deg)]">
                  <img src={icons.alien} alt="" aria-hidden="true" className="hc-float w-full h-full object-contain block" />
                </div>
              </>)}
            </div>
            <div className="flex flex-col">
              <div className="[border-bottom:2px_solid_#1E1E1E]">
                <button type="button" onClick={t1} aria-expanded={open1} className="w-full flex items-center justify-between gap-[16px] [padding:18px_0] [background:transparent] border-none text-left cursor-pointer">
                  <span className="font-title [font-weight:800] [font-size:18px] [line-height:1.2] [color:#1E1E1E]">¿Cuánto cuesta entrar?</span>
                  <span aria-hidden="true" className="hc-float [font-size:24px] [font-weight:700] [line-height:1] [color:#1E1E1E]">{ind1}</span>
                </button>
                {open1 && (<>
                  <p className="m-0 [padding:0_0_18px] [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Nada. El festival es gratis para candidatos, de principio a fin.</p>
                </>)}
              </div>
              <div className="[border-bottom:2px_solid_#1E1E1E]">
                <button type="button" onClick={t2} aria-expanded={open2} className="w-full flex items-center justify-between gap-[16px] [padding:18px_0] [background:transparent] border-none text-left cursor-pointer">
                  <span className="font-title [font-weight:800] [font-size:18px] [line-height:1.2] [color:#1E1E1E]">¿Necesito CV?</span>
                  <span aria-hidden="true" className="hc-float [font-size:24px] [font-weight:700] [line-height:1] [color:#1E1E1E]">{ind2}</span>
                </button>
                {open2 && (<>
                  <p className="m-0 [padding:0_0_18px] [font-size:16px] [line-height:1.55] [color:#1E1E1E]">No. Contestas unas preguntas desde el celular y con eso armamos tu perfil.</p>
                </>)}
              </div>
              <div className="[border-bottom:2px_solid_#1E1E1E]">
                <button type="button" onClick={t3} aria-expanded={open3} className="w-full flex items-center justify-between gap-[16px] [padding:18px_0] [background:transparent] border-none text-left cursor-pointer">
                  <span className="font-title [font-weight:800] [font-size:18px] [line-height:1.2] [color:#1E1E1E]">¿Es mi primera chamba, puedo entrar?</span>
                  <span aria-hidden="true" className="hc-float [font-size:24px] [font-weight:700] [line-height:1] [color:#1E1E1E]">{ind3}</span>
                </button>
                {open3 && (<>
                  <p className="m-0 [padding:0_0_18px] [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Sí. Muchas de las vacantes de temporada no piden experiencia previa.</p>
                </>)}
              </div>
              <div className="[border-bottom:2px_solid_#1E1E1E]">
                <button type="button" onClick={t4} aria-expanded={open4} className="w-full flex items-center justify-between gap-[16px] [padding:18px_0] [background:transparent] border-none text-left cursor-pointer">
                  <span className="font-title [font-weight:800] [font-size:18px] [line-height:1.2] [color:#1E1E1E]">¿Para qué quieren mi código postal?</span>
                  <span aria-hidden="true" className="hc-float [font-size:24px] [font-weight:700] [line-height:1] [color:#1E1E1E]">{ind4}</span>
                </button>
                {open4 && (<>
                  <p className="m-0 [padding:0_0_18px] [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Para mandarte solo vacantes que te queden cerca. Sin CP no hay match.</p>
                </>)}
              </div>
              <div className="[border-bottom:2px_solid_#1E1E1E]">
                <button type="button" onClick={t5} aria-expanded={open5} className="w-full flex items-center justify-between gap-[16px] [padding:18px_0] [background:transparent] border-none text-left cursor-pointer">
                  <span className="font-title [font-weight:800] [font-size:18px] [line-height:1.2] [color:#1E1E1E]">¿Cuándo y dónde es?</span>
                  <span aria-hidden="true" className="hc-float [font-size:24px] [font-weight:700] [line-height:1] [color:#1E1E1E]">{ind5}</span>
                </button>
                {open5 && (<>
                  <p className="m-0 [padding:0_0_18px] [font-size:16px] [line-height:1.55] [color:#1E1E1E]">El 15 de octubre de 2026, en línea. Entras con tu QR desde el celular.</p>
                </>)}
              </div>
              <div className="[border-bottom:2px_solid_#1E1E1E]">
                <button type="button" onClick={t6} aria-expanded={open6} className="w-full flex items-center justify-between gap-[16px] [padding:18px_0] [background:transparent] border-none text-left cursor-pointer">
                  <span className="font-title [font-weight:800] [font-size:18px] [line-height:1.2] [color:#1E1E1E]">Soy marca, ¿cómo participo?</span>
                  <span aria-hidden="true" className="hc-float [font-size:24px] [font-weight:700] [line-height:1] [color:#1E1E1E]">{ind6}</span>
                </button>
                {open6 && (<>
                  <p className="m-0 [padding:0_0_18px] [font-size:16px] [line-height:1.55] [color:#1E1E1E]">Escríbenos a contacto@heychamba.com y te mandamos el paquete de participación.</p>
                </>)}
              </div>
            </div>
            <a href="#registro" className="[align-self:flex-start] inline-flex items-center justify-center [min-height:56px] [padding:0_34px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:18px] no-underline [box-shadow:5px_5px_0_#AF1C7B]">Quiero mi lugar</a>
          </div>
        </section>
      
        <section className="relative [background:#C4E539] [padding:64px_clamp(20px,5vw,72px)_72px] overflow-hidden">
          {showGrid && (<>
            <div aria-hidden="true" className="hc-float absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,rgba(30,30,30,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,30,30,0.10)_1px,transparent_1px)] [background-size:25%_120px]"></div>
          </>)}
          <div className="relative [max-width:1180px] [margin:0_auto] flex flex-wrap items-center gap-y-[32px] gap-x-[40px]">
            <div className="[flex:1_1_420px] min-w-0 [max-width:720px] flex flex-col items-start gap-[20px] max-[820px]:![max-width:240px]">
              <h2 className="m-0 font-title [font-weight:900] [font-size:clamp(40px,11vw,84px)] [line-height:0.92] [letter-spacing:-0.03em] [color:#1E1E1E] max-[820px]:![font-size:38px]">El único festival donde consigues chamba.</h2>
              <span className="[background:#5251F7] [color:#FFFFFF] [font-weight:700] [font-size:15px] [padding:12px_24px] [border-radius:999px] [box-shadow:4px_4px_0_#3535BA]">15 de octubre 2026</span>
              <a href="#registro" className="inline-flex items-center justify-center [min-height:60px] [padding:0_40px] [background:#DFA0F9] [color:#1E1E1E] [border:2px_solid_#1E1E1E] [border-radius:999px] [font-weight:900] [font-size:19px] no-underline [box-shadow:5px_5px_0_#AF1C7B]">Quiero mi lugar</a>
            </div>
            {showFotos && (<>
              <div className="[flex:1_1_280px] min-w-0 [max-width:330px] [margin:0_auto] flex flex-wrap items-center justify-center gap-y-[14px] gap-x-[clamp(24px,4vw,56px)] max-[820px]:[&_img]:![flex:0_0_auto] max-[820px]:[&_img]:![width:66px] max-[820px]:[&_img]:![height:66px] max-[820px]:[&_img]:![margin:0] max-[820px]:[&>img:nth-child(2)]:![margin-right:34px] max-[820px]:!absolute max-[820px]:![right:-4px] max-[820px]:![top:0] max-[820px]:![bottom:0] max-[820px]:![width:118px] max-[820px]:!flex-nowrap max-[820px]:!flex-col max-[820px]:!items-end max-[820px]:!justify-between max-[820px]:!gap-[0] max-[820px]:!pointer-events-none">
                <img src={icons.dino} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(76px,9vw,118px)] [height:clamp(76px,9vw,118px)] object-contain [transform:rotate(6deg)]" />
                <img src={icons.arrow} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:clamp(76px,9vw,118px)] [height:clamp(76px,9vw,118px)] object-contain [transform:rotate(-12deg)]" />
                <img src={icons.crab} alt="" aria-hidden="true" className="hc-float [flex:0_0_100%] [width:clamp(70px,8vw,104px)] [height:clamp(70px,8vw,104px)] [margin:0_auto] object-contain [transform:rotate(-6deg)]" />
              </div>
            </>)}
          </div>
        </section>
      
      
      
        <footer className="[background:#1E1E1E] [padding:48px_20px_40px]">
          <div className="[max-width:1200px] [margin:0_auto] flex flex-col gap-[28px]">
            <div className="flex flex-wrap items-center justify-between gap-[16px]">
              <span className="font-title [font-weight:900] [font-size:28px] [letter-spacing:-0.02em] [color:#C4E539]">HeyChamba</span>
              {showFotos && (<>
                <div className="flex items-center gap-[14px]">
                  <img src={icons.duck} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:48px] [height:48px] object-contain [transform:rotate(-8deg)]" />
                  <img src={icons.burger} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:48px] [height:48px] object-contain [transform:rotate(7deg)]" />
                  <img src={icons.chicken} alt="" aria-hidden="true" className="hc-float [flex:0_0_auto] [width:48px] [height:48px] object-contain [transform:rotate(-5deg)]" />
                </div>
              </>)}
            </div>
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-[24px]">
              <div className="flex flex-col gap-[10px]">
                <span className="[font-weight:700] [font-size:14px] [color:#FFFFFF]">Legal</span>
                <a href="/aviso-de-privacidad" className="[font-size:14px] [color:rgba(255,255,255,0.8)] hover:underline">Aviso de Privacidad</a>
                <a href="/aviso-de-privacidad-simplificado" className="[font-size:14px] [color:rgba(255,255,255,0.8)] hover:underline">Aviso de Privacidad Simplificado</a>
                <a href="/uso-de-informacion" className="[font-size:14px] [color:rgba(255,255,255,0.8)] hover:underline">Uso de Información</a>
                <a href="/terminos-y-condiciones" className="[font-size:14px] [color:rgba(255,255,255,0.8)] hover:underline">Términos y Condiciones</a>
              </div>
              <div className="flex flex-col gap-[10px]">
                <span className="[font-weight:700] [font-size:14px] [color:#FFFFFF]">Contacto</span>
                <a href="mailto:contacto@heychamba.com" className="[font-size:14px] [color:rgba(255,255,255,0.8)]">contacto@heychamba.com</a>
              </div>
              <div className="flex flex-col gap-[10px]">
                <span className="[font-weight:700] [font-size:14px] [color:#FFFFFF]">Redes</span>
                <a href="https://www.instagram.com/heychamba/" target="_blank" rel="noreferrer" className="[font-size:14px] [color:rgba(255,255,255,0.8)]">Instagram</a>
                <a href="https://www.tiktok.com/@heychamba" target="_blank" rel="noreferrer" className="[font-size:14px] [color:rgba(255,255,255,0.8)]">TikTok</a>
                <a href="https://www.facebook.com/profile.php?id=61593944916264" target="_blank" rel="noreferrer" className="[font-size:14px] [color:rgba(255,255,255,0.8)]">Facebook</a>
                <a href="https://www.linkedin.com/company/heychamba/" target="_blank" rel="noreferrer" className="[font-size:14px] [color:rgba(255,255,255,0.8)]">LinkedIn</a>
              </div>
            </div>
            <div className="flex flex-col gap-[8px]">
              {/* Identificación del responsable: la pide la LFPDPPP. */}
              <span className="[font-size:12px] [line-height:1.55] [color:rgba(255,255,255,0.55)]">
                Hey Chamba es un nombre comercial registrado.<br/>
                Col. Juárez, Alcaldía Cuauhtémoc, CDMX, C.P. 06600.<br/>
                Contacto en materia de datos personales: <a href="mailto:misdatos@heychamba.com" className="[color:rgba(255,255,255,0.75)] hover:underline">misdatos@heychamba.com</a>
              </span>
              <span className="[font-size:13px] [color:rgba(255,255,255,0.6)]">© 2026 HeyChamba. Festival virtual de empleo, México.</span>
            </div>
          </div>
        </footer>
      
      </div>
    </>
  );
}
