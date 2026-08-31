# MiMotor: producto

## Propuesta

"Dime qué coche tienes y dónde vas. MiMotor calcula lo demás."

La calculadora de viajes es la herramienta protagonista. El resultado debe mostrar coste estimado, distancia, consumo, litros, precio usado y un rango razonable, con una explicación breve.

## MVP actual

La landing ya permite calcular un viaje con origen, destino, distancia, consumo y precio introducidos manualmente. Los valores se calculan de forma determinista en JavaScript.

## Próxima experiencia

El formulario principal pedirá vehículo, origen, destino y estilo de conducción. Distancia, combustible, consumo y precio llegarán de adapters externos cuando estén disponibles; mientras tanto habrá un fallback explícito y auditable, sin presentar datos de ejemplo como datos reales.

No se añaden login, pagos, matrículas, perfiles ni diagnóstico de averías.
