# MiMotor: contratos de backend

Estos contratos se sirven bajo `/api/` desde un runtime serverless. El frontend nunca llama a proveedores externos ni recibe sus claves.

## Ruta

`POST /api/route`

```json
{"origin":"Córdoba","destination":"Chipiona"}
```

Respuesta mínima:

```json
{"distance_km":245,"duration_min":155,"provider":"openrouteservice","retrieved_at":"2026-08-31T00:00:00Z"}
```

El servidor geocodifica, valida el país, limita longitud y cachea por origen/destino normalizados. El cliente solo necesita `distance_km`.

## Precio de carburante

`GET /api/fuel-price?zone=cordoba&fuel=diesel`

```json
{"zone":"Córdoba","fuel":"diesel","eur_per_litre":null,"source":"miteco-rest","retrieved_at":null}
```

`null` es un estado explícito de dato no disponible; nunca se sustituye silenciosamente por una cifra inventada. El backend agregará el dataset oficial por provincia/municipio y cacheará con fecha y fuente.

## IA auxiliar

`POST /api/ai/vehicle-normalize`

```json
{"input":"Opel Astra GTC 2010 1.9 120cv"}
```

La respuesta debe validar un esquema con `make`, `model`, `year`, `engine`, `power_cv`, `power_kw`, `fuel` y `confidence`. La ficha debe conservar `source` y `retrieved_at`; IA es fallback, no fuente de verdad.

El gateway aplica el límite de 3 cálculos IA/24 h antes de llamar al proveedor. La clave y cualquier identificador de rate limit quedan en backend; no se envían al LLM.
