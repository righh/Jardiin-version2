JARDIN 3D + FIREBASE FIRESTORE — VERSION MEJORADA

ESTRUCTURA
- index.html
- css/style.css
- js/jardin.js
- js/firebase.js
- firestore.rules

MEJORAS VISUALES DE LETREROS
- Los letreros giran suavemente en el eje vertical para orientar su cara hacia la cámara.
- El texto de descripción y dato curioso se ajusta a un número máximo de líneas y reduce su tamaño antes de recortarse.
- Esto evita que las líneas largas se salgan de la placa o se encimen. La perspectiva 3D puede seguir variando ligeramente según el ángulo, pero el texto no se deforma por desbordamiento.

DATOS TÉCNICOS REGISTRADOS
- Identificador aleatorio de sesión, guardado solo en sessionStorage.
- Fecha/hora del servidor, ruta, dominio de referencia, idioma y zona horaria.
- Tipo de dispositivo, modelo cuando el navegador lo expone, factor de forma.
- Navegador y versión; sistema operativo y versión.
- Resolución de pantalla y tamaño de ventana.

MODELO DEL CELULAR
El código intenta leer navigator.userAgentData.getHighEntropyValues() y la propiedad model.
Chrome/Chromium en ciertos dispositivos puede proporcionar un modelo como “Pixel ...”. Safari,
Firefox, iOS y otros navegadores pueden no facilitarlo. En ese caso se guarda “No disponible”.
No se deduce ni inventa el modelo y no se usa fingerprinting.

DATOS QUE NO SE RECOPILAN DIRECTAMENTE
No se solicita nombre, correo, teléfono, contactos, contraseña, ubicación GPS, cámara,
micrófono ni datos de sensores. El código no lee ni guarda directamente la IP. El usuario
puede desactivar las estadísticas para futuras visitas en ese navegador desde el aviso de
privacidad. La desactivación no borra registros anteriores; las solicitudes de cancelación se
atienden por el contacto del responsable. El alojamiento
y Firebase pueden procesar IP y registros técnicos en sus propios sistemas.

ANTES DE PUBLICAR
1. Completa los campos entre corchetes del aviso en index.html: identidad y domicilio del
   responsable, contacto, plazo de conservación y enlace al aviso integral.
2. En Firebase Console > Firestore > Rules, reemplaza las reglas por firestore.rules y pulsa
   Publish. Las reglas nuevas corresponden a la estructura de campos de esta versión.
3. Sube la carpeta completa a GitHub manteniendo su estructura.
4. Prueba en Chrome Android y, si es posible, Safari/iPhone y Firefox. El modelo exacto solo
   aparecerá cuando el navegador lo proporcione.

IMPORTANTE SOBRE PRIVACIDAD (MÉXICO)
El carácter técnico de un dato no significa automáticamente que quede fuera de la legislación.
El identificador de sesión y la combinación de datos del dispositivo pueden ser datos personales
si permiten relacionar o identificar a una persona. Mantén disponible el aviso simplificado y
publica un aviso integral con los datos obligatorios del responsable, finalidades, opciones para
limitar uso/divulgación y mecanismo para ejercer derechos ARCO. Define un plazo de conservación
real y elimina los registros al terminarlo. La implementación técnica no garantiza por sí sola
cumplimiento legal; solicita revisión jurídica si el sitio tendrá uso comercial o gran escala.

SEGURIDAD
Las reglas permiten crear documentos con los campos y tipos esperados, pero no permiten leer,
modificar ni borrar visitas desde el navegador público. La API key de Firebase visible en frontend
identifica el proyecto; no es una contraseña. Configura restricciones de dominio para la API key,
activa Firebase App Check y revisa límites/costos. Estas reglas no impiden por sí solas spam de
escrituras: App Check y controles adicionales son recomendables.


MEJORA DE LETREROS (VERSION MOVIL)
- Orientacion fija para evitar que los letreros persigan la camara y parpadeen al caminar o girar.
- Texturas de letreros dibujadas en resolucion interna 2x para mejorar la nitidez.
- Mipmaps, filtrado lineal y anisotropia para mantener la lectura en angulos oblicuos.
- Pixel ratio maximo moderado: 1.5 en movil y 2 en escritorio.
