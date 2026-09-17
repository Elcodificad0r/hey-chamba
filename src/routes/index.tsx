import { createFileRoute } from "@tanstack/react-router";
import HeyChambaLanding from "@/components/HeyChambaLanding";
import { datosEstructurados, meta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...meta({
      /* El título es lo que se ve en Google: primero lo que la persona busca
         ("trabajo de temporada", "CDMX"), y la marca al final. 60 caracteres
         es donde Google empieza a recortar. */
      titulo: "Trabajo de temporada en CDMX sin CV — HeyChamba",
      descripcion: "Chamba de temporada cerca de tu casa. Regístrate sin CV y te decimos qué tiendas contratan a menos de 45 minutos de tu colonia para Buen Fin, Hot Sale y Navidad.",
      ruta: "/",
    }),
    /* Datos estructurados: le dicen a Google que somos una organización
       mexicana, con sus redes y su zona de servicio. */
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify(datosEstructurados()),
    }],
  }),
  component: Home,
});

function Home() {
  return <HeyChambaLanding />;
}
