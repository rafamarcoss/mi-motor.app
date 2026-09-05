# MiMotor

Herramientas de consumo y costes del coche. HTML/CSS/JS en GitHub Pages y API opcional en Cloudflare Workers.

Desde la raíz, con Node.js 22 o posterior:

```sh
npm test
npm run build
npm run validate
python -m http.server 8000 --directory dist
```

El build crea únicamente el sitio público en `dist/`. Pages ejecuta tests y build antes de desplegar desde `main`. No subas la raíz del repositorio como artefacto público.

Tu coche permite guardar, editar y borrar un perfil local. La calculadora reutiliza el consumo propio y comparte cifras mediante un enlace sin coche ni ruta. Sin `window.MIMOTOR_API_URL`, el cálculo es manual y determinista. La API es opcional; las claves permanecen en el Worker.

Automatización editorial:

```sh
npm run editorial:plan
npm run editorial:generate
npm run build:preview
```

`editorial:plan` no llama a la red. La generación exige configuración de proveedor y crea un borrador revisable. La ejecución semanal está desactivada hasta establecer `EDITORIAL_ENABLED=true`. Ningún artículo se aprueba ni publica automáticamente.

- [Auditoría y decisiones](docs/RELEASE-AUDIT.md)
- [Pipeline, proveedor, secretos y revisión](docs/EDITORIAL-PIPELINE.md)
- [Prompts y modelos para agentes](docs/AGENT-PROMPTS.md)
- [Backend y despliegue del Worker](worker/README.md)

La muestra `docs/examples/article-review.json` no forma parte de las publicaciones. El descubrimiento RSS anterior queda disponible, pero su workflow necesita `EDITORIAL_LEGACY_ENABLED=true` y no es el generador principal.
