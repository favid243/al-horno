# Al Horno · Postres

[Visitar Al Horno](https://favid243.github.io/al-horno/) · [Carrito](https://favid243.github.io/al-horno/carrito.html)

GitHub Pages publica `docs/` de `main`. Incluye catálogo, búsqueda, páginas de producto, tamaños, toppings, carrito separado y domicilio fijo de COP 4.500. Los adicionales se cotizan aparte. Efectivo, Nequi y WhatsApp son métodos de coordinación del pago; no se realizan cobros automáticos.

Los pedidos y mensajes de soporte se guardan en Supabase mediante `al-horno-api`. Los invitados pueden comprar y escribir al soporte. Cada cliente ve sus propios registros. El administrador tiene un panel con pestañas para los pedidos y las conversaciones de todos los dispositivos.

El envío SMTP está configurado y el propietario completó el registro y la confirmación de correo. Su cuenta tiene permisos de administración. Las nuevas cuentas tienen el rol de cliente. Ver [estado de despliegue](supabase/DEPLOYMENT.md).

La interfaz incluye una guía de compra en tres pasos, búsqueda, categorías, orden por precio o nombre, opciones del producto y resumen de domicilio y total. El acceso a la cuenta es opcional, desde «Mi cuenta». Los estilos se adaptan al celular y respetan la preferencia de reducir animaciones.

El carrito y el token de sesión permanecen en el navegador. Los pedidos enviados se guardan en el servidor. Los pedidos antiguos de otras versiones guardados solo en cada navegador no se importan automáticamente.

## Desarrollo

```sh
node scripts/build-pages.mjs
```

Editar `pages/` para la presentación y `source/index.html` para el catálogo; regenerar `docs/`. Al cambiar productos o precios, sincronizar `supabase/products.json` y desplegar de nuevo la función. Nunca incluir claves privadas en `docs/`.

## Versión anterior para Sites

`worker/`, `db/` y `source/shared-orders.js` corresponden a una implementación anterior con ChatGPT y D1 que no se ejecuta en GitHub Pages. Requiere autenticación verificada de Sites, el binding `DB` y las migraciones de `drizzle/`. No exponer ese Worker confiando en cabeceras enviadas por visitantes.

```sh
pnpm install --frozen-lockfile
node scripts/build.mjs
node scripts/test.mjs
node scripts/test-orders.mjs
```
