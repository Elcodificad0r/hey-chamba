[2026-09-16 16:35] [ASSET] public/__l5e/ — copiada carpeta de assets del CDN mirror
  ORIGEN:  ../heychamba-imagenes-tipografias/cdn-mirror/__l5e
  DESTINO: public/__l5e/assets-v1/<id>/<archivo>
  ANTES:   public/ solo contenia favicon.ico y robots.txt (0 assets)
  DESPUES: 53 archivos / 55 carpetas / 6.1M
           24 png, 15 webp, 9 otf (Satoshi x4, SuncoastHUM x5), 5 jpg
  VERIFICACION: diff -r origen destino => identicos byte a byte
                curl localhost:8080 => 200 en .otf, .webp y .png
  BUILD:   npm run dev => VITE v8.1.5 ready in 702 ms, sin errores
  REVERTIR: rm -rf "public/__l5e"   (no se toco ningun archivo de codigo)
