# Al Horno · Postres

Código del catálogo y pedidos de Al Horno.

## Estado

Código preparado y probado localmente. Subir este repositorio no publica una web funcional ni crea la base de datos alojada.

## Funciones

- Acceso con ChatGPT y pantallas separadas de inicio y registro.
- Permisos de administrador para el propietario configurado y de usuario para clientes.
- Pedidos compartidos mediante D1; cada cliente ve los suyos y el administrador todos.
- Confirmación de pedidos y envío por WhatsApp.
- Tamaños, toppings y notas; los adicionales quedan sujetos a cotización.

## Desarrollo

Requiere Node.js con `node:sqlite` y pnpm.

```sh
pnpm install --frozen-lockfile
node scripts/build.mjs
node scripts/test.mjs
node scripts/test-orders.mjs
```

## Alojamiento

Esta versión está diseñada para Sites: utiliza su autenticación verificada y una base D1 con binding `DB`. Las migraciones están en `drizzle/`. El build genera `dist/server/index.js` y los metadatos de despliegue.

GitHub Pages solo aloja archivos estáticos, por lo que no ejecuta este servidor ni los pedidos compartidos. Para otro proveedor es necesario adaptar la autenticación, provisionar la base de datos y aplicar las migraciones. No exponer directamente el Worker confiando en cabeceras de identidad enviadas por el visitante.

Los pedidos antiguos guardados en navegadores no se importan automáticamente. Soporte permanece local. Las pruebas usan SQLite y clientes simulados; queda pendiente verificar el despliegue real.
