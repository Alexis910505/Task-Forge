# Entrar con Microsoft e invitaciones

Con esto, las personas de la empresa entran a Task Forge con **el mismo usuario y contraseña de Microsoft que usan en su computadora del trabajo**. Task Forge nunca ve ni guarda esa contraseña: la comprueba Microsoft, y Task Forge solo recibe la confirmación de quién es la persona.

Mientras no se configure, todo sigue funcionando con correo y contraseña. El botón «Entrar con Microsoft» aparece solo cuando la configuración está hecha.

## Cómo se da de alta a una persona

1. En **Usuarios → Agregar usuario**, el encargado escribe el correo de la empresa, el nombre y el rol, y deja marcada **«Enviar invitación»**.
2. Task Forge genera un enlace de un solo uso, válido 7 días:
   - Si el envío de correos está configurado, se manda solo al correo de la persona.
   - Si no, aparece en pantalla para **copiarlo o mandarlo por WhatsApp**.
3. La persona abre el enlace y pulsa **«Entrar con Microsoft»**. Si no usa Microsoft, puede crear una contraseña.
4. Desde entonces solo pulsa «Entrar con Microsoft», en la web o en la app.

También funciona sin el enlace. Si el correo ya está dado de alta, la persona puede ir directamente a la página de inicio y pulsar «Entrar con Microsoft»: el sistema la reconoce por su correo.

Para reenviar una invitación (por ejemplo, porque caducó), usa el botón del sobre ✉ en la fila de la persona. El enlace anterior deja de valer.

## Activar «Entrar con Microsoft» (una vez, unos 10 minutos)

Hace falta registrar Task Forge en el Microsoft de la empresa (Microsoft Entra ID). Es gratis y ya está incluido en Microsoft 365.

> **¿Quién puede hacerlo?** Por defecto, cualquier empleado puede registrar aplicaciones con su cuenta del trabajo. Si la empresa lo tiene bloqueado, o si al entrar aparece «Necesita aprobación del administrador», hace falta que alguien de TI apruebe la app una vez (ver el paso 6).

1. Entra en <https://entra.microsoft.com> con tu cuenta del trabajo.
2. Ve a **Aplicaciones → Registros de aplicaciones → Nuevo registro**:
   - **Nombre:** `Task Forge`
   - **Tipos de cuenta admitidos:**
     - Para la empresa: **«Solo las cuentas de este directorio organizativo»**.
     - Para una demostración con cualquier cuenta: «Cuentas de cualquier directorio organizativo y cuentas personales de Microsoft».
   - **URI de redirección:** plataforma **Web**, `https://taskforge-api-rolx.onrender.com/auth/microsoft/callback`
3. En **Información general**, copia:
   - **Id. de aplicación (cliente)** → será `MS_CLIENT_ID`
   - **Id. de directorio (inquilino)** → será `MS_TENANT` si elegiste «Solo este directorio»
4. En **Certificados y secretos → Nuevo secreto de cliente**, ponle una duración (máximo 24 meses) y copia el **Valor**, no el «Id. de secreto». Será `MS_CLIENT_SECRET`.
   - Apunta la fecha de caducidad: antes de que llegue hay que crear uno nuevo y cambiarlo en Render.
5. En Render, abre `taskforge-api` → **Environment** y pon:

   | Variable | Valor |
   | --- | --- |
   | `MS_CLIENT_ID` | El id. de aplicación |
   | `MS_CLIENT_SECRET` | El valor del secreto |
   | `MS_TENANT` | El id. de directorio de la empresa (o `common` para la demostración) |
   | `MS_ALLOWED_TENANTS` | *(Opcional)* El id. de directorio, para aceptar solo cuentas de la empresa |

   Guarda: Render reinicia la API y el botón aparece en la web y en la app.
6. *(Solo si hace falta)* Si al entrar aparece «Necesita aprobación del administrador», alguien de TI debe ir a **Permisos de API → Conceder consentimiento de administrador** en ese mismo registro. Se hace una sola vez.

Para probar en local, registra además `http://localhost:3000/auth/microsoft/callback` como URI de redirección y define las mismas variables en `backend/.env`.

## Activar el envío de correos (opcional)

El plan gratis de Render no permite enviar correo por SMTP, así que se usa la API de **Brevo**, que es gratis hasta 300 correos al día.

1. Crea una cuenta gratis en <https://www.brevo.com>.
2. En **Remitentes**, agrega y verifica el correo desde el que saldrán las invitaciones.
3. En **SMTP y API → Claves API**, crea una clave.
4. En Render, pon `BREVO_API_KEY` (la clave) y `MAIL_FROM_EMAIL` (el remitente verificado). Opcional: `MAIL_FROM_NAME`.

Sin esto, las invitaciones funcionan igual: el enlace se copia y se manda a mano.

## Seguridad

- Solo pueden entrar personas que el encargado dio de alta. Una cuenta de Microsoft cuyo correo no está en Task Forge recibe «no está dada de alta».
- Cada usuario queda vinculado a **su** cuenta de Microsoft: otra cuenta con el mismo correo es rechazada.
- Si la empresa desactiva a alguien en Microsoft, esa persona deja de poder entrar con Microsoft. Para quitarle el acceso del todo, desactívala también en Task Forge.
- Los enlaces de invitación valen 7 días y una sola vez.
