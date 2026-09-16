# HeyChamba — guía del proyecto

Esta es la explicación "en español y sin tecnicismos raros" de cómo está armado
el proyecto: qué hace cada archivo, cuáles son las variables importantes y qué
falta si algún día quieres guardar los registros en una base de datos.

---

## 1. ¿Qué es la app?

Dos pantallas, nada más:

| Ruta        | Qué es                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| `/`         | La landing: secciones con scroll, íconos flotando, menú y el botón que manda al registro. |
| `/registro` | El formulario de 21 preguntas (fase 2 y fase 3), con globo 3D, confeti y pantallas finales. |

Además hay una ruta "de servicio" que no se ve:

| Ruta                            | Qué hace                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| `/api/public/postal/<CP>`       | Consulta el código postal y regresa ciudad, estado y colonias reales.  |

---

## 2. Mapa de archivos

```
src/
├─ routes/
│  ├─ index.tsx                → monta la landing
│  ├─ registro.tsx             → TODO el formulario (preguntas, animaciones, pantallas finales)
│  ├─ __root.tsx               → el "cascarón" común: tipografías, idioma, metadatos
│  └─ api/public/postal.$postalCode.ts → la consulta de códigos postales
├─ components/
│  ├─ HeyChambaLanding.jsx     → la landing completa
│  └─ HeyChambaMenu.tsx        → el menú de hamburguesa (el mismo en landing y formulario)
├─ lib/
│  ├─ heychamba-assets.ts      → todas las fotos e íconos con nombre corto
│  ├─ heychamba-colonias.ts    → catálogo local de colonias por CP (plan B)
│  ├─ globe-loader.ts          → carga el globo 3D una sola vez y sin frenar la página
│  └─ globe-voxel.js           → el globo 3D en sí (elemento <voxel-globe>)
├─ assets/heychamba/           → tipografías, fotos, íconos e ilustraciones del ZIP original
└─ styles.css                  → colores, tipografías y todos los estilos propios
```

---

## 3. Las variables que de verdad importan

### En `src/routes/registro.tsx`

**El contenido**

- `questions` → **el arreglo con las 21 preguntas**. Si quieres cambiar el texto,
  el orden, los íconos o agregar una pregunta nueva, es el único lugar que tocas.
  Cada pregunta trae:
  - `key`: el nombre corto con el que se guarda la respuesta (`cp`, `curp`, `edad`, …).
  - `phase`: `2` (tu zona y situación) o `3` (tu experiencia). Define el color de la pantalla.
  - `type`: cómo se dibuja → `cp` (globo + código postal), `text` (escribir),
    `rows` (lista larga), `tiles` (mosaicos), `faces` (caritas del 1 al 5),
    `counter` (sumar/restar) y `thermo` (escala del 1 al 10).
  - `multi: true`: deja elegir varias opciones.
  - `art`: la ilustración que flota junto al título.
  - `note` y `help`: textos de apoyo.
- `mexicanCities` → la lista de ciudades del autocompletado (para quien no vive en CDMX).
- `iconPaths` → los dibujos hechos a mano (persona, corazones, dependientes).

**El estado (lo que va cambiando mientras la persona contesta)**

| Variable      | Para qué sirve                                                            |
| ------------- | ------------------------------------------------------------------------- |
| `index`       | En qué pregunta va (empieza en 0).                                        |
| `answers`     | Todas las respuestas juntas, guardadas por `key`.                         |
| `done`        | Ya terminó: sale la pantalla de perfil listo con confeti.                  |
| `waiting`     | Dejó su ciudad porque HeyChamba todavía no llega ahí.                      |
| `postal`      | Lo que contestó la consulta del CP (ciudad, estado, colonias).            |
| `postalState` | En qué va la consulta: `idle`, `loading`, `found`, `missing` o `error`.    |
| `city`        | La ciudad que escribió a mano.                                            |
| `cityOpen`    | Si se ven las sugerencias de ciudad.                                      |
| `leaveOpen`   | Si está abierto el aviso de "¿segura que quieres salir?".                  |
| `locked`      | Candadito de un instante para que no se brinquen preguntas a doble clic.   |

**Los cálculos**

- `cpValid` → el CP existe **y** es de la Ciudad de México: se puede seguir.
- `cpOutside` → el CP existe pero es de otra ciudad.
- `showCityForm` → se muestra el mensaje de "aún no estamos en tu ciudad".
- `coloniaLabels` → colonias de la consulta; si no llegan, las del catálogo local.
- `canContinue` → si ya se puede mostrar el botón *Siguiente*.
- `progress2` / `progress3` → las barritas de arriba. Fase 2 = primeras 12 preguntas,
  fase 3 = las 9 restantes. Al terminar (o al dejar tu ciudad) se llenan al 100 %.
