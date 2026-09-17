# Pendientes HeyChamba

- [x] Aviso con voz de marca si la persona es menor de 18 (por edad escrita y por CURP): explica que en México no se puede contratar a menores.
- [x] QR real que se genera solo al confirmar el correo.
- [x] Guardar nombre, teléfono y correo cuando alguien sale sin terminar (estatus "no terminado").
- [x] Retomar el registro con el enlace `/registro?folio=...`: recupera contacto y respuestas y regresa a la pregunta donde se quedó.
- [x] El registro se guarda solo al terminar las preguntas, sin esperar a la confirmación del correo.
- [x] Confirmación de correo aparte del guardado: columnas `correo_confirmado` y `qr_emitido`, enlace `/confirmar?token=...` y el QR real que se libera al abrirlo.
- [ ] Enviar el correo recordatorio "No te quedes sin chamba, termina tu perfil" con ese enlace.
      La plantilla ya está en `src/lib/correo.server.ts`; falta configurar el dominio de correo
      (RESEND_API_KEY y CORREO_REMITENTE) y el trabajo que lo dispara.
- [x] El correo de confirmación sale solo al terminar el registro.
- [x] QR seguro: el token del pase nace al confirmar el correo y el QR apunta a `/pase?p=<token>`.
      Adivinar el folio ya no sirve de nada.
- [x] Botón para llevarse el QR (PNG, y "Guardar en Fotos" en iPhone).
- [ ] Usar el QR para el acceso al festival virtual / tomar asistencia: el pase vive en `/pase?p=...`
      y ya sabe si la persona confirmó; falta la parte de marcar la asistencia.
- [ ] Pase en Apple Wallet (.pkpass): necesita una cuenta de Apple Developer y un
      certificado Pass Type ID. Sin eso no se puede firmar el pase.
