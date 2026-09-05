# MiMotor: privacy by design

## Se permite

- Datos introducidos para calcular un viaje durante la petición.
- Una ficha de vehículo normalizada y no identificativa, si el usuario decide conservarla localmente.
- Métricas agregadas sin nombres, emails, matrículas ni coordenadas precisas.

## No se recopila

No hay login, cuentas, cookies de marketing, perfiles remotos ni matrículas ni envío de API keys al navegador. La clave de IA vive únicamente en el backend.

El perfil local usa la clave `mimotor.vehicle.v1` y admite únicamente marca, modelo, generación, año, motor, combustible, potencia, consumo de referencia, consumo personalizado, capacidad de depósito, fuente y confianza. No guarda rutas, matrícula, bastidor, nombre ni email.

## Límite de IA

El Worker limita a 3 cálculos IA por 24 horas. Para ello calcula un HMAC-SHA-256 de la IP recibida por Cloudflare, guarda solo ese identificador durante 24 horas y no almacena la IP en claro. La IP nunca se envía al LLM.

## Feedback futuro

Si se recoge consumo real, guardar solo `vehicle_id`, `route_category`, `predicted_consumption` y `real_consumption`, con agregación y retención limitada. Esto reduce datos, pero no elimina por sí solo obligaciones RGPD: habrá que revisar base legal, información y retención antes de activarlo.

Los enlaces compartidos contienen únicamente cifras y ajustes en el fragmento de URL, sin coche ni ciudades. Quien reciba el enlace puede leer esas cifras. El perfil se puede editar y eliminar en `/tu-coche/`.