- `theme` → `survey-lime` (verde) en fase 2 y `survey-violet` (violeta) en fase 3.

**El aviso de salida**

`started` recuerda que ya escribiste algo; desde ahí, cualquier intento de salir
(menú, logo, botón Salir, refrescar o el botón de atrás) pasa primero por
`requestLeave`, que abre el aviso de marca. `confirmLeave` deja ir y `stayOnForm` te regresa.

### En `src/styles.css`

Los colores y tipografías viven arriba, como variables, para no repetir valores:

- `--ink` → el negro de los bordes y textos.
- `--lime` → el verde de la marca.
- `--violet` → el violeta de la fase 3.
- `--paper` → el fondo claro.
- `--font-title` → **Suncoast HUM**, para todos los títulos.
- `--font-body` → **Satoshi**, para el resto del texto.

Si quieres cambiar la paleta, cambias esas variables y toda la app se acomoda.

### En `src/lib/heychamba-assets.ts`

- `photos` → las fotos de la landing.
- `icons` → los íconos grandes (abeja, alien, pacman, rayo…).
- `formIcons` → los mismos íconos en versión ligera para el formulario.
- `formArt` → las ilustraciones finales (`finishA/B/C`) y la de espera (`waiting`).

---

## 4. Cómo se ve rápido en celular y bonito en escritorio

- Las animaciones (GSAP) son cortitas en móvil y más marcadas en escritorio;
  el corte está en 820 px de ancho.
- El globo 3D primero muestra una foto y el modelo real se carga aparte, así la
  pregunta del código postal aparece de inmediato.
- La landing precarga el globo en tiempo muerto, para que al llegar al formulario ya esté listo.

---

## 5. Lo que falta si quieres guardar los registros

Hoy las respuestas viven solo en la pantalla: al terminar se muestran las
pantallas finales, pero nada se guarda en ninguna parte. El proyecto ya tiene la
base de datos incluida encendida y lista, así que el paso pendiente es solo uno:

1. Crear la tabla de registros (por ejemplo `registros`), con una columna por
   respuesta importante y sus permisos.
2. Mandar `answers` (más `city` cuando aplique) al terminar, en el momento en que
   se pone `done` o `waiting` en verdadero, dentro de `src/routes/registro.tsx`.
3. Si además quieres verlo como CRM, una pantalla privada que liste esos registros.

**No necesito que me pases nada** para eso: la base de datos del proyecto ya está
conectada. Solo dime dos cosas:

- ¿Quieres pedir **correo y/o teléfono** al final? Ahora mismo no se piden, y sin
  eso no hay forma de contactar a quien se registra.
- ¿Los registros los revisas **aquí dentro** (una pantalla de administrador con
  contraseña) o los quieres mandar a un CRM de fuera (HubSpot, Airtable, Notion)?
  Si es de fuera, ahí sí necesitaría la clave de ese servicio.

Si en cambio quieres usar **tu propia cuenta de base de datos** en lugar de la
incluida, eso se conecta desde los ajustes del proyecto iniciando sesión con tu
cuenta; no hace falta que me pegues llaves. Ojo: al cambiar, las tablas se crean
de nuevo del otro lado.

## Cómo se guardan los registros

Hay una sola tabla, `registros`, y cada persona vive en un solo renglón:

| Campo | Qué guarda |
| --- | --- |
| `folio` | El **ID interno**: la fecha y hora del registro en hora de la Ciudad de México (tipo `25/8/2026 12:49:28`). Se genera solo, no se repite y es lo que el cliente usa para identificar a cada persona. |
| `nombre`, `telefono`, `email` | Lo que se llena en la landing (fase 1). |
| `email_confirmacion` | El correo que confirma al final del formulario. |
| `codigo_postal`, `colonia`, `ciudad`, `estado` | Su zona. |
| `fuera_de_cobertura` | `true` si dejó su ciudad porque HeyChamba aún no llega ahí. |
| `estatus` | `fase1` (solo dejó sus datos), `completo` (terminó las 21 preguntas) o `espera` (lista de espera). |
| `respuestas` | Todas las respuestas del formulario, tal cual. |

El flujo es así:

1. En la landing la persona deja **nombre, teléfono y correo** → se guarda y nace su folio.
2. Se pasa al formulario con esos datos (van en la dirección: `folio`, `nombre`, `telefono`, `email`), así que ya no se le vuelve a preguntar.
3. Al final solo se le pide **confirmar su correo** (viene ya escrito el de la fase 1) y con eso se completa su renglón y se le muestra su ID.
4. Si su código postal está fuera de cobertura, se guarda su ciudad en la lista de espera con el mismo folio.

Todo el guardado vive en `src/lib/registros.functions.ts` (`guardarFase1`, `guardarPerfil`, `guardarEspera`). Nadie puede leer estos datos desde el navegador: solo el sitio por dentro.
