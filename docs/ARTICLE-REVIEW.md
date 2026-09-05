Revisar el JSON de `content/articles/` y el artefacto `editorial-preview` de esta ejecución.

- [ ] Comprobar cada afirmación y su extracto contra la fuente primaria.
- [ ] Confirmar vigencia en España, especialmente legislación, ITV, impuestos y seguridad.
- [ ] Revisar que ejemplos y orientación no oculten afirmaciones sin fuente.
- [ ] Revisar intención de búsqueda y posible canibalización (el filtro es léxico, no semántico).
- [ ] Comprobar utilidad, cálculo de ejemplos, legibilidad, referencias y enlaces.
- [ ] Actualizar fechas de publicación/actualización al día de aprobación.
- [ ] Establecer `article.status: approved` y `article.review: {reviewer: "nombre del revisor", date: "AAAA-MM-DD"}`.
- [ ] Ejecutar `npm test` y `npm run build` tras la revisión.

Fusionar solo después de comprobar estos puntos. El build de producción rechaza borradores. No hay autofusión ni publicación automática.
