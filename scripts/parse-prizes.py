#!/usr/bin/env python3
"""
Turn the HLSR committee's prize workbook into the JSON the site reads.

    python3 scripts/parse-prizes.py "/path/to/Archery COMPLETE 2026.xlsx"

The workbook has one sheet per age/gender group, each holding stacked blocks
(one per bow class). Every prize row carries its own Division / Age Class /
Gender / Bow Class columns, so the class key is read from the row itself rather
than parsed out of the block title.

Prizes are awarded by finishing position and are NOT uniform across classes —
Senior classes add a lifetime license, some pay cash for 4th/5th, recurve
classes pay no cash for 3rd. So every class keeps its own prize rows.

Output: src/data/hlsr/prizes-<year>.json
    { "3D|Junior|Female|Pins": { "1": {"cash": 750, "buckle": "Buckle", ...} } }
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

FINISH_TO_PLACE = {
    "Grand Champion": 1,
    "Reserve Champion": 2,
    "3RD": 3,
    "4TH": 4,
    "5TH": 5,
    "6TH": 6,
    "7TH": 7,
    "8TH": 8,
}

# Column positions within each prize block.
COL_FINISH, COL_GENDER, COL_BOW, COL_DIVISION, COL_AGE = 0, 5, 6, 7, 8
COL_CASH, COL_LICENSE, COL_BUCKLE, COL_COOLER, COL_TROPHY = 9, 10, 11, 12, 13


def text(value) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return ""
    return str(value).strip()


def money(value) -> int | None:
    raw = text(value).replace("$", "").replace(",", "")
    try:
        return int(float(raw))
    except ValueError:
        return None


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: parse-prizes.py <workbook.xlsx> [year]")
    workbook = Path(sys.argv[1])
    year = sys.argv[2] if len(sys.argv) > 2 else "2026"

    sheets = pd.read_excel(workbook, sheet_name=None, header=None)
    prizes: dict[str, dict[str, dict]] = {}
    conflicts: list[str] = []

    for name, df in sheets.items():
        if name == "RAW DATA":
            continue
        for i in range(len(df)):
            row = df.iloc[i]
            place = FINISH_TO_PLACE.get(text(row.get(COL_FINISH)))
            if place is None:
                continue
            division = text(row.get(COL_DIVISION))
            age = text(row.get(COL_AGE))
            gender = text(row.get(COL_GENDER))
            bow = text(row.get(COL_BOW))
            if not (division and age and bow):
                continue

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
            if not award:
                continue

            class_key = f"{division}|{age}|{gender}|{bow}"
            bucket = prizes.setdefault(class_key, {})
            existing = bucket.get(str(place))
            if existing is not None and existing != award:
                conflicts.append(f"{class_key} place {place}: {existing} vs {award}")
            bucket[str(place)] = award

    out_dir = Path(__file__).resolve().parent.parent / "src" / "data" / "hlsr"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"prizes-{year}.json"
    out_file.write_text(json.dumps(prizes, indent=1, sort_keys=True) + "\n")

    places = sum(len(v) for v in prizes.values())
    print(f"{len(prizes)} prize classes, {places} awarded places -> {out_file.name}")
    if conflicts:
        print(f"WARNING: {len(conflicts)} conflicting rows:")
        for c in conflicts[:10]:
            print("   ", c)


if __name__ == "__main__":
    main()
