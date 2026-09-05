# MiMotor: arquitectura

## Ahora

- Sitio estático HTML/CSS/JavaScript en GitHub Pages.
- La calculadora realiza las operaciones en el navegador. No hay cuentas; el perfil se guarda localmente con consentimiento. El Worker usa KV si se configura.
- `index.html` es la superficie pública y `CNAME` fija `mi-motor.app`.
- `herramientas/`, `ia-y-coche/`, `guias/` y `actualidad/` son rutas estáticas indexables.
- `js/calculator-core.js` centraliza los factores del viaje; `js/vehicle-profile.js` valida y persiste el coche local con una lista blanca; `js/tools-core.js` conserva el resto de cálculos deterministas.
- `worker/src/editorial/` contiene fuentes, parsing, scoring, deduplicación y slugs del descubrimiento editorial.

## Contratos y módulos

1. Mantener el frontend estático y extraer la lógica a módulos JavaScript cuando crezca.
2. Backend serverless implementado `/api/` para routing, precios, normalización de vehículos y proveedor IA.
3. Mantener contratos JSON pequeños y adapters intercambiables:
   - `RoutingProvider`: origen, destino → distancia y metadatos de ruta.
   - `FuelPriceProvider`: zona y combustible → precio con fecha y fuente.
   - `VehicleProvider`: marca, modelo, año y motor → ficha normalizada y fuente.
   - `AIProvider`: operación cerrada de normalización → respuesta validada.
4. Cachear fichas y precios en backend. En el navegador solo se conserva el coche si el usuario lo pide; nunca rutas, datos personales ni credenciales.
5. Los payloads previstos están en [`docs/API-CONTRACTS.md`](API-CONTRACTS.md); `.env.example` solo enumera variables del runtime serverless.

## Fuentes evaluadas

- **Routing inicial:** [openrouteservice v2](https://openrouteservice.org/dev/) sobre `api.heigit.org`, usando Pelias geocoding y `directions/driving-car` desde backend. El proveedor [ha migrado el host público](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912); su [tabla de restricciones](https://openrouteservice.org/restrictions/) obliga a controlar cuota, distancia y waypoints, por eso no se llamará desde cada cambio de campo.
- **Alternativa de routing:** [Mapbox Directions v5](https://docs.mapbox.com/api/navigation/directions/) queda como adapter sustituible. Requiere token y su coste depende de peticiones, así que no se activa en el MVP.
- **Carburantes:** el [dataset oficial de precios de carburantes](https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas) del Ministerio expone un servicio REST y descargas. El backend agregará por provincia/municipio y cacheará el resultado con fecha y fuente.
- **IA auxiliar:** [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/) con `deepseek-v4-flash`, temperatura 0 y JSON Output; una llamada como máximo por vehículo no cacheado.

## Decisiones

No se introduce React, Vite ni servidor dedicado: el MVP ya funciona como HTML standalone. Cloudflare Workers es la primera opción para el gateway serverless por su integración sencilla con Pages y su coste bajo; se mantiene reversible hasta medir tráfico y límites del proveedor.

El pipeline editorial usa primero filtros deterministas. GitHub Actions lo ejecuta a diario en modo revisión y guarda candidatos internos; nunca convierte un titular en una publicación. La publicación automática está bloqueada de forma deliberada.

El build público vive en `scripts/build.mjs` y excluye código privado. La cola editorial y los registros están en `content/`; el workflow `articles.yml` genera un PR con preview. Consulta `EDITORIAL-PIPELINE.md`.
