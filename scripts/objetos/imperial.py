"""Metric -> imperial for the official Spanish SRD texts, so every measurement in the app reads
like the manual (feet, pounds, miles). Uses the official Spanish factors in reverse:
30 cm = 1 pie, 0,5 kg = 1 libra, 1,5 km = 1 milla, 2,5 cm = 1 pulgada, 30 g = 1 onza, 4 l = 1 galón.
"""
import re

# Spots where a plain conversion would read wrong, checked against the English SRD.
EXACT = [
    # Staff of power / staff of the magi retributive strike table (its cells are also scrambled by the PDF)
    ("| Distancia del origen | Daño |\n|---|---|\n| 3 m de distancia o más | 8 veces el número de cargas |\n| cerca | del bastón |\n"
     "| De 4 m a 6 m de | 6 veces el número de cargas |\n| distancia | del bastón |\n| De 7 m a 9 m de | 4 veces el número de cargas |\n| distancia | del bastón |",
     "| Distancia del origen | Daño |\n|---|---|\n| 10 pies o menos | 8 veces el número de cargas del bastón |\n"
     "| De 11 a 20 pies | 6 veces el número de cargas del bastón |\n| De 21 a 30 pies | 4 veces el número de cargas del bastón |"),
    ("1d3 × 30 cm", "1d3 pies"),
    ("un número de metros máximo igual a 1,5 ×", "un número de pies máximo igual a 5 ×"),
    ("una cantidad de metros adicionales igual a 3 ×", "una cantidad de pies adicionales igual a 10 ×"),
    ("un alcance expresado en metros", "un alcance expresado en pies"),
    ("30 g + 1d6 × 30 g", "1 onza + 1d6 onzas"),
    ("0,03 m³", "1 pie cúbico"),
    ("0,06 m³", "2 pies cúbicos"),
    ("0,2 m³", "8 pies cúbicos"),
    ("280 m³", "10 000 pies cúbicos"),
    ("2 m³", "64 pies cúbicos"),
    ("2 cm de diámetro", "3/4 de pulgada de diámetro"),
    ("250 g más 125 g", "1/2 libra más 1/4 de libra"),
    ("pesan 250 g", "pesan 1/2 libra"),
    ("pesa 250 g", "pesa 1/2 libra"),
]

UNITS = {
    # unit: (factor to imperial, singular, plural)
    "km/h": (1 / 1.5, "milla por hora", "millas por hora"),
    "km": (1 / 1.5, "milla", "millas"),
    "m²": (1 / 0.09, "pie cuadrado", "pies cuadrados"),
    "cm": (None, None, None),  # feet or inches, see below
    "m": (1 / 0.3, "pie", "pies"),
    "kg": (2, "libra", "libras"),
    "g": (1 / 30, "onza", "onzas"),
    "l": (None, None, None),  # pints or gallons
}
RX = re.compile(r"(?<![\d,])(\d+(?:,\d+)?) (km/h|km|m²|cm|m|kg|g|l)(?![\wáéíóúñ²³/])")
FRACTIONS = {0.25: "1/4", 0.5: "1/2", 0.75: "3/4"}


def fmt(v):
    v = round(v * 4) / 4  # quarter precision is plenty for rules text
    whole, frac = int(v), v - int(v)
    if frac == 0:
        return f"{whole:,}".replace(",", " ") if whole >= 10000 else str(whole)
    f = FRACTIONS[frac]
    return f if whole == 0 else f"{whole} {f}"


def word(v, singular, plural):
    return singular if v <= 1 else plural  # "1 pie", "1/2 milla"


def convert_one(m):
    value = float(m.group(1).replace(",", "."))
    unit = m.group(2)
    if unit == "cm":
        if value % 30 == 0:
            v = value / 30
            return f"{fmt(v)} {word(v, 'pie', 'pies')}"
        v = value / 2.5
        return f"{fmt(v)} {word(v, 'pulgada', 'pulgadas')}"
    if unit == "l":
        if value < 4:
            v = value / 0.5
            return f"{fmt(v)} {word(v, 'pinta', 'pintas')}"
        v = value / 4
        return f"{fmt(v)} {word(v, 'galón', 'galones')}"
    factor, singular, plural = UNITS[unit]
    v = value * factor
    return f"{fmt(v)} {word(round(v * 4) / 4, singular, plural)}"


def to_imperial(text):
    for a, b in EXACT:
        text = text.replace(a, b)
    return RX.sub(convert_one, text)
