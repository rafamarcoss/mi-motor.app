# MiMotor: contratos de backend

Estos contratos se sirven bajo `/api/` desde un runtime serverless. El frontend nunca llama a proveedores externos ni recibe sus claves.

## Viaje completo

`POST /api/trip`

```json
{"vehicle":"Opel Astra H GTC 2010 1.9 CDTI 120 CV","origin":"Córdoba","destination":"Chipiona","drivingMode":"normal","advanced":{}}
```

La respuesta compone la ficha del vehículo, la ruta, el precio de combustible, el consumo ajustado, el coste y el uso de IA:

```json
{"route":{"origin":"Córdoba","destination":"Chipiona","distanceKm":245,"durationMinutes":155,"provider":"openrouteservice"},"vehicle":{"make":"Opel","model":"Astra","generation":"H GTC","year":2010,"engine":"1.9 CDTI","fuel":"diesel","powerCv":120,"powerKw":88,"referenceConsumption":6.1,"confidence":0.96,"source":"local-catalog","vehicleId":"opel-astra-h-gtc-2010-1-9-cdti-120"},"consumption":{"base":6.1,"adjusted":6.1,"min":5.61,"max":6.59,"factors":{"driving":1,"climate":1,"load":1,"traffic":1}},"fuel":{"type":"diesel","averagePrice":1.906,"area":"Córdoba","areaType":"municipality","sampleSize":58,"source":"https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/","updatedAt":"31/08/2026 18:23:26","fallback":false},"cost":{"liters":14.95,"estimated":28.49,"min":26.2,"max":30.77,"per100Km":11.63},"usage":{"remainingAiCalculations":null}}
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
{"type":"diesel","averagePrice":1.906,"area":"Córdoba","areaType":"municipality","sampleSize":58,"source":"https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/","updatedAt":"31/08/2026 18:23:26","fallback":false}
```

Si la fuente falla y existe un dato de hasta 7 días, se devuelve con `fallback: true` y `stale: true`. Sin dato verificable se devuelve un error; nunca se sustituye silenciosamente por una cifra inventada.

## IA auxiliar interna

`AIProvider.normalizeVehicle(input)`

```json
{"make":"Opel","model":"Astra","generation":"H GTC","year":2010,"engine":"1.9 CDTI","fuel":"diesel","powerCv":120,"powerKw":88,"referenceConsumption":6.1,"confidence":0.9}
```

La respuesta valida `make`, `model`, `year`, `engine`, `fuel`, `powerCv`, `powerKw` y `referenceConsumption`; `confidence` permite rechazar ambigüedades. La ficha conserva `source` y `vehicleId`; IA es fallback, no fuente de verdad.

El gateway aplica el límite de 3 cálculos IA/24 h antes de llamar al proveedor. La clave y cualquier identificador de rate limit quedan en backend; no se envían al LLM.
