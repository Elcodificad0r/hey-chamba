import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { ArrowLeft, Bike, BookOpen, BriefcaseBusiness, Bus, CalendarDays, Car, Check, Globe, ChevronLeft, Clock3, GraduationCap, Handshake, Heart, KeyRound, LockKeyhole, Mail, MapPin, Minus, PersonStanding, Plus, School, Star, UserRound, X } from "lucide-react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { formArt, formIcons as icons } from "@/lib/heychamba-assets";
import { heychambaColonias } from "@/lib/heychamba-colonias";
import { loadVoxelGlobe } from "@/lib/globe-loader";
import globePoster from "@/assets/globe-poster.png";
import { HeyChambaMenu } from "@/components/HeyChambaMenu";
import { QRCodeCanvas } from "qrcode.react";
import { guardarEspera, guardarNoTerminado, guardarPerfil, retomarRegistro } from "@/lib/registros.functions";

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [
    { title: "Registro de talento — HeyChamba" },
    { name: "description", content: "Completa tu perfil HeyChamba para encontrar trabajo de temporada cerca de casa." },
    { property: "og:title", content: "Registro de talento — HeyChamba" },
    { property: "og:description", content: "Completa las fases de tu perfil para participar en HeyChamba." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Registro,
  /* Los datos de la fase 1 llegan por la URL desde la landing (nombre, teléfono, correo y folio). */
  validateSearch: (search: { folio?: string; nombre?: string; telefono?: string; email?: string }) => ({
    folio: typeof search.folio === "string" ? search.folio : "",
    nombre: typeof search.nombre === "string" ? search.nombre : "",
    telefono: typeof search.telefono === "string" ? search.telefono : "",
    email: typeof search.email === "string" ? search.email : "",
  }),
});

/* ─────────────────────────────────────────────────────────────
   TIPOS BÁSICOS
   Aquí definimos "de qué está hecha" cada pregunta del formulario.
   ───────────────────────────────────────────────────────────── */

// Cada pregunta se dibuja distinto según su tipo:
// cp = código postal con globo 3D · text = escribir · rows = lista vertical
// tiles = mosaicos · faces = caritas 1-5 · counter = sumar/restar · thermo = escala 1-10
type QType = "cp" | "text" | "rows" | "tiles" | "faces" | "counter" | "thermo";
type IconType = ComponentType<{ className?: string }>;
type Option = { label: string; Icon?: IconType };
// key: nombre corto con el que guardamos la respuesta (ej. "cp", "curp", "edad")
// phase: 2 = tu zona y situación · 3 = tu experiencia · art: ilustración que flota al lado
// multi: permite elegir varias · max: máximo de caracteres · help: letra chica de apoyo
type Question = { key: string; phase: 2 | 3; title: string; note?: string; type: QType; options?: Option[]; art: string; placeholder?: string; max?: number; multi?: boolean; help?: string };
// Lo que nos devuelve la consulta de código postal (ver src/routes/api/public/postal.$postalCode.ts)
type PostalLookup = { postalCode: string; city: string; state: string; neighborhoods: string[]; isCdmx: boolean };

/* ─────────────────────────────────────────────────────────────
   ÍCONOS DIBUJADOS A MANO (estilo voxel, con su sombrita)
   ───────────────────────────────────────────────────────────── */
const iconPaths = {
  person: "M12 7.3a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4zM8.6 8.2h6.8l1.7 5.6-2 .6-.9-2.6-.2 10.2h-1.9l-.5-6.4h-1l-.5 6.4H8.2L8 11.8l-.9 2.6-2-.6z",
  hearts: "M7.8 15.4 2.4 10a3.4 3.4 0 0 1 4.8-4.8l.6.6.6-.6A3.4 3.4 0 0 1 13.2 10zM16.2 21.8 10.8 16.4a3.4 3.4 0 0 1 4.8-4.8l.6.6.6-.6a3.4 3.4 0 0 1 4.8 4.8z",
  dependents: "M8 7.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM4.9 8.2h6.2l1.2 5.3-1.8.5-.6-2.1-.2 10.1H8l-.4-6.1h-.8l-.4 6.1H4.9l-.2-10.1-.6 2.1-1.8-.5zM17.8 12.6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15.4 13.6h4.8l.9 4-1.5.4-.4-1.5-.1 5.5h-1.3l-.3-3.6h-.5l-.3 3.6h-1.3l-.1-5.5-.4 1.5-1.5-.4z",
};

function VoxelIcon({ path, className }: { path: string; className?: string | undefined }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><g opacity=".28" transform="translate(1.7 1.9)"><path d={path}/></g><path d={path}/></svg>;
}

const PersonIcon = ({ className }: { className?: string }) => <VoxelIcon className={className} path={iconPaths.person}/>;
const HeartsIcon = ({ className }: { className?: string }) => <VoxelIcon className={className} path={iconPaths.hearts}/>;
const DependentsIcon = ({ className }: { className?: string }) => <VoxelIcon className={className} path={iconPaths.dependents}/>;
const WomanIcon = ({ className }: { className?: string }) => <GenderIcon className={className} kind="woman"/>;
const ManIcon = ({ className }: { className?: string }) => <GenderIcon className={className} kind="man"/>;
const NonBinaryIcon = ({ className }: { className?: string }) => <GenderIcon className={className} kind="nonbinary"/>;
const PrivateIcon = ({ className }: { className?: string }) => <GenderIcon className={className} kind="private"/>;

