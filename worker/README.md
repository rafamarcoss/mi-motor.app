# MiMotor API

Worker serverless para routing, precio de carburante y resolución de vehículos. El frontend de GitHub Pages no necesita conocer ninguna clave.

## Local

Desde `worker/`:

```sh
npm test
```

El test usa providers mock y no llama a servicios externos.

## Cloudflare

1. Instala Wrangler o ejecútalo con `npx wrangler`.
2. Crea un namespace KV y añade su `id` en `wrangler.toml` bajo `MIMOTOR_KV`.
3. Configura las variables secretas en el Worker, nunca en Pages:

```sh
npx wrangler secret put OPENROUTESERVICE_API_KEY
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put RATE_LIMIT_SECRET
```

4. Despliega con `npx wrangler deploy`.

Wrangler usa `wrangler login` localmente o `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en CI; esas variables no se leen en el código. Después habrá que configurar el frontend para llamar al endpoint del Worker bajo `/api/trip` mediante un proxy o URL allowlisted.

Cuando el Worker esté publicado, define `window.MIMOTOR_API_URL` antes de `js/trip-api.js` o enruta `/api/*` al Worker. Sin esa variable, el frontend sigue usando su cálculo local.
