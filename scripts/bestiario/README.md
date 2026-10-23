# Bestiario: cómo se genera `src/data/5e-SRD-Monsters.json`

Fuente principal: el **SRD 5.1 en español** de Nosolorol Ediciones (traducción de Ana Navalón),
publicado en <https://srd.nosolorol.com/DD5/bestiario_index.html> bajo la Open Game License v1.0a.
El SRD 5.1 en inglés de [5e-bits/5e-database](https://github.com/5e-bits/5e-database) se usa solo
como referencia para detectar erratas y completar lo que falta.

## Pasos

1. Descargar las 316 fichas del índice del bestiario a una carpeta `html/`, con el nombre de la
   ruta y `/` sustituida por `_` (por ejemplo `monstruos/drow.html` → `monstruos_drow.html`).
   La lista de rutas va en `paths.txt`, una por línea. Las URL con tildes hay que pedirlas
   codificadas en UTF-8.
2. Instalar BeautifulSoup en una carpeta aparte: `py -m pip install --target pylib beautifulsoup4`.
3. Ejecutar:

```bash
py -I parse_es.py pylib html paths.txt es.json
py -I match.py es.json 5e-SRD-Monsters.en.json matches.json
py -I build.py es.json 5e-SRD-Monsters.en.json matches.json extras_es.json ../../src/data/5e-SRD-Monsters.json
```

- `parse_es.py` convierte cada ficha en JSON (Markdown para cursivas y negritas).
- `match.py` empareja cada criatura con la inglesa por sus seis características.
- `build.py` aplica las correcciones y genera el archivo final.

## Correcciones que aplica `build.py`

- La página "Dragón de bronce joven" de la web contiene en realidad el **dragón de cobre joven**:
  se renombra y se añade el bronce joven auténtico.
- La **Draña** (drider) da error 404 en la web: se añade traducida (`extras_es.json`).
- Los PX se calculan siempre a partir del desafío (la web tiene erratas como "1 500" por "15 000").
- Los dados de golpe que no cuadran con los PG se toman del SRD inglés (Sahuagín).
- Las sub-opciones (alientos de dragón, rugidos de esfinge, debilidades de vampiro) se agrupan
  dentro de la acción o rasgo al que pertenecen.
- Se quitan restos de maquetación del libro ("### FIN CDT ###", "página XXX").
