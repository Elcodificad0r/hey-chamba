import { createFileRoute } from "@tanstack/react-router";

type ZippopotamPlace = {
  "place name"?: string;
  state?: string;
  "state abbreviation"?: string;
};

type ZippopotamResponse = {
  "post code"?: string;
  places?: ZippopotamPlace[];
};

export const Route = createFileRoute("/api/public/postal/$postalCode")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const postalCode = params.postalCode.replace(/\D/g, "").slice(0, 5);
        if (!/^\d{5}$/.test(postalCode)) {
          return Response.json({ error: "Código postal inválido" }, { status: 400 });
        }

        const response = await fetch(`https://api.zippopotam.us/MX/${postalCode}`, {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "application/json" },
        });
        if (response.status === 404) return Response.json(null, { status: 404 });
        if (!response.ok) return Response.json({ error: "Consulta postal no disponible" }, { status: 502 });

        const payload = await response.json() as ZippopotamResponse;
        const places = payload.places ?? [];
        const first = places[0];
        if (!first) return Response.json(null, { status: 404 });
        const neighborhoods = [...new Set(places.map((place) => place["place name"]?.trim()).filter((name): name is string => Boolean(name)))];
        const state = first.state?.trim() ?? "México";
        const normalizedState = state.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const isCdmx = first["state abbreviation"] === "DIF" || normalizedState.includes("distrito federal") || normalizedState.includes("ciudad de mexico");

        return Response.json(
          { postalCode: payload["post code"] ?? postalCode, city: isCdmx ? "Ciudad de México" : state, state, neighborhoods, isCdmx },
          { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
        );
      },
    },
  },
});