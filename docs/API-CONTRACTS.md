# MiMotor: contratos de backend

Estos contratos se sirven bajo `/api/` desde un runtime serverless. El frontend nunca llama a proveedores externos ni recibe sus claves.

## Viaje completo

`POST /api/trip`

```json
{"vehicle":"Opel Astra H GTC 2010 1.9 CDTI 120 CV","origin":"Córdoba","destination":"Chipiona","drivingMode":"normal","advanced":{}}
```

La respuesta compone la ficha del vehículo, la ruta, el precio de combustible, el consumo ajustado, el coste y el uso de IA:

```json
{"route":{"origin":"Córdoba","destination":"Chipiona","distanceKm":0,"durationMinutes":0},"vehicle":{},"consumption":{},"fuel":{},"cost":{},"usage":{"remainingAiCalculations":null}}
```

El Worker geocodifica, valida el país, limita longitud y cachea por origen/destino normalizados. El cliente no llama a proveedores externos.

## Providers internos

- `RoutingProvider`: openrouteservice v2 con geocoding y `directions/driving-car`.
- `FuelPriceProvider`: REST oficial de carburantes, media municipal y fallback provincial.
- `VehicleResolver`: catálogo local/cache y DeepSeek solo para entradas ambiguas.
- `AIProvider`: prompt cerrado para normalización; nunca proxy de prompts arbitrarios.

El endpoint de precio queda reservado para una fase posterior; el MVP lo consulta internamente desde `/api/trip`.

## Respuesta de precio interna

`FuelPriceProvider.average(zone, fuel)` devuelve:

```json
{"zone":"Córdoba","fuel":"diesel","eur_per_litre":null,"source":"miteco-rest","retrieved_at":null}
```

`null` es un estado explícito de dato no disponible; nunca se sustituye silenciosamente por una cifra inventada.

## IA auxiliar interna

`AIProvider.normalizeVehicle(input)`

```json
{"input":"Opel Astra GTC 2010 1.9 120cv"}
```

La respuesta debe validar un esquema con `make`, `model`, `year`, `engine`, `power_cv`, `power_kw`, `fuel` y `confidence`. La ficha debe conservar `source` y `retrieved_at`; IA es fallback, no fuente de verdad.

El gateway aplica el límite de 3 cálculos IA/24 h antes de llamar al proveedor. La clave y cualquier identificador de rate limit quedan en backend; no se envían al LLM.
