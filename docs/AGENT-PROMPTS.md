**Reparto de trabajo para la siguiente iteración**

Modelos según tus preferencias. Usa el identificador real que ofrezca OpenCode/proveedor; no se ha verificado disponibilidad desde esta sesión. No se han lanzado agentes externos. Codex ha ejecutado la auditoría, implementación y verificación de esta entrega.

**DeepSeek V4 Flash · tareas acotadas de bajo coste**

```text
Trabaja en mi-motor.app. Lee docs/RELEASE-AUDIT.md y docs/EDITORIAL-PIPELINE.md antes de editar. Añade una prueba que reproduzca el fallo concreto que te indique Codex y corrige solo su causa. Conserva HTML/JS estáticos, contratos del Worker y cálculos deterministas. No añadas llamadas LLM al cambiar pasajeros, estilo o importes. Ejecuta npm test, npm run build y npm run validate. Devuelve archivos cambiados y resultados exactos. No hagas push ni publiques.
```

**DeepSeek V4 Pro · cambios de lógica que requieran más análisis**

```text
Inspecciona el catálogo y los contratos de vehículo en js/vehicle-profile.js y worker/src/vehicle.js. Propón y ejecuta una única fuente de datos compartida manteniendo los contratos actuales y la resolución catálogo → caché → fallback controlado. No inventes fichas ni consumos y no uses IA para cálculos. Haz pruebas de paridad con el catálogo actual, entradas desconocidas y respuesta cacheada. Evita migraciones de framework. Ejecuta la suite completa y documenta limitaciones. No hagas push.
```

**GLM 5.3 Flash · frontend**

```text
Mejora exclusivamente la interfaz de Tu coche y las calculadoras de mi-motor.app, siguiendo css/site.css. Lee el código actual, no sustituyas los módulos de cálculo ni añadas framework. Mantén etiquetas accesibles, español de España, consentimiento de guardado explícito y borrado del perfil. Los enlaces compartidos no deben incluir coche, identidad ni ruta. Comprueba escritorio a 1365 px y móvil a 390 px, sin desbordamiento horizontal. No introduzcas nuevas API ni inferencia. Ejecuta tests y build; entrega evidencia de las interacciones comprobadas. No hagas push.
```

**Codex · auditor y guía**

```text
Audita el diff real y las pruebas del agente. Prioriza pérdida de datos, fuga de secretos, gasto LLM, duplicación editorial, cálculos incorrectos y regresiones de accesibilidad. Reproduce los fallos antes de aprobar. Revisa también los cambios no commitados del usuario y consérvalos. No des por verificadas llamadas a proveedores que solo se han simulado. Devuelve hallazgos concretos y un prompt corto con modelo asignado para cada corrección necesaria. No hagas push ni publiques sin autorización.
```

El prompt de redacción de producción está en `scripts/editorial.mjs`, función `prompt`. El modelo se configura mediante `EDITORIAL_AI_MODEL`; no hereda el modelo de Codex.
