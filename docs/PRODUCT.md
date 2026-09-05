# MiMotor: producto

## Propuesta

"Dime qué coche tienes y dónde vas. MiMotor calcula lo demás."

La calculadora de viajes es la herramienta protagonista. El resultado debe mostrar coste estimado, distancia, consumo, litros, precio usado y un rango razonable, con una explicación breve.

## MVP actual

La landing ya permite calcular un viaje con origen, destino, distancia, consumo y precio introducidos manualmente. Los valores se calculan de forma determinista en JavaScript.

## Próxima experiencia

El formulario principal pedirá vehículo, origen, destino y estilo de conducción. Distancia, combustible, consumo y precio llegarán de adapters externos cuando estén disponibles; mientras tanto habrá un fallback explícito y auditable, sin presentar datos de ejemplo como datos reales.

No se añaden login, pagos, matrículas ni diagnóstico de averías. Sí existe un perfil local optativo en Tu coche.

## Perfil "Tu coche"

El usuario puede guardar su coche como perfil estructurado (marca, modelo, generación, año, motor, combustible y consumos). El perfil se persiste únicamente en el navegador con una lista blanca estricta y validación al leer. El consumo manual indicado por el usuario tiene prioridad sobre el consumo de referencia en el cálculo. No se guardan matrículas, rutas ni datos personales.
