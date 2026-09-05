**Auditoría de partida · 5 de septiembre de 2026**

Repositorio localizado: `C:\Users\Rafacha\Documents\Codex\2026-09-04\no\work\mi-motor.app`, remoto `https://github.com/rafamarcoss/mi-motor.app.git`, HEAD `c4072ca`. Contenía cambios sin commit. Se copiaron íntegramente a `C:\Users\Rafacha\Documents\Codex\2026-09-05\entra\work\mi-motor.app`, rama `release/product-editorial-review`. La copia original no se ha modificado. `git ls-remote origin refs/heads/main` confirmó que el remoto seguía en `c4072cab52cae1c457c340a05291058df945ac64`. No había herramientas OpenCode disponibles; se utilizaron terminal, Git y navegador.

**Implementación encontrada**

HTML, CSS y JavaScript sin framework ni dependencias de build. Landing con calculadora propia y herramienta de viaje con formulario estructurado; calculadoras de gasto mensual, gasolina/diésel, consumo real y presión de neumáticos. Dos guías estáticas y páginas de categoría. El perfil local y estas herramientas estaban entre los cambios previos sin commit: no son funciones creadas desde cero en esta fase.

El Worker resuelve vehículo, ruta y carburante. Catálogo → caché KV → DeepSeek con prompt cerrado. ORS/HeiGIT calcula rutas; MITECO proporciona precios municipales y provinciales con caché y respaldo de hasta siete días. No hay claves de proveedores en el frontend. El frontend necesita configurar `window.MIMOTOR_API_URL`; no hay una URL activa declarada en el código inspeccionado. No se verificó el despliegue remoto.

Se revisaron estructura, scripts, tests, workflows, documentación, módulos de proveedores y Git reciente. Los últimos commits explican el mapeo explícito de combustible, metadatos de caché y migración del host ORS. Resultado inicial: 23 tests frontend + 35 Worker, todos correctos. No existía comando de build/validación completo en la raíz.

**Problemas identificados**

| Hallazgo | Consecuencia | Resolución de esta fase |
| --- | --- | --- |
| Un vehículo en catálogo y ficha repetida en cliente/Worker | Cobertura mínima; riesgo de discrepancias | Conservado y documentado. La interfaz invalida datos al cambiar coche y admite referencia manual |
| Perfil sin página de edición/borrado; consumo personalizado poco validado | Uso recurrente incompleto | Página Tu coche y validación reforzada |
| `innerHTML` con datos de perfil | Posible inyección desde almacenamiento o proveedor | Reemplazado por nodos con `textContent` |
| Precio inicial mostrado como automático sin API | Una cifra de ejemplo parece verificada | Modo manual visible y ejemplos identificados |
| Inputs locales y resultado remoto con valores antiguos | Recalcular podía conservar datos que el usuario había cambiado | Lectura de inputs actuales, invalidación de ruta y caché en memoria por consulta |
| Etiqueta del precio convierte coma con `Number` | Mostraba NaN aunque el cálculo fuera válido | Mismo parser numérico del cálculo |
| Payload limitado solo por cabecera en trip y sin límite en resolve | Cuerpos grandes sin cabecera eludían límite | Conteo real de bytes, máximo 20000 en ambos endpoints |
| Pages subía la raíz del repositorio | Scripts, documentación y futuras investigaciones podían quedar accesibles | Build con directorios públicos permitidos y validación de paquete |
| Sitemap manual y pruebas de enlaces incompletas | Enlace a guía inexistente no detectado | Sitemap generado y comprobación de enlaces/anclas; enlace reparado |
| Pipeline RSS centrado en IA, no en problemas del conductor | Descubría candidatos pero no producía artículos utilizables | Nueva cola editorial, investigación, generación estructurada, build y PR |
| Generador legado sin límite de tokens | Coste por respuesta sin cota declarada | Límite 1500; workflow legado desactivado por defecto |
| Documentación describía backend como futuro | No reflejaba implementación | README y documentación editorial actualizados; esta auditoría aclara límites |

Persisten factores de consumo parecidos pero no idénticos en frontend y Worker: el frontend presenta el cálculo personalizado, el Worker devuelve también un cálculo de referencia. No se ha migrado este contrato. El endpoint remoto no debe sustituir el cálculo local al mover pasajeros o estilo.

