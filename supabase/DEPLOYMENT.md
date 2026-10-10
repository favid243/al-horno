# Al Horno: cloud backend

Storefront: https://favid243.github.io/al-horno/
Cart: https://favid243.github.io/al-horno/carrito.html
Supabase project: `tuetmzsfyosopuyscpuf`, organization `vcmcjkmntoyqaszhwcsd`.

The deployed `al-horno-api` Edge Function uses custom authentication: Supabase Auth tokens for registered accounts and opaque guest tokens stored as SHA-256 hashes. Gateway JWT verification is disabled because these guest tokens are not JWTs. Every private route authenticates and checks ownership or administrator membership. Tables have RLS enabled and no anonymous/authenticated grants; only the server accesses them. Delivery and product totals are calculated on the server.

Applied migrations: `al_horno_accounts_orders_support` and `restrict_rls_event_trigger_execution`. The latter revokes public/anon/authenticated execution on Supabase's `public.rls_auto_enable()` event-trigger function.

Cloud tests passed for authoritative prices and delivery, duplicate order prevention, guest isolation, support thread ownership, and denial of administrator actions to guests. Test records were removed. Run `node scripts/test-cloud.mjs` only against a designated test workflow; it creates clearly marked records and prints their IDs for cleanup.

## Account activation

As of 2026-10-09, custom SMTP through Brevo is saved and enabled. The owner completed storefront registration, verified the email, and received administrator membership. The live header displays the administration control after sign-in. Never commit SMTP credentials or account passwords.

The persisted site URL is `https://favid243.github.io/al-horno/`. Administrator membership was granted only to the exact verified owner account in `ah_admins`. Other registrations remain `user`. Never infer administrator status from user-editable metadata or an unverified email.

Build with `node scripts/build-pages.mjs`. GitHub Pages serves `main:/docs`. The backend catalog is `supabase/products.json` and must stay synchronized with `docs/products.json` when prices change. Payment methods coordinate payment; the site does not automatically charge Nequi or mark an order paid.
