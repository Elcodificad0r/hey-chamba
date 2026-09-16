import { createFileRoute } from "@tanstack/react-router";
import HeyChambaLanding from "@/components/HeyChambaLanding";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HeyChamba — Festival virtual de empleo" },
    { name: "description", content: "Encuentra chamba de temporada cerca de casa en el festival virtual HeyChamba." },
    { property: "og:title", content: "HeyChamba — Festival virtual de empleo" },
    { property: "og:description", content: "Regístrate, encuentra vacantes cercanas y participa en el festival virtual de empleo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Home,
});

function Home() {
  return <HeyChambaLanding />;
}
