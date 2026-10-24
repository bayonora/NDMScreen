# Tiendas base

`build_shops.mjs` genera `src/data/defaultShops.json`: las tiendas fijas de la sección Tiendas
(tienda general con herramientas, focos y monturas, herrería con todas las armas y armaduras
y alquimista con pociones, curaciones por encargo y algunos objetos mágicos). Siempre salen las primeras.

- La mayoría de los objetos salen del catálogo SRD (`src/data/5e-SRD-Items.json`), así que nombres,
  precios y descripciones coinciden con la sección Objetos.
- Los servicios de conjuros y algunos objetos mágicos se escriben a mano en el script.
  Los objetos mágicos siguen los precios del DMG 2024 (común 100 po, infrecuente 400 po, rara 4000 po;
  pociones y pergaminos a mitad de precio).
- Los ids (`builtin-…`) no deben cambiar: la app los usa para saber qué tiendas son fijas y qué objetos de ellas has ocultado.

Para regenerar:

```bash
node scripts/tiendas/build_shops.mjs
```