function GenderIcon({ kind, className }: { kind: "woman" | "man" | "nonbinary" | "private"; className?: string | undefined }) {
  const shapes = kind === "woman" ? <><circle cx="12" cy="8.2" r="5"/><path d="M12 13.2v8.4M8.6 18h6.8"/></> : kind === "man" ? <><circle cx="9.8" cy="14.2" r="5"/><path d="M13.8 10.2 20.6 3.4M15.6 3.4h5v5"/></> : kind === "nonbinary" ? <><circle cx="12" cy="15" r="4.8"/><path d="M12 10.2V2.6M8.6 5.4h6.8"/></> : <><circle cx="12" cy="12" r="9.2"/><path d="M7.2 12h9.6"/></>;
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><g opacity=".28" transform="translate(1.7 1.9)">{shapes}</g>{shapes}</svg>;
}

function LanguageFlags({ count }: { count: number }) {
  const flags = [
    { colors: ["#00713F", "#FFFFFF", "#C8102E"], mexico: true, label: "México" },
    { colors: ["#0A3161", "#FFFFFF", "#B31942"], label: "Estados Unidos" },
    { colors: ["#0055A4", "#FFFFFF", "#EF4135"], label: "Francia" },
  ].slice(0, count);
  return <div className="language-flags" aria-label={flags.map(flag => flag.label).join(", ")}>{flags.map((flag) => <svg key={flag.label} viewBox="0 0 24 24" aria-hidden="true"><rect x="3.4" y="2.6" width="2" height="18.8" rx="1" fill="currentColor"/><rect x="5.4" y="4" width="4.6" height="7.4" fill={flag.colors[0]}/><rect x="10" y="4" width="4.6" height="7.4" fill={flag.colors[1]}/><rect x="14.6" y="4" width="4.6" height="7.4" fill={flag.colors[2]}/>{flag.mexico && <circle cx="12.3" cy="7.7" r="1.5" fill="#7A4A1E"/>}<rect x="5.4" y="4" width="13.8" height="7.4" fill="none" stroke="currentColor" strokeWidth="1.1"/></svg>)}</div>;
}

function OriginalFace({ index }: { index: number }) {
  const mouths = ["M7.6 16.8q4.4-4 8.8 0", "M7.6 16.2q4.4-2.2 8.8 0", "M7.6 15.6h8.8", "M7.6 15q4.4 2.4 8.8 0", "M7.6 14.4q4.4 4.6 8.8 0"];
  const face = <><circle cx="12" cy="12" r="9.4" fill="none"/><circle cx="8.8" cy="9.8" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.2" cy="9.8" r="1.5" fill="currentColor" stroke="none"/><path d={mouths[index]} fill="none" strokeLinecap="round"/></>;
  return <svg className="original-face" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><g opacity=".26" transform="translate(1.6 1.8)">{face}</g>{face}</svg>;
}

function DependentFamily({ count }: { count: number }) {
  return <div className="dependent-family" aria-hidden="true"><PersonIcon/>{Array.from({ length: count }, (_, child) => <PersonIcon key={child}/>)}</div>;
}

function FinishConfetti() {
  return <div className="finish-confetti" aria-hidden="true">{Array.from({ length: 16 }, (_, piece) => <i key={piece}/>)}</div>;
}

const yesNo: Option[] = [{ label: "Sí", Icon: Check }, { label: "No", Icon: X }];

/* ─────────────────────────────────────────────────────────────
   LAS 21 PREGUNTAS, EN ORDEN
   Si quieres mover, quitar o agregar una pregunta, es aquí y nada más aquí.
   El orden de este arreglo es el orden que ve la persona.
   ───────────────────────────────────────────────────────────── */
