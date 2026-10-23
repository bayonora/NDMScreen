# Objetos: cómo se genera `src/data/5e-SRD-Items.json`

- **Equipo normal** (armaduras, armas, equipo de aventuras, herramientas, monturas, productos
  comerciales y packs): SRD 5.1 en español de Nosolorol Ediciones,
  <https://srd.nosolorol.com/DD5/equipamiento_index.html>, Open Game License v1.0a.
  Usa pies y libras, igual que el bestiario y el grimorio.
- **Objetos mágicos** (de la A a la Z y el Orbe de los Dragones): SRD 5.1 oficial en español de
  Wizards of the Coast, <https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1_ES.pdf>
  (páginas 222–273), CC-BY-4.0. Usa metros y kilos, como el PDF oficial.

## Pasos

1. Descargar las páginas de equipo como `eq_<página>.html` en una carpeta (`armadura`, `armas`,
   `equipo_de_aventuras`, `herramientas`, `monturas_y_vehiculos`, `packs_iniciales`,
   `productos_comerciales`) y el PDF oficial.
2. Instalar las dependencias en una carpeta aparte:
   `py -m pip install --target pylib beautifulsoup4 pymupdf`.
3. Ejecutar:

```bash
py -I parse_equipment.py pylib html mundane.json
py -I parse_magic.py pylib SRD_CC_v5.1_ES.pdf magic.json
py -I build_items.py mundane.json magic.json ../../src/data/5e-SRD-Items.json
```

## Orden

No es alfabético. El equipo sigue el orden del capítulo de equipo del Manual del Jugador. El equipo
de aventuras se reparte en grupos prácticos (iluminación, contenedores, ropa…). Los objetos
mágicos se agrupan por categoría, en el orden de la Guía del Dungeon Master (armaduras, armas,
pociones, anillos, varas, pergaminos, bastones, varitas, objetos maravillosos, artefactos), y
dentro de cada una por rareza.

## Correcciones

- "Aguja de cerbatana" en la tabla de armas es la **Cerbatana**.
- Tienda de campaña: peso 20 lb (la web pone "Lb").
- Productos comerciales: "clavo no 1 cerdo" → "clavo o 1 cerdo"; "pimiento" → "pimienta".
- "prueba de Fortaleza" → "prueba de Fuerza"; "modificador por Fuera" → "modificador por Fuerza".
- Collar de plegarias: una fila de su tabla viene desordenada en el PDF y se corrige a mano.
