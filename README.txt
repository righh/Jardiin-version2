# Jardín 3D + Firebase Firestore

## Estructura

- `index.html`: estructura del sitio y Three.js.
- `css/style.css`: estilos originales extraídos del HTML y estilos del aviso de privacidad.
- `js/jardin.js`: JavaScript original del jardín, sin modificar su lógica.
- `js/firebase.js`: conexión a Firebase y registro de visitas con consentimiento.
- `firestore.rules`: reglas sugeridas para la colección `visitas`.

## 1. Configurar Firestore

1. Abre https://console.firebase.google.com/
2. Selecciona el proyecto `jardin-385dd`.
3. Entra en **Firestore Database** y crea la base de datos.
4. Abre la pestaña **Reglas**.
5. Copia el contenido de `firestore.rules` y publícalo.
6. La colección `visitas` se creará automáticamente al llegar el primer registro.

## 2. Publicar en GitHub Pages

Sube la carpeta y sus subcarpetas conservando exactamente los nombres:
`index.html`, `css/style.css`, `js/jardin.js` y `js/firebase.js`.

En GitHub: Settings → Pages → selecciona la rama `main` y la carpeta `/ (root)`.

La ruta relativa de los archivos permite que funcione también en una URL de proyecto de GitHub Pages.

## 3. Prueba

Abre la página publicada, acepta las estadísticas y revisa Firestore → Data → `visitas`.
Si rechazas, no se ejecuta la escritura. El botón «Privacidad» permite volver a abrir el aviso y cambiar la decisión.

## 4. Seguridad adicional recomendada

- Configura Firebase App Check para tu aplicación web y activa la aplicación gradual de protección para Cloud Firestore después de probarla.
- Restringe la API key de Firebase por HTTP referrers (los dominios de tu GitHub Pages) y por las APIs que usa tu aplicación.
- Revisa periódicamente el uso y las cuotas de Firestore.
- No habilites lectura pública de la colección `visitas`.
- La configuración web de Firebase y su API key son visibles en el navegador; la seguridad real depende de las reglas, App Check y la configuración del proyecto.

## 5. Privacidad y cumplimiento

El aviso incluido es una base técnica, no sustituye un aviso de privacidad legal completo. Antes de publicar, completa la identidad y datos de contacto del responsable, finalidades, plazo de conservación, transferencias/proveedores, procedimiento para ejercer derechos aplicables y cualquier otro contenido exigido por la legislación aplicable. Valida el texto con asesoría de privacidad.

El sistema guarda un identificador aleatorio persistente en el navegador (seudónimo) para distinguir visitantes recurrentes. Aunque no guarda nombre ni correo, ese identificador y la información técnica pueden seguir considerándose datos personales según el contexto. Si no necesitas reconocer visitas recurrentes, elimina `visitorId` y su almacenamiento persistente.
