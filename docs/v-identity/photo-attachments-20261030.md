# Fotos en el chat canónico

Se pueden adjuntar hasta tres imágenes JPG, PNG o WebP con vista previa y eliminación antes de enviar. El navegador reduce el tamaño; el servidor vuelve a decodificar y normaliza a JPEG de hasta 1600 px, elimina EXIF y rechaza formatos o tamaños inválidos. Las fotos se cifran con el Vault del operador. El endpoint privado de imágenes aplica el mismo acceso owner que el chat, sin URLs públicas.

Mesh analiza las imágenes y entrega observaciones visuales al motor principal. Si visión falla, el chat conserva el texto y las fotos para reintentar. El historial recupera las imágenes y el análisis visual para preguntas posteriores. Los identificadores están ligados al hilo, envío y contenido; un reintento con otras imágenes se rechaza.

La prueba real de visión leyó «PRUEBA V 731» y reconoció un cuadrado rojo. Se verificaron cifrado/lectura e historial; las filas de prueba se eliminaron. Las pruebas unitarias cubren límites, rechazo de URLs/SVG/contenido falso, reducción, eliminación EXIF e identificadores de reintento.
