**Cómo funciona**

`content/topics.json` → comparar con `content/registry.json`, todos los HTML y registros de `content/articles/` → investigar fuentes primarias → generar JSON → validar metadatos, estructura y evidencias → build con enlaces internos → sitemap/índice → artefacto preview y PR.

`content/registry.json` registra las guías heredadas. Los registros inmutables de `content/articles/<slug>.json` son el historial de los temas nuevos, tanto pendientes como aprobados. No hace falta duplicarlos en el registro legado. La generación utiliza creación exclusiva y nunca actualiza un artículo existente. Los cambios de un artículo aprobado se hacen mediante edición y revisión normal.

El nuevo workflow es `.github/workflows/articles.yml`. No depende del descubrimiento RSS legado: permite contenido de consumo, costes, mantenimiento, ITV y neumáticos. La cola activa contiene cuatro temas sobre ChatGPT y Claude con tu vehículo, enfocados a España: manual, presupuestos, historial de mantenimiento y preparación de viajes. Los temas anteriores quedan pausados. Cada tema necesita ID, slug, intención, keyword, categoría, brief y 1–3 fuentes primarias. Añade temas útiles y fuentes antes de activar una cola mayor.

**Configuración y comandos**

Desde la raíz, Node.js 22 o posterior; no requiere instalar paquetes:

```sh
npm test
npm run editorial:plan
npm run build
npm run validate
python -m http.server 8000 --directory dist
```

`editorial:plan` es el dry-run: no descarga fuentes, no llama a modelos y no escribe artículos. Indica el siguiente tema o explica por qué se omite. La configuración de límites sí se valida.

La generación exige estas variables de entorno, o Secret/Variables de GitHub con los mismos nombres:

| Nombre | Tipo GitHub | Contenido |
| --- | --- | --- |
| `EDITORIAL_AI_API_KEY` | Secret | Clave dedicada al generador |
| `EDITORIAL_AI_BASE_URL` | Variable | Base HTTPS compatible con Chat Completions, sin `/chat/completions` final |
| `EDITORIAL_AI_MODEL` | Variable | Identificador exacto admitido por el proveedor |
| `EDITORIAL_ENABLED` | Variable | `true` para habilitar la ejecución semanal |

El proveedor está en `content/editorial.config.json`: `openai-compatible`. Cambiar endpoint/modelo no requiere cambiar el generador. Usa OpenCode Go con base `https://opencode.ai/zen/go/v1` y modelo `deepseek-v4-flash`, sin razonamiento adicional para reservar los tokens al artículo. La clave existente de OpenCode Go se guarda como secret de GitHub. El cliente identifica MiMotorEditorial y envía una sesión por ejecución. Frecuencia: lunes a las 07:30 UTC (09:30 en verano y 08:30 en invierno en España peninsular). Al agotarse los cuatro temas, no consume IA hasta añadir nuevos temas. No hay un modelo de Astra codificado en producción. La clave de la API pública del coche es independiente de la editorial.

```sh
npm run editorial:generate
npm run build:preview
```

Sin variables requeridas falla antes de acceder a la red. No imprime claves ni contenido de respuestas del proveedor. Los errores JSON se presentan sin el cuerpo recibido. GitHub utiliza su `GITHUB_TOKEN` automático para rama y PR; necesita permitir a Actions crear pull requests en la configuración del repositorio. No se necesita PAT para este flujo.

**Límites y fallos**

- Un artículo por ejecución. Máximo dos solicitudes de modelo, 4500 tokens de salida por intento por defecto, techo configurable 6000.
- Máximo dos solicitudes en total, incluidas correcciones. Ante HTTP 429/503 espera un segundo. Si el JSON o su validación fallan, permite una corrección con el error del validador. No reintenta errores de red inciertos. Las citas se seleccionan por ID de extracto y el código copia el texto original; no se acepta una cita redactada por el modelo.
- Timeout de 60 segundos por fuente/modelo; workflow máximo ocho minutos.
- Máximo tres fuentes de 600000 bytes cada una; se conserva un extracto de hasta 14000 caracteres por fuente, fecha y SHA-256. Respuesta de modelo: 80000 bytes máximo.
- Fuentes HTTPS en lista explícita. No se siguen redirecciones ni se procesan PDF. Actualiza una URL que redirija a su destino primario verificado.
- La investigación de borradores caduca a los 30 días. Reinvestigar antes de revisar uno antiguo. Los artículos aprobados conservan su fecha y evidencia histórica.
- Los PR y ramas editoriales existentes, incluso cerrados, se excluyen antes de generar. Una rama cuyo PR falló al crearse tampoco vuelve a consumir IA: completar ese PR manualmente.
- Bloqueo local contra generaciones simultáneas. Los límites no sustituyen el presupuesto de cuenta del proveedor.

**Revisión y publicación**

El artículo se guarda con `status: needs-review`. El modelo no puede aprobarse: estos campos los fija el código. `npm run build:preview` incluye el artículo, marca `noindex,nofollow` y bloquea crawling de todo el preview mediante robots. Se añade al índice de Guías y al sitemap del preview.

El PR incluye `docs/ARTICLE-REVIEW.md`. Un revisor debe verificar las afirmaciones contra los extractos privados y fuentes, fechas, ejemplos, enlaces e intención SEO; después establecer `status: approved` y `review: {reviewer, date}` con fechas válidas. Actualizar publicación/edición al día previsto de publicación. `npm run build` bloquea cualquier borrador sin revisión declarada.

La declaración de revisión es un control del repositorio, no una autenticación del revisor. Protege `main` y exige revisión humana. Los eventos creados con `GITHUB_TOKEN` no disparan todos los workflows posteriores; por eso la propia generación prueba el código y construye/valida el preview antes de abrir el PR. Ejecutar producción de nuevo después de editar la aprobación. El despliegue Pages también ejecuta tests/build antes de subir exclusivamente `dist/`.

No hay auto-merge. Una futura publicación automática puede incorporarse en el último paso del workflow, conservando generación y validación. Antes exige medir errores editoriales, aprobar una política de fuentes y sustituir el control humano por uno explícitamente autorizado. Cambiar un flag no debe simular una revisión humana.

**Ejemplo sin coste de modelo**

`docs/examples/article-review.json` es una muestra redactada en esta fase con investigación IDAE descargada de verdad. Está fuera de `content/articles/` para no bloquear ni publicar la release. Para verla, copia ese archivo a `content/articles/repartir-gastos-viaje-coche.json` y ejecuta `npm run build:preview`. Sigue pendiente de revisión y nunca se presenta como contenido generado por un proveedor probado en vivo.

El build no publica las investigaciones, scripts, workflows, documentos ni secretos. El JSON-LD de Article conserva título, fechas, idioma, autor editorial y canonical; la FAQ es opcional y no se fuerza. Referencia técnica: [Google Search Central: Article](https://developers.google.com/search/docs/appearance/structured-data/article).