El rate limit de IA del Worker usa lecturas/escrituras KV, no una operación atómica. Funciona en los casos secuenciales probados, pero puede exceder cuota con peticiones concurrentes. CORS no impide clientes fuera del navegador; no existe límite global de routing. Esto requiere un limitador atómico y protección de cuota antes de aumentar tráfico. No se ha presentado el límite KV como garantía estricta de gasto.

**Elección de producto**

Valoraciones cualitativas, sin métricas de usuarios ni ingresos. Complejidad y coste son estimaciones de ingeniería, no presupuestos de proveedor.

| Función evaluada | Utilidad / repetición | SEO | Complejidad / coste operativo | IA necesaria | Monetización futura | Decisión |
| --- | --- | --- | --- | --- | --- | --- |
| Perfil persistente y consumo propio | Alta / alta | Bajo | Baja / nulo | No | Indirecta | Completar edición, borrado y reutilización |
| Especificaciones verificadas | Alta / media | Alto | Alta / según licencia | No | Afiliación contextual | Mantener cobertura honesta; ampliar después |
| Viaje, pasajeros y extras | Alta / alta | Alto | Baja / nulo en modo manual | No | Referidos contextuales | Corregir y compartir resultados |
| Precios y rutas automáticos | Alta / alta | Medio | Media / cuota de API | Solo fallback vehículo | Indirecta | Conservar adapters; despliegue no verificado |
| Ajustes de consumo | Media / alta | Medio | Baja / nulo | No | Indirecta | Conservar como estimaciones, no homologación |
| Varios coches | Media / media | Bajo | Media / nulo | No | Indirecta | Posponer hasta observar demanda |
| Mantenimiento por fecha/km | Alta / alta | Alto | Media / nulo con datos propios | No | Talleres y recambios | Próximo incremento |
| ITV | Alta / periódica | Alto | Media con revisión legal | No | Reserva de cita | Posponer reglas legales automáticas |
| Neumáticos | Media / periódica | Medio | Media por seguridad | No | Neumáticos | Conservar orientación; evitar presiones inventadas |
| Coste mensual y comparación | Alta / periódica | Alto | Baja / nulo | No | Comparadores | Reutilizar lo existente |
| Contenido útil enlazado a herramientas | Media / recurrente | Alto potencial | Media / inferencia acotada | Redacción opcional | Contextual | Implementar pipeline con revisión |

La release seleccionada une datos propios reutilizables, cálculo compartible y artículos que llevan a herramientas. No añade login, recordatorios externos, diagnósticos, páginas masivas por vehículo ni migración de framework.

**Limitaciones que siguen abiertas**

- No se verificaron claves, ORS/DeepSeek/Cloudflare en vivo, ejecución de Actions ni apertura de PR remoto.
- Generación LLM probada con simulaciones. Investigación IDAE sí comprobada con descarga real.
- Dedupe léxico e intención explícita: no comprende todos los sinónimos ni garantiza ausencia de canibalización.
- Validación factual comprueba trazabilidad, no verdad semántica. La aprobación humana sigue siendo obligatoria.
- Solo fuentes HTML/texto y hosts autorizados; PDF y redirecciones fallan de forma explícita.
- Los coeficientes de conducción y presión heredados son orientativos y no están calibrados con datos de flota.
- Solo un perfil local. Los cálculos de combustible líquido no cubren eléctricos ni energía de híbridos enchufables.
- No hay control de presupuesto monetario a nivel de cuenta del proveedor: sí cotas de peticiones y tokens por ejecución.
- Un proceso muerto puede dejar `.generation-lock`; retirar únicamente tras comprobar que no queda ninguna generación activa.

**Próximos cinco incrementos por ROI estimado**

1. Registrar repostajes localmente y aplicar la media medida al perfil. Uso frecuente, coste de servidor nulo.
2. Recordatorios locales/exportación de calendario para mantenimiento indicado por el usuario. No inventar intervalos.
3. Ampliar catálogo desde una fuente con licencia y procedencia verificable. Priorizar vehículos realmente buscados.
4. Unificar cálculo/catálogo compartidos y usar limitador atómico de API antes de crecer. Reduce errores y gasto evitable.
5. ITV: fecha aportada por el usuario, calendario y enlaces oficiales; reglas automáticas solo tras revisión normativa.
