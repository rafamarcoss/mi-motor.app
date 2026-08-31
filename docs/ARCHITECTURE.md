# MiMotor: arquitectura

## Ahora

- Sitio estático HTML/CSS/JavaScript en GitHub Pages.
- La calculadora realiza las operaciones en el navegador; no hay cuentas, base de datos ni claves.
- `index.html` es la superficie pública y `CNAME` fija `mi-motor.app`.

## Evolución mínima

1. Mantener el frontend estático y extraer la lógica a módulos JavaScript cuando crezca.
2. Añadir un backend serverless `/api/` para routing, precios, normalización de vehículos y proveedor IA.
3. Mantener contratos JSON pequeños y adapters intercambiables:
   - `RoutingProvider`: origen, destino → distancia y metadatos de ruta.
   - `FuelPriceProvider`: zona y combustible → precio con fecha y fuente.
   - `VehicleProvider`: entrada libre → ficha normalizada y fuente.
   - `AIProvider`: prompt estructurado → respuesta validada.
4. Cachear fichas de vehículos y precios en backend. Nunca en el navegador datos sensibles ni credenciales.

## Fuentes evaluadas

- **Routing inicial:** [openrouteservice v2](https://openrouteservice.org/dev/), usando geocoding y `directions/driving-car` desde backend. Su [tabla de restricciones](https://openrouteservice.org/restrictions/) obliga a controlar cuota, distancia y waypoints; por eso no se llamará desde cada cambio de campo.
- **Alternativa de routing:** [Mapbox Directions v5](https://docs.mapbox.com/api/navigation/directions/) queda como adapter sustituible. Requiere token y su coste depende de peticiones, así que no se activa en el MVP.
- **Carburantes:** el [dataset oficial de precios de carburantes](https://datos.gob.es/es/catalogo/e05068001-precio-de-carburantes-en-las-gasolineras-espanolas) del Ministerio expone un servicio REST y descargas. El backend agregará por provincia/municipio y cacheará el resultado con fecha y fuente.

## Decisiones

No se introduce React, Vite ni servidor dedicado: el MVP ya funciona como HTML standalone. Cloudflare Workers es la primera opción para el gateway serverless por su integración sencilla con Pages y su coste bajo; se mantiene reversible hasta medir tráfico y límites del proveedor.
