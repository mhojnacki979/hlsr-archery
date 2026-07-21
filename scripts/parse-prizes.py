#!/usr/bin/env python3
"""
Turn the HLSR committee's prize workbook into the JSON the site reads.

    python3 scripts/parse-prizes.py "/path/to/Archery COMPLETE 2026.xlsx" 2025

Layout, per sheet, repeated in stacked blocks:

    row n   | "TARGET - JUNIOR - FEMALE" ... col 9 = bow class ("NASP")
    row n+1 | column headers (Finish, Reg ID, ..., Cash, License, Buckle, ...)
    row n+2 | finishers, lowest place first (4TH, 3RD, Reserve, Grand Champion)
    blank   | separates blocks

The BLOCK HEADER is the class, not the per-row columns. Two reasons this matters:

  * "3D - JUNIOR - OPEN" blocks are mixed-gender — one prize ladder shared by
    male and female archers. The per-row Gender column is the individual's
    gender, so keying on it shatters one ladder across several classes.
  * A place with no archer yet (Reg ID 0, no name) still carries its prize.
    Keying on per-row metadata drops those rows and undercounts the ladder.

Output: src/data/hlsr/prizes-<year>.json
    { "3D|Junior|Open|Recurve": { "1": {"cash": 750, "trophy": "Trophy"} } }
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

FINISH_TO_PLACE = {
    "GRAND CHAMPION": 1,
    "RESERVE CHAMPION": 2,
    "3RD": 3,
    "4TH": 4,
    "5TH": 5,
    "6TH": 6,
    "7TH": 7,
    "8TH": 8,
}

BLOCK_TITLE = re.compile(r"^(3D|TARGET)\s*-\s*(JUNIOR|INTERMEDIATE|SENIOR)\s*-\s*(MALE|FEMALE|OPEN)$")

COL_FINISH = 0
COL_BOW_IN_HEADER = 9
COL_CASH, COL_LICENSE, COL_BUCKLE, COL_COOLER, COL_TROPHY = 9, 10, 11, 12, 13

# Bow labels are inconsistently cased between sheets; normalise to title case.
BOW_CANON = {
    "OPEN COMPOUND": "Open Compound",
    "PINS COMPOUND": "Pins Compound",
    "NASP": "NASP",
    "RECURVE": "Recurve",
    "BAREBOW": "Barebow",
    "OLYMPIC RECURVE": "Olympic Recurve",
    "BAREBOW RECURVE": "Barebow Recurve",
}


def text(value) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return ""
    return str(value).strip()


def money(value):
    raw = text(value).replace("$", "").replace(",", "")
    try:
        return int(float(raw))
    except ValueError:
        return None


def award_from(row) -> dict:
    award = {}
    cash = money(row.get(COL_CASH))
    if cash:
        award["cash"] = cash
    for key, col in (
        ("license", COL_LICENSE),
        ("buckle", COL_BUCKLE),
        ("cooler", COL_COOLER),
        ("trophy", COL_TROPHY),
    ):
        value = text(row.get(col))
        if value:
            award[key] = value
    return award


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: parse-prizes.py <workbook.xlsx> [year]")
    workbook = Path(sys.argv[1])
    year = sys.argv[2] if len(sys.argv) > 2 else "2025"

    sheets = pd.read_excel(workbook, sheet_name=None, header=None)
    prizes: dict[str, dict[str, dict]] = {}
    winners: dict[str, dict[str, str]] = {}
    blocks = 0

    for name, df in sheets.items():
        if name == "RAW DATA":
            continue
        class_key = None
        for i in range(len(df)):
            row = df.iloc[i]
            first = text(row.get(COL_FINISH))
            title = BLOCK_TITLE.match(first.upper())

            if title is not None:
                division, age, gender = title.groups()
                bow_raw = text(row.get(COL_BOW_IN_HEADER))
                bow = BOW_CANON.get(bow_raw.upper(), bow_raw)
                division = "3D" if division == "3D" else "Target"
                class_key = f"{division}|{age.title()}|{gender.title()}|{bow}"
                prizes.setdefault(class_key, {})
                blocks += 1
                continue

            if class_key is None:
                continue
            place = FINISH_TO_PLACE.get(first.upper())
            if place is None:
                continue

            award = award_from(row)
            if award:
                prizes[class_key][str(place)] = award
            # Record the archer for validating results against the sheet.
            archer = f"{text(row.get(2))} {text(row.get(3))}".strip()
            if archer:
                winners.setdefault(class_key, {})[str(place)] = archer

    out_dir = Path(__file__).resolve().parent.parent / "src" / "data" / "hlsr"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"prizes-{year}.json").write_text(
        json.dumps(prizes, indent=1, sort_keys=True) + "\n"
    )
    # Kept out of the app bundle; used by the results-vs-sheet check.
    (out_dir / f"recorded-winners-{year}.json").write_text(
        json.dumps(winners, indent=1, sort_keys=True) + "\n"
    )

    places = sum(len(v) for v in prizes.values())
    print(f"{blocks} blocks -> {len(prizes)} prize classes, {places} awarded places")
    print(f"recorded finishers for {len(winners)} classes")


if __name__ == "__main__":
    main()
