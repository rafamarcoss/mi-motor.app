# SEO + IA: operación

## Estado y límites

`content/seo-backlog.json` conserva 30 temas repartidos entre ahorro, consumos/anomalías, rutas/costes, mantenimiento/síntomas, comparativas de energía y prompts de viaje. Es una cola, no una orden de publicar: el workflow crea como máximo un borrador diario y la build de producción rechaza todo artículo sin revisión humana.

La calculadora mantiene sus fórmulas locales deterministas. La IA solo normaliza un vehículo ambiguo para estimar consumo; si falla, la respuesta pide más precisión y no calcula una cifra inventada.

## Configuración requerida

- GitHub secret `EDITORIAL_AI_API_KEY`, variables `EDITORIAL_AI_BASE_URL=https://api.openai.com/v1` y `EDITORIAL_AI_MODEL=gpt-5.6-luna`: generación editorial por Responses API con JSON Schema, `reasoning.low` y `store:false`. Sin las tres, falla antes de investigar o publicar.
- Worker secret `OPENAI_API_KEY`; variable opcional `OPENAI_MODEL=gpt-5.6-luna`. Usa Responses API con `reasoning.low` y `store:false`. Fallback explícito: `DEEPSEEK_API_KEY` con `DEEPSEEK_MODEL`.
- KV `MIMOTOR_KV` y `RATE_LIMIT_SECRET`: cuota y agregados IA. Sin KV no se ejecuta IA.
- GTM/GA4: cargar el contenedor de forma externa y escuchar `dataLayer`. Eventos: `seo_article_view`, `article_calculator_cta_click`, `calculator_started`, `calculator_completed`, `calculator_failed`. La atribución usa UTM/referrer en `sessionStorage`, sin PII.
- GSC: secret `GSC_ACCESS_TOKEN` y variable `GSC_SITE_URL`. `npm run gsc:report` compara 28 días cerrados con los 28 anteriores; sin ambas variables deja un informe de bloqueo, sin métricas ficticias.

## Coste y telemetría

El Worker agrega por día solicitudes, éxito/error, modelo, tokens de entrada/salida y coste. No persiste prompt, matrícula, ruta, IP ni clave. Tabla de referencia fechada el 2026-09-13: Luna $0.20/MTok entrada y $1.20/MTok salida; EUR/USD fijo 0.92, actualizado manualmente antes de un cambio de precio. El coste real por artículo o por 1.000 cálculos solo se puede informar tras recibir `usage` real de la API; el dry-run no llama a IA y por tanto vale 0 tokens/$.

## Plan de 90 días

- Días 1–14: configurar instrumentación, capturar baseline y revisar 7 long-tail antes de publicar.
- Días 15–45: un borrador/día, optimizar CTR y cubrir dos clusters.
- Días 46–90: refrescar, consolidar canibalizaciones y ampliar lo que convierta.

Objetivos ajustables tras baseline: +50% impresiones, +30% clics, CTR al menos baseline y CTA a calculadora >=5%.