const questions: Question[] = [
  { key: "cp", phase: 2, title: "Código Postal", note: "Lugar de residencia. Con tu CP te mostramos tiendas a menos de 45 minutos.", type: "cp", placeholder: "06700", max: 5, art: icons.arrow },
  { key: "col", phase: 2, title: "Colonia", note: "Lugar de residencia. Salen las de tu código postal.", type: "rows", art: icons.cactus },
  { key: "curp", phase: 2, title: "CURP", note: "Son 18 caracteres. Viene en tu acta de nacimiento o tu credencial.", help: "No la compartimos con nadie. Sirve para tu contrato si te quedas.", type: "text", placeholder: "RAML920315MDFMNA04", max: 18, art: icons.disco },
  { key: "gen", phase: 2, title: "Género", type: "tiles", options: [{ label: "Mujer", Icon: WomanIcon }, { label: "Hombre", Icon: ManIcon }, { label: "No binario", Icon: NonBinaryIcon }, { label: "Prefiero no decirlo", Icon: PrivateIcon }], art: icons.duck },
  { key: "edad", phase: 2, title: "Edad", note: "En años cumplidos.", help: "Necesitas 18 años o más para trabajar de temporada.", type: "text", placeholder: "21", max: 2, art: icons.coin },
  { key: "civ", phase: 2, title: "Estado Civil", type: "tiles", options: [{ label: "Soltera / soltero", Icon: PersonIcon }, { label: "Casada / casado", Icon: HeartsIcon }, { label: "Unión libre", Icon: Handshake }, { label: "Otro", Icon: Plus }], art: icons.bee },
  { key: "edu", phase: 2, title: "Nivel educativo", type: "tiles", options: [{ label: "Secundaria", Icon: BookOpen }, { label: "Prepa o bachillerato", Icon: School }, { label: "Carrera técnica", Icon: KeyRound }, { label: "Universidad", Icon: GraduationCap }], art: icons.alien },
  { key: "idi", phase: 2, title: "Número de idiomas hablados", type: "tiles", options: [{ label: "Uno" }, { label: "Dos" }, { label: "Tres o más" }], art: icons.disco },
  { key: "dep", phase: 2, title: "¿Tienes dependientes económicos?", type: "tiles", options: [{ label: "Sí", Icon: DependentsIcon }, { label: "No", Icon: PersonIcon }], art: icons.coin },
  { key: "cui", phase: 2, title: "¿Eres responsable del cuidado de alguien que no puede valerse por completo por sí mismo?", note: "Persona mayor, con discapacidad, etc.", type: "tiles", options: [{ label: "Sí", Icon: Heart }, { label: "No", Icon: UserRound }], art: icons.chicken },
  { key: "com", phase: 2, title: "¿Tienes algún compromiso que pueda chocar con turnos de fin de semana o festivos?", note: "Escuela, otro empleo. Puedes marcar más de uno.", type: "rows", multi: true, options: [{ label: "No tengo", Icon: Check }, { label: "Escuela", Icon: School }, { label: "Otro empleo", Icon: BriefcaseBusiness }, { label: "Cuido a alguien", Icon: Heart }, { label: "Otro", Icon: Plus }], art: icons.crab },
  { key: "tra", phase: 2, title: "¿Cuál es tu medio de transporte principal para llegar?", type: "tiles", options: [{ label: "Caminando", Icon: PersonStanding }, { label: "Transporte público", Icon: Bus }, { label: "Bici o moto", Icon: Bike }, { label: "Auto propio", Icon: Car }], art: icons.computer },
  { key: "emp", phase: 3, title: "¿Cuántos empleos has tenido en el último año?", type: "counter", art: icons.dollar },
  { key: "dur", phase: 3, title: "¿Cuánto duró tu empleo más reciente?", type: "rows", options: [{ label: "Menos de 3 meses", Icon: Clock3 }, { label: "3 a 6 meses", Icon: Clock3 }, { label: "6 a 12 meses", Icon: CalendarDays }, { label: "Más de un año", Icon: Star }, { label: "Es mi primera chamba", Icon: Plus }], art: icons.burger },
  { key: "tem", phase: 3, title: "¿Has trabajado en tiendas de atención directa al público durante la temporada alta?", note: "Buen Fin, Navidad, Hot Sale.", type: "tiles", options: yesNo, art: icons.bomb },
  { key: "e1", phase: 3, title: "¿Qué tan preparado te sientes para trabajar de pie la mayor parte de la jornada?", type: "faces", art: icons.dino },
  { key: "e2", phase: 3, title: "¿Qué tan preparado te sientes para trabajar fines de semana y festivos de diciembre?", type: "faces", art: icons.tv },
  { key: "e3", phase: 3, title: "¿Qué tan preparado te sientes para trabajar en una tienda con muchos clientes a la vez?", type: "faces", art: icons.cactus },
  { key: "e4", phase: 3, title: "¿Qué tan preparado te sientes para trabajar con metas de venta?", type: "faces", art: icons.dollar },
  { key: "pro", phase: 3, title: "¿Estás en otros procesos de selección?", type: "tiles", options: yesNo, art: icons.computer },
  { key: "prob", phase: 3, title: "¿Qué tan probable es que te presentes el primer día si te contratamos hoy?", type: "thermo", art: icons.coin },
];

// Ciudades para el autocompletado cuando el CP no es de la Ciudad de México.
const mexicanCities = [
  "Acapulco, Guerrero", "Aguascalientes, Aguascalientes", "Apodaca, Nuevo León",
  "Campeche, Campeche", "Cancún, Quintana Roo", "Casas Grandes, Chihuahua",
  "Celaya, Guanajuato", "Chetumal, Quintana Roo", "Chihuahua, Chihuahua",
  "Chilpancingo, Guerrero", "Ciudad de México", "Ciudad del Carmen, Campeche",
  "Ciudad Juárez, Chihuahua", "Ciudad Obregón, Sonora", "Ciudad Valles, San Luis Potosí",
  "Ciudad Victoria, Tamaulipas", "Coatzacoalcos, Veracruz", "Colima, Colima",
  "Comitán, Chiapas", "Córdoba, Veracruz", "Cuautla, Morelos",
  "Cuernavaca, Morelos", "Culiacán, Sinaloa", "Delicias, Chihuahua",
  "Durango, Durango", "Ensenada, Baja California", "Fresnillo, Zacatecas",
  "General Escobedo, Nuevo León", "Guadalajara, Jalisco", "Guadalupe, Nuevo León",
  "Guanajuato, Guanajuato", "Guaymas, Sonora", "Hermosillo, Sonora",
  "Iguala, Guerrero", "Irapuato, Guanajuato", "Ixtapaluca, Estado de México",
  "Jiutepec, Morelos", "La Paz, Baja California Sur", "Lázaro Cárdenas, Michoacán",
  "León, Guanajuato", "Los Cabos, Baja California Sur", "Los Mochis, Sinaloa",
  "Manzanillo, Colima", "Matamoros, Tamaulipas", "Mazatlán, Sinaloa",
  "Mérida, Yucatán", "Mexicali, Baja California", "Minatitlán, Veracruz",
  "Monclova, Coahuila", "Monterrey, Nuevo León", "Morelia, Michoacán",
  "Naucalpan, Estado de México", "Nezahualcóyotl, Estado de México", "Nogales, Sonora",
  "Nuevo Laredo, Tamaulipas", "Oaxaca de Juárez, Oaxaca", "Orizaba, Veracruz",
  "Pachuca, Hidalgo", "Piedras Negras, Coahuila", "Playa del Carmen, Quintana Roo",
  "Poza Rica, Veracruz", "Puebla, Puebla", "Puerto Vallarta, Jalisco",
  "Querétaro, Querétaro", "Reynosa, Tamaulipas", "Salamanca, Guanajuato",
  "Saltillo, Coahuila", "San Cristóbal de las Casas, Chiapas", "San Juan del Río, Querétaro",
  "San Luis Potosí, San Luis Potosí", "San Nicolás de los Garza, Nuevo León",
  "San Pedro Garza García, Nuevo León", "Santa Catarina, Nuevo León",
  "Tampico, Tamaulipas", "Tapachula, Chiapas", "Tehuacán, Puebla",
  "Tepic, Nayarit", "Texcoco, Estado de México", "Tijuana, Baja California",
  "Tlaquepaque, Jalisco", "Tlaxcala, Tlaxcala", "Toluca, Estado de México",
  "Tonalá, Jalisco", "Torreón, Coahuila", "Tula, Hidalgo",
  "Tulancingo, Hidalgo", "Tulum, Quintana Roo", "Tuxtla Gutiérrez, Chiapas",
  "Uruapan, Michoacán", "Valle de Bravo, Estado de México", "Veracruz, Veracruz",
  "Villahermosa, Tabasco", "Xalapa, Veracruz", "Zacatecas, Zacatecas",
  "Zamora, Michoacán", "Zapopan, Jalisco", "Zihuatanejo, Guerrero",
];

