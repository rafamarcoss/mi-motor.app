# MiMotor: roadmap

## P0: base pública

- [x] Deployment automático desde `main`.
- [x] Dominio, canonical, robots y sitemap.
- [x] Contratos y límites documentados.

## P1: calculadora

- [x] Entrada breve de vehículo, origen, destino y conducción.
- [x] Opciones avanzadas colapsadas.
- [x] Resultado con explicación y rango.

## P2: datos deterministas

- [x] Cálculo de consumo ajustado y casos reproducibles.
- [x] Adapter de routing y geocoding (openrouteservice, mock probado; clave pendiente).
- [x] Adapter de precios medios oficiales de carburantes (REST oficial probado).
- [ ] Ficha normalizada de vehículos con fuente y fecha.

## P3+: backend y contenido

- [x] Gateway serverless seguro y provider abstraction para IA (Worker preparado).
- [x] Rate limiting minimizado y cache (KV/Cache API preparados).
- [ ] Desplegar Worker y conectar frontend cuando existan secretos Cloudflare/ORS/DeepSeek.
- [ ] Plantilla `/articulos/` y contenido revisado.
- [ ] Páginas por vehículo solo cuando exista información útil.
