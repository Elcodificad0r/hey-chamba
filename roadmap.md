# Pendientes HeyChamba

- [x] Aviso con voz de marca si la persona es menor de 18 (por edad escrita y por CURP): explica que en México no se puede contratar a menores.
- [x] QR real que se genera solo al confirmar el correo.
- [x] Guardar nombre, teléfono y correo cuando alguien sale sin terminar (estatus "no terminado").
- [x] Retomar el registro con el enlace `/registro?folio=...&k=...`: recupera contacto y respuestas y regresa a la pregunta donde se quedó.
- [x] El registro se guarda solo al terminar las preguntas, sin esperar a la confirmación del correo.
- [x] Confirmación de correo aparte del guardado: columnas `correo_confirmado` y `qr_emitido`, enlace `/confirmar?token=...` y el QR real que se libera al abrirlo.
- [x] Correo recordatorio "No te quedes sin chamba": `enviarRecordatorio` manda el enlace
      `/registro?folio=...&k=...` que regresa a la persona donde se quedó.
- [x] El enlace de retomar lleva llave: `retomarRegistro` ya no entrega nada con el folio solo.
      La clave nace en la fase 1 y no cambia, para que los enlaces ya enviados sigan sirviendo.
- [ ] Disparar el recordatorio solo: falta el trabajo programado que recorra los
      `estatus = 'no_terminado'` y llame a `enviarRecordatorio`.
- [x] El correo de confirmación sale solo al terminar el registro.
- [x] QR seguro: el token del pase nace al confirmar el correo y el QR apunta a `/pase?p=<token>`.
      Adivinar el folio ya no sirve de nada.
- [x] Botón para llevarse el QR (PNG, y "Guardar en Fotos" en iPhone).
- [x] Asistencia del festival: tabla `asistencias` y pantalla `/checkin` para el equipo en la puerta.
      Lee el QR con la cámara y registra la entrada. Cada pase sirve una sola vez:
      el segundo escaneo se rechaza en rojo y queda el intento guardado.
      La identidad la coteja el equipo con una identificación; el nombre sale en grande.
      La protege `CODIGO_STAFF`; hay que ponerla también en Vercel.
- [ ] Pase en Apple Wallet (.pkpass). Bloqueado por los certificados de Apple:
      hace falta Apple Developer Program, un Pass Type ID con su llave privada
      y el certificado WWDR. Con eso en mano el resto es de este lado.
- [ ] El QR como llave del stream: /pase?p=<token> ya es una página nuestra,
      así que el día del festival puede mostrar el botón de entrar al stream
      sin cambiarle el QR a nadie.