// Quita acentos y mayúsculas para que "merida" encuentre "Mérida".
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* Saca la edad que esconde la CURP: los caracteres 5 al 10 son la fecha
   de nacimiento en formato AAMMDD (ej. 920315 = 15 de marzo de 1992).
   Regresa null si la CURP todavía no está completa o no se entiende. */
function edadDesdeCurp(curp: string): number | null {
  if (curp.length < 10) return null;
  const yy = Number(curp.slice(4, 6));
  const mm = Number(curp.slice(6, 8));
  const dd = Number(curp.slice(8, 10));
  if (!Number.isFinite(yy) || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const hoy = new Date();
  const siglo = 2000 + yy <= hoy.getFullYear() ? 2000 : 1900;
  const nacimiento = new Date(siglo + yy, mm - 1, dd);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumpleYa = hoy.getMonth() > nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumpleYa) edad -= 1;
  return edad >= 0 && edad < 110 ? edad : null;
}

/* Globo 3D de la pregunta de código postal.
   Primero se muestra una foto (el póster) para que no haya hueco,
   y el globo real se carga aparte; cuando llega, tapa la foto. */
function VoxelGlobe({ cp }: { cp: string }) {
  const host = useRef<HTMLDivElement>(null);
  const poster = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let active = true;
    void loadVoxelGlobe().then((installVoxelGlobe) => {
      if (!active || !installVoxelGlobe) return;
      installVoxelGlobe();
      const element = document.createElement("voxel-globe");
      element.setAttribute("cp", cp);
      host.current?.prepend(element);
      if (poster.current) poster.current.style.opacity = "0";
    });
    return () => {
      active = false;
      host.current?.querySelector("voxel-globe")?.remove();
    };
  }, []);

  useEffect(() => {
    host.current?.querySelector("voxel-globe")?.setAttribute("cp", cp);
  }, [cp]);

  return <div ref={host} className="cp-globe" aria-hidden="true"><img ref={poster} src={globePoster} alt="" className="cp-globe-poster"/></div>;
}

/* ─────────────────────────────────────────────────────────────
   PANTALLA DEL FORMULARIO
   Todo el estado vive aquí: en qué pregunta vas, qué contestaste,
   qué dijo la consulta del CP y si hay que avisarte antes de salir.
   ───────────────────────────────────────────────────────────── */
