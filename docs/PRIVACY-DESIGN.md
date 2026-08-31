# MiMotor: privacy by design

## Se permite

- Datos introducidos para calcular un viaje durante la petición.
- Una ficha de vehículo normalizada y no identificativa, si el usuario decide conservarla localmente.
- Métricas agregadas sin nombres, emails, matrículas ni coordenadas precisas.

## No se recopila

No hay login, cuentas, cookies de marketing, perfiles, matrículas ni envío de API keys al navegador. La clave de IA vive únicamente en el backend.

## Límite de IA

El objetivo es limitar a 3 cálculos por 24 horas. El rate limiting debe separarse de analytics, usar TTL corto y evitar almacenar IP en claro cuando el proveedor lo permita (por ejemplo, un identificador efímero derivado y rotado). La IP nunca se envía al LLM.

## Feedback futuro

Si se recoge consumo real, guardar solo `vehicle_id`, `route_category`, `predicted_consumption` y `real_consumption`, con agregación y retención limitada. Esto reduce datos, pero no elimina por sí solo obligaciones RGPD: habrá que revisar base legal, información y retención antes de activarlo.
