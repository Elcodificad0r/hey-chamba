import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "HeyChamba" },
      { name: "theme-color", content: "#C4E539" },
      /* El título, la descripción, las og: y la canónica las pone cada
         ruta con `meta()` de src/lib/seo.ts. Aquí solo va lo que no cambia. */
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      /* El .ico trae 16/32/48 px para las pestañas; el resto es para
         iPhone (pantalla de inicio) y Android. Sin la versión cuadrada
         los navegadores ignoraban el ícono y ponían el suyo. */
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/* Google Tag Manager. El contenedor va en el shell y no en `head()` de la
   ruta porque GTM pide estar lo más arriba posible del <head>, y ahí sí
   controlamos el orden exacto. Para cambiarlo o apagarlo, esta constante:
   si queda vacía no se inyecta nada. */
const GTM_ID = "GTM-PT8CKX4Z";

const GTM_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* GTM primero, como pide Google. */}
        {GTM_ID && <script dangerouslySetInnerHTML={{ __html: GTM_SCRIPT }} />}
        <HeadContent />
      </head>
      <body>
        {/* El respaldo para quien navega sin JavaScript. */}
        {GTM_ID && <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0" width="0" style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>}
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  /* Tapamos el clic derecho sobre las imágenes ("Guardar imagen como…").
     Es un estorbo, no un candado: quien quiera bajarlas puede tomar
     captura o abrir la pestaña de red. El canvas del QR se deja en paz
     porque ahí sí queremos que la persona se lleve su pase. */
  useEffect(() => {
    const bloquearMenu = (evento: MouseEvent) => {
      if (evento.target instanceof HTMLImageElement) evento.preventDefault();
    };
    document.addEventListener("contextmenu", bloquearMenu);
    return () => document.removeEventListener("contextmenu", bloquearMenu);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