function Registro() {
  const fase1 = Route.useSearch();                 // nombre, teléfono, correo y folio de la landing
  const [folio, setFolio] = useState(fase1.folio); // id interno que ve el cliente
  const [confirmEmail, setConfirmEmail] = useState(fase1.email); // correo de confirmación del final
  /* Datos de contacto: llegan de la landing o se recuperan al retomar con el enlace del correo. */
  const [contacto, setContacto] = useState({ nombre: fase1.nombre, telefono: fase1.telefono, email: fase1.email });
  const [retomado, setRetomado] = useState(false); // avisamos que seguimos donde se quedó
  const [saving, setSaving] = useState(false);     // guardando en la base
  const [saved, setSaved] = useState(false);       // ya quedó guardado
  const [saveError, setSaveError] = useState("");  // si algo falló al guardar
  const [index, setIndex] = useState(0);          // pregunta actual (0 = la primera)
  const [menuOpen, setMenuOpen] = useState(false); // menú de hamburguesa abierto
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({ emp: 1 }); // respuestas por key
  const [done, setDone] = useState(false);        // terminó el registro (pantalla con confeti)
  const [waiting, setWaiting] = useState(false);  // dejó su ciudad porque aún no llegamos ahí
  const [locked, setLocked] = useState(false);    // candado breve mientras corre la animación
  const [postal, setPostal] = useState<PostalLookup | null>(null);
  const [postalState, setPostalState] = useState<"idle" | "loading" | "found" | "missing" | "error">("idle");
  const [city, setCity] = useState("");           // ciudad escrita a mano
  const [cityOpen, setCityOpen] = useState(true); // sugerencias de ciudad visibles
  const [leaveOpen, setLeaveOpen] = useState(false); // aviso de "¿segura que quieres salir?"
  const [minorAge, setMinorAge] = useState<number | null>(null); // es menor de edad: sale la disculpa
  const panel = useRef<HTMLDivElement>(null);
  const pendingLeave = useRef<(() => void) | null>(null); // a dónde quería ir la persona
  const allowLeave = useRef(false);               // ya confirmó salir, deja pasar
  const started = useRef(false);                  // ya escribió algo: vale la pena protegerlo
  const navigate = useNavigate();

  /* RETOMAR DONDE SE QUEDÓ
     Si alguien entra con el enlace del correo (solo folio, sin nombre),
     buscamos su avance y lo devolvemos a la pregunta donde se salió. */
  const yaRetomamos = useRef(false);
  useEffect(() => {
    if (yaRetomamos.current) return;
    if (!fase1.folio || fase1.nombre) return;
    yaRetomamos.current = true;
    void retomarRegistro({ data: { folio: fase1.folio } })
      .then(reg => {
        if (!reg || reg.completo) return;
        setContacto({ nombre: reg.nombre, telefono: reg.telefono, email: reg.email });
        if (!confirmEmail) setConfirmEmail(reg.email);
        const previas = reg.respuestas as Record<string, string | string[] | number>;
        const limpias = Object.fromEntries(Object.entries(previas).filter(([key]) => !["nombre", "telefono", "email"].includes(key)));
        if (Object.keys(limpias).length > 0) setAnswers(prev => ({ ...prev, ...limpias }));
        const paso = Math.min(Math.max(reg.preguntasRespondidas - 1, 0), questions.length - 1);
        if (paso > 0) setIndex(paso);
        setRetomado(true);
        window.setTimeout(() => setRetomado(false), 6000);
      })
      .catch(() => undefined);
    // solo corre una vez al abrir con el enlace
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase1.folio, fase1.nombre]);
  const hasStarted = Object.keys(answers).some(key => key !== "emp");
  if (hasStarted || index > 0) started.current = true;
  const shouldBlockLeave = useCallback(() => !allowLeave.current && started.current && !done && !waiting, [done, waiting]);
  const leaveBlocker = useBlocker({
    shouldBlockFn: shouldBlockLeave,
    withResolver: true,
    enableBeforeUnload: hasStarted && !done && !waiting,
  });
  const q = questions[index];                    // la pregunta que se está viendo
  if (!q) return null;
  const phase3 = q.phase === 3;
  const selected = answers[q.key];               // respuesta guardada de esta pregunta
  const cp = String(answers["cp"] ?? "");
  const cpValid = postalState === "found" && postal?.isCdmx === true;   // sí hay cobertura
  const cpOutside = postalState === "found" && postal?.isCdmx === false; // existe, pero fuera de CDMX
  const showCityForm = cpOutside || postalState === "missing" || postalState === "error"; // pedimos ciudad a mano
  const apiColonias = postal?.neighborhoods ?? [];
  // Preferimos las colonias que trae la consulta; si no hay, usamos nuestro catálogo local.
  const coloniaLabels = apiColonias.length > 0 ? apiColonias : (heychambaColonias[cp] ?? []);
  const options = q.key === "col" ? [...coloniaLabels, ...(cpValid ? ["Otra"] : [])].map(label => ({ label, Icon: MapPin })) : q.options ?? [];
  const cityMatches = city.trim().length >= 2 ? mexicanCities.filter(item => normalizeSearch(item).includes(normalizeSearch(city))).slice(0, 6) : [];
  const citySuggestions = cityOpen ? cityMatches : [];
  // Antes de sacar a alguien del formulario, primero le preguntamos.
  const requestLeave = (action: () => void) => {
    if (!shouldBlockLeave()) { action(); return; }
    pendingLeave.current = action;
    setMenuOpen(false);
    setLeaveOpen(true);
  };
  const stayOnForm = () => {
    setLeaveOpen(false);
    pendingLeave.current = null;
    leaveBlocker.reset?.();
  };
  const confirmLeave = () => {
    setLeaveOpen(false);
    /* Se va a medias: guardamos su nombre, teléfono y correo con la marca
       de "no terminado", para poder recordarle después que vuelva. */
    if (contacto.nombre || contacto.email || contacto.telefono || folio) {
      void guardarNoTerminado({ data: {
        folio,
        nombre: contacto.nombre,
        telefono: contacto.telefono,
        email: contacto.email,
        preguntasRespondidas: index + 1,
        respuestas: { ...answers, nombre: contacto.nombre, telefono: contacto.telefono, email: contacto.email },
      } }).catch(() => undefined);
    }
    if (pendingLeave.current) {
      const action = pendingLeave.current;
      pendingLeave.current = null;
      allowLeave.current = true;
      action();
      return;
    }
    leaveBlocker.proceed?.();
  };

  // Consulta el CP en nuestra ruta propia y deja lista la ciudad y sus colonias.
  const checkPostalCode = (postalCode: string) => {
    setPostal(null);
    if (!/^\d{5}$/.test(postalCode)) {
      setPostalState("idle");
      return;
    }
    setPostalState("loading");
    void fetch(`/api/public/postal/${postalCode}`)
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Postal lookup failed");
        return await response.json() as PostalLookup;
      })
      .then((result) => {
        setPostal(result);
        setPostalState(result ? "found" : "missing");
        if (result && !result.isCdmx) setCity(result.city);
      })
      .catch(() => setPostalState("error"));
  };

  // Entrada suave de cada pregunta: ligerita en celular, más notoria en escritorio.
  useLayoutEffect(() => {
    if (!panel.current) return;
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    const ctx = gsap.context(() => gsap.fromTo("[data-q-part]", { opacity: 0, y: mobile ? 8 : 14 }, { opacity: 1, y: 0, duration: mobile ? .22 : .34, stagger: mobile ? .018 : .035, ease: "power3.out", clearProps: "transform" }), panel);
    return () => ctx.revert();
  }, [index, done, waiting]);

  // Cambia de pregunta deslizando hacia el lado al que vas.
  const go = (next: number) => {
    if (locked) return;
    setLocked(true);
    if (!panel.current) { setIndex(next); setLocked(false); return; }
    gsap.to(panel.current, { opacity: 0, x: next > index ? -20 : 20, duration: .14, ease: "power2.in", onComplete: () => { setIndex(next); if (panel.current) gsap.set(panel.current, { opacity: 1, x: 0 }); setLocked(false); } });
  };
  /* Antes de avanzar revisamos la edad: si es menor de 18 sale la disculpa
     y no la dejamos seguir (la edad se escribe a mano o se lee de la CURP). */
  const edadEscrita = Number(answers["edad"] ?? 0);
  const edadCurp = edadDesdeCurp(String(answers["curp"] ?? ""));
  // En cuanto la CURP delata que es menor de 18, avisamos desde ahí mismo.
  useEffect(() => {
    if (q.key === "curp" && edadCurp !== null && edadCurp < 18) setMinorAge(edadCurp);
  }, [edadCurp, q.key]);
  const finishOrGo = () => {
    if (q.key === "edad" && edadEscrita > 0 && edadEscrita < 18) { setMinorAge(edadEscrita); return; }
    if (q.key === "curp" && edadCurp !== null && edadCurp < 18) { setMinorAge(edadCurp); return; }
    return index === questions.length - 1 ? setDone(true) : go(index + 1);
  };
  // Guarda una opción. Si la pregunta es de una sola respuesta, avanza solita.
  const choose = (value: string) => {
    if (q.multi) {
      const current = Array.isArray(selected) ? selected : [];
      const next = value === "No tengo" ? (current.includes(value) ? [] : [value]) : (current.includes(value) ? current.filter(v => v !== value) : [...current.filter(v => v !== "No tengo"), value]);
      setAnswers({ ...answers, [q.key]: next });
      return;
    }
    setAnswers({ ...answers, [q.key]: value });
    if (!(q.key === "dep" && value === "Sí")) window.setTimeout(finishOrGo, 80);
  };
  // ¿Ya se puede mostrar el botón "Siguiente"?
  const canContinue = q.type === "counter" || (q.multi && Array.isArray(selected) && selected.length > 0) || (q.key === "dep" && selected === "Sí") || (q.type === "text" && String(selected ?? "").length >= (q.key === "curp" ? 18 : 2)) || (q.type === "cp" && cpValid);
  // Barritas de arriba: la fase 2 son las primeras 12 preguntas y la fase 3 las 9 restantes.
  const progress2 = done || waiting ? 100 : Math.min(100, index / 12 * 100);
  const progress3 = done || waiting ? 100 : index < 12 ? 0 : Math.min(100, (index - 12) / 9 * 100);
  const theme = phase3 || done ? "survey-violet" : "survey-lime"; // fase 3 se pone violeta

  /* Último paso: se guarda todo el perfil pegado al folio de la fase 1. */
  const guardarRegistroFinal = () => {
    setSaving(true);
    setSaveError("");
    void guardarPerfil({ data: {
      folio,
      emailConfirmacion: confirmEmail.trim(),
      codigoPostal: cp,
      colonia: String(answers["col"] ?? ""),
      ciudad: postal?.city ?? city.trim(),
      estado: postal?.state ?? "",
      respuestas: { ...answers, nombre: contacto.nombre, telefono: contacto.telefono, email: contacto.email },
    } })
      .then(res => { setFolio(res.folio); setSaved(true); })
      .catch(() => setSaveError("No pudimos guardar tu registro. Inténtalo otra vez."))
      .finally(() => setSaving(false));
  };

  return <main className={`survey-original ${waiting ? "survey-lime" : theme}`}>
    <div className="survey-grid" aria-hidden="true" />
    {menuOpen && <HeyChambaMenu onClose={() => setMenuOpen(false)} onNavigate={(hash) => requestLeave(() => void navigate({ to: "/", hash }))} />}
    {(leaveOpen || leaveBlocker.status === "blocked") && <div className="leave-dialog-backdrop" role="presentation">
      <div className="leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-dialog-title" aria-describedby="leave-dialog-copy">
        <img src={icons.bee} alt="" className="hc-float"/>
        <span>Hey, ya casi acabas</span>
        <h2 id="leave-dialog-title">¡No te quedes sin chamba!</h2>
        <p id="leave-dialog-copy">¿Estás seguro de que quieres salir? Si te vas ahora, podrías perder el avance de tu perfil.</p>
        <div><Button onClick={stayOnForm} className="leave-stay">Seguir con mi perfil</Button><Button onClick={confirmLeave} className="leave-exit">Sí, quiero salir</Button></div>
      </div>
    </div>}
    {minorAge !== null && <div className="leave-dialog-backdrop" role="presentation">
      <div className="leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="minor-dialog-title" aria-describedby="minor-dialog-copy">
        <img src={icons.duck} alt="" className="hc-float"/>
        <span>Una disculpa</span>
        <h2 id="minor-dialog-title">Todavía no podemos darte chamba</h2>
        <p id="minor-dialog-copy">Vimos que tienes {minorAge} años y en México la ley no permite contratar a menores de edad para este tipo de trabajo. No es que no te queramos: es que todavía no se puede. En cuanto cumplas 18 vuelve por aquí, que tu lugar te lo guardamos.</p>
        <div><Button onClick={() => { setMinorAge(null); allowLeave.current = true; void navigate({ to: "/" }); }} className="leave-stay">Volver al inicio</Button><Button onClick={() => { setMinorAge(null); setAnswers({ ...answers, edad: "", curp: "" }); }} className="leave-exit">Corregir mi dato</Button></div>
      </div>
    </div>}
    <header className="survey-header">
      <Button aria-label="Abrir menú" onClick={() => setMenuOpen(true)} className="hc-menu-button"><span/><span/><span/></Button>
      <Button type="button" onClick={() => requestLeave(() => void navigate({ to: "/" }))} className="survey-logo">HeyChamba</Button>
      <Button type="button" onClick={() => requestLeave(() => void navigate({ to: "/" }))} className="survey-exit">Salir</Button>
    </header>
    <div className="survey-progress-original">
      <div className="survey-progress-label">
        <Button aria-label="Pregunta anterior" onClick={() => done || waiting ? (setDone(false), setWaiting(false)) : go(Math.max(0, index - 1))} className="survey-back"><ChevronLeft /></Button>
        <div><strong>{done || waiting ? "Listo" : phase3 ? "Fase 3 · Tu experiencia" : "Fase 2 · Tu zona y tu situación"}</strong><span>{done || waiting ? "Perfil completo" : `Pregunta ${String(index + 1).padStart(2, "0")} de ${questions.length}`}</span></div>
      </div>
      <div className="survey-bars"><i className="is-complete"/><i><b className="phase-two" style={{ width: `${progress2}%` }}/></i><i><b className="phase-three" style={{ width: `${progress3}%` }}/></i></div>
    </div>

    {retomado && <div className="resume-toast" role="status"><Check/> Le seguimos donde te quedaste. ¡Vamos a terminar tu perfil!</div>}
    <section ref={panel} className="survey-question-panel">
      {done ? <div className="survey-finish" data-q-part>
        <FinishConfetti />
        <div className="finish-icons"><img src={formArt.finishA} alt=""/><img src={formArt.finishB} alt=""/><img src={formArt.finishC} alt=""/></div>
        <h1>{contacto.nombre ? `${contacto.nombre.split(" ")[0]}, tu perfil está listo.` : "Tu perfil está listo."}</h1><p>Nos vemos el 15 de septiembre. Ya nada más falta confirmar tu correo.</p>
        {/* El QR nace apenas se confirma el correo; antes se ve bloqueado. */}
        {saved
          ? <div className="qr-live"><QRCodeCanvas value={`https://heychamba.lovable.app/registro?folio=${encodeURIComponent(folio)}`} size={176} level="M" marginSize={2} bgColor="#ffffff" fgColor="#111111"/><span><Check/> Tu pase está listo</span></div>
          : <div className="qr-placeholder"><div/><span><LockKeyhole/> Bloqueado</span></div>}
        {saved ? <>
          <div className="verify-mail"><Mail/><div><strong>Guardamos tu perfil</strong><span>Te mandamos la confirmación a {confirmEmail}.</span></div></div>
          <div className="folio-card"><span>Tu ID de registro</span><strong>{folio}</strong><small>Con este ID te identificamos en HeyChamba. Guárdalo.</small></div>
        </> : <>
          <div className="verify-mail"><Mail/><div><strong>Confirma tu correo para liberar tu QR</strong><span>Te mandamos un enlace. Ábrelo y tu pase se desbloquea al instante.</span></div></div>
          <input type="email" value={confirmEmail} onChange={event => setConfirmEmail(event.target.value)} placeholder="tu@correo.com" className="survey-input" autoComplete="email"/>
          {saveError && <span className="cp-error">{saveError}</span>}
          <Button disabled={saving || !/.+@.+\..+/.test(confirmEmail)} onClick={guardarRegistroFinal} className="survey-next">{saving ? "Guardando…" : "Confirmar mi correo"}</Button>
        </>}
        <Button onClick={() => { setIndex(0); setDone(false); setSaved(false); setAnswers({ emp: 1 }); }} className="survey-reset">Volver a empezar</Button>
      </div> : waiting ? <div className="survey-waiting" data-q-part><img src={formArt.waiting} alt=""/><h1>¡Gracias!</h1><p>Guardamos {city.trim() ? `tu ciudad (${city.trim()})` : "tu ciudad"}. En cuanto HeyChamba llegue ahí, nos ponemos en contacto contigo.</p><Link to="/" className="survey-next"><Globe/> Volver al inicio</Link><Button onClick={() => { setIndex(0); setWaiting(false); setPostal(null); setPostalState("idle"); setCity(""); setAnswers({ emp: 1 }); }} className="survey-reset">Volver a empezar</Button></div> : <>
        <div className="survey-question-heading" data-q-part><div><h1>{q.title}</h1>{q.note && <p>{q.note}</p>}</div><img src={q.art} alt="" className="hc-float"/></div>
        {q.type === "cp" && <div className="cp-area" data-q-part><VoxelGlobe cp={cp}/><input autoFocus inputMode="numeric" maxLength={5} value={cp} onInput={event => { const nextCp = event.currentTarget.value.replace(/\D/g, ""); if (nextCp) started.current = true; setAnswers({ ...answers, cp: nextCp, col: "" }); checkPostalCode(nextCp); }} onChange={() => undefined} placeholder={q.placeholder}/>{postalState === "loading" && <div className="cp-lookup"><span/> Consultando código postal…</div>}{cpValid && <div className="cp-status"><MapPin/> {postal.city} · {cp}</div>}{postalState === "missing" && <div className="cp-error">No encontramos ese código postal. Revísalo o dinos de dónde eres.</div>}{postalState === "error" && <div className="cp-error">No pudimos consultar el código postal. Revísalo o dinos de dónde eres.</div>}{showCityForm && <div className="cp-outside"><strong>HeyChamba aún no está en tu ciudad.</strong><span>Dinos de dónde eres y nos ponemos en contacto contigo.</span><div className="city-autocomplete"><input value={city} onChange={event => { setCity(event.target.value); setCityOpen(true); }} onClick={() => setCityOpen(false)} onBlur={() => window.setTimeout(() => setCityOpen(false), 120)} placeholder="Escribe tu ciudad" autoComplete="off" role="combobox" aria-expanded={citySuggestions.length > 0}/>{citySuggestions.length > 0 && <div className="city-suggestions" role="listbox">{citySuggestions.map(suggestion => <Button key={suggestion} type="button" role="option" onClick={() => { setCity(suggestion); setCityOpen(false); }}><MapPin/><span>{suggestion}</span></Button>)}</div>}</div><Button disabled={city.trim().length < 2} onClick={() => { void guardarEspera({ data: { folio, ciudad: city.trim(), codigoPostal: cp } }).then(res => setFolio(res.folio)).catch(() => undefined); setWaiting(true); }} className="survey-next">Avísenme cuando lleguen</Button></div>}</div>}
        {q.type === "text" && <><input data-q-part autoFocus inputMode={q.key === "edad" ? "numeric" : "text"} maxLength={q.max} value={String(selected ?? "")} onChange={e => setAnswers({ ...answers, [q.key]: q.key === "curp" ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") : e.target.value.replace(q.key === "edad" ? /\D/g : /$^/, "") })} placeholder={q.placeholder} className="survey-input"/>{q.help && <span className="survey-help" data-q-part>{q.help}</span>}</>}
        {(q.type === "rows" || q.type === "tiles") && <div data-q-part className={q.type === "rows" ? "survey-rows" : `survey-tiles survey-tiles-${q.key}`}>{q.key === "col" && options.length === 0 ? <div className="cp-error">Regresa y verifica tu código postal para consultar sus colonias.</div> : options.map(({ label, Icon }, optionIndex) => { const active = Array.isArray(selected) ? selected.includes(label) : selected === label; return <Button key={label} onClick={() => choose(label)} disabled={q.key === "col" && !cpValid} className={`survey-option ${active ? "is-active" : ""}`}>{q.key === "idi" ? <LanguageFlags count={optionIndex + 1}/> : q.key === "dep" && label === "Sí" ? <DependentFamily count={selected === "Sí" ? Number(answers["depNum"] ?? 1) : 1}/> : Icon ? <Icon/> : null}<span>{label}</span></Button>; })}</div>}
        {q.type === "faces" && <div data-q-part><div className="survey-faces">{[1,2,3,4,5].map((n) => <Button key={n} onClick={() => choose(String(n))} className={`face-option ${selected === String(n) ? "is-active" : ""}`}><OriginalFace index={n - 1}/><b>{n}</b></Button>)}</div><div className="scale-labels"><span>Nada preparado</span><span>Muy preparado</span></div></div>}
        {q.type === "thermo" && <div data-q-part><span className="scale-caption">Poco probable</span><div className="survey-thermo">{Array.from({ length: 10 }, (_, i) => String(i + 1)).map(n => <Button key={n} onClick={() => choose(n)} className={`thermo-option ${selected === n ? "is-active" : ""}`}>{n}</Button>)}</div><span className="scale-caption align-right">Segurísimo</span></div>}
        {q.type === "counter" && <div data-q-part className="survey-counter"><div><Button aria-label="Menos" onClick={() => setAnswers({ ...answers, emp: Math.max(0, Number(selected) - 1) })}><Minus/></Button><strong>{Number(selected)}</strong><Button aria-label="Más" onClick={() => setAnswers({ ...answers, emp: Math.min(10, Number(selected) + 1) })}><Plus/></Button></div><div className="briefcases">{Array.from({ length: Math.min(Number(selected), 6) }, (_, i) => <BriefcaseBusiness key={i}/>)}</div><span>{Number(selected) === 0 ? "Es mi primera chamba" : `${selected} empleo${Number(selected) === 1 ? "" : "s"} en el último año`}</span></div>}
        {q.key === "dep" && selected === "Sí" && <div className="dependent-counter" data-q-part><span>¿Cuántas personas?</span><div><Button aria-label="Menos" onClick={() => setAnswers({ ...answers, depNum: Math.max(1, Number(answers["depNum"] ?? 1) - 1) })}><Minus/></Button><strong>{Number(answers["depNum"] ?? 1)}</strong><Button aria-label="Más" onClick={() => setAnswers({ ...answers, depNum: Math.min(9, Number(answers["depNum"] ?? 1) + 1) })}><Plus/></Button></div></div>}
        {canContinue && <Button data-q-part onClick={finishOrGo} className="survey-next">{q.type === "counter" ? "Continuar" : "Siguiente"}<ArrowLeft className="rotate-180"/></Button>}
      </>}
    </section>
  </main>;
}
