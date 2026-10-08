# Al Horno · Postres

## Página pública

[Visitar Al Horno](https://favid243.github.io/al-horno/)

GitHub Pages publica la carpeta `docs/` de `main`. Incluye catálogo, búsqueda, carrito, tamaños, toppings y solicitud de pedidos por WhatsApp al negocio. El cliente debe enviar el mensaje y esperar confirmación. Los adicionales y el domicilio se cotizan por WhatsApp.

Esta página no usa cuentas ni guarda pedidos compartidos. El carrito queda en el navegador. No se efectúan cobros.

Para regenerar el catálogo público:

```sh
node scripts/build-pages.mjs
```

Editar `pages/index.html` para la presentación y `source/index.html` para los productos, después regenerar y subir `docs/`.

## Aplicación con servidor (pendiente de desplegar)

El código de `worker/`, `db/` y `source/shared-orders.js` implementa inicio de sesión con ChatGPT, permisos por rol y pedidos compartidos en D1. Está preparado para Sites y no se ejecuta en GitHub Pages. Requiere la autenticación verificada de Sites y el binding `DB`, junto a las migraciones en `drizzle/`. No exponer el Worker directamente confiando en cabeceras que pueda enviar un visitante.

```sh
pnpm install --frozen-lockfile
node scripts/build.mjs
node scripts/test.mjs
node scripts/test-orders.mjs
```

Requiere Node.js con `node:sqlite`. Las pruebas locales del servidor usan SQLite real y clientes simulados. Falta comprobar esa versión en alojamiento. Los pedidos antiguos de cada navegador no se importan automáticamente.
