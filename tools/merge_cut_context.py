#!/usr/bin/env python3
"""컷ID로 분석 CSV를 러프 툴의 컷표에 합친다."""

import csv
import json
from pathlib import Path
from tempfile import NamedTemporaryFile


ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "rough" / "db" / "db.json"
CONTEXT_DIR = ROOT / "analysis" / "cut-context"
NARRATIVE_FIELDS = {
    "상세 내용과 연출": "내용과_연출",
    "상세 내용 근거": "내용_근거",
    "상세 구도와 인물 크기": "구도_인물크기",
    "상세 인물 크기 근거": "인물크기_근거",
    "상세 그림 밀도": "밀도",
    "상세 색과 명암": "색과_명암",
    "상세 색 분석 영역": "분석_색영역",
    "상세 식자와 효과": "식자와_효과",
    "상세 감정 기록": "감정_기록",
    "상세 앞뒤 흐름과 여백": "앞뒤_흐름과_여백",
    "상세 장면과 묶음": "장면과_묶음",
}
DETAIL_FIELDS = {
    "상세 컷 상단 색": "edge_top_rgb",
    "상세 컷 하단 색": "edge_bottom_rgb",
}
ALL_FIELDS = list(NARRATIVE_FIELDS) + list(DETAIL_FIELDS)
UNWRITTEN = "블록 유형과 화면 측정 · 구체 내용 미서술"


def read_by_cut(paths):
    indexed = {}
    for path in paths:
        with path.open(encoding="utf-8-sig", newline="") as source:
            for record in csv.DictReader(source):
                cut_id = record["cut_id"]
                if not cut_id or cut_id in indexed:
                    raise ValueError(f"{path}: 빈 컷 ID 또는 중복 ID ({cut_id})")
                indexed[cut_id] = record
    return indexed


def cut_values(narrative, detail):
    if narrative is None:
        return [None] * len(ALL_FIELDS)
    values = {column: narrative[field] or None for column, field in NARRATIVE_FIELDS.items()}
    if narrative["내용_근거"] == UNWRITTEN:
        values["상세 내용과 연출"] = None
    for column, field in DETAIL_FIELDS.items():
        rgb = detail[field]
        values[column] = f"#{rgb.upper()}" if rgb else None
    return [values[column] for column in ALL_FIELDS]


def main():
    narrative = read_by_cut(sorted(CONTEXT_DIR.glob("narrative-*.csv")))
    details = read_by_cut(sorted((CONTEXT_DIR / "detail").glob("detail-*.csv")))
    if not narrative or narrative.keys() != details.keys():
        raise ValueError("서술 CSV와 상세 분석 CSV의 컷 ID 목록이 다릅니다.")

    db = json.loads(DB_PATH.read_text(encoding="utf-8"))
    table = db["컷표"]
    columns = table["columns"]
    rows = table["rows"]
    cut_index = columns.index("컷ID")
    db_ids = [row[cut_index] for row in rows]
    if len(db_ids) != len(set(db_ids)) or not all(db_ids):
        raise ValueError("기존 컷표에 빈 컷 ID 또는 중복 ID가 있습니다.")
    missing = narrative.keys() - set(db_ids)
    if missing:
        raise ValueError(f"기존 컷표에 없는 분석 컷: {', '.join(sorted(missing)[:10])}")

    kept = [index for index, column in enumerate(columns) if column not in ALL_FIELDS]
    table["columns"] = [columns[index] for index in kept] + ALL_FIELDS
    table["rows"] = [
        [row[index] for index in kept] + cut_values(narrative.get(cut_id), details.get(cut_id))
        for row, cut_id in zip(rows, db_ids)
    ]
    rendered = json.dumps(db, ensure_ascii=False, separators=(",", ":"))
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=DB_PATH.parent, delete=False) as output:
        temp_path = Path(output.name)
        try:
            output.write(rendered)
            output.close()
            temp_path.chmod(DB_PATH.stat().st_mode & 0o777)
            temp_path.replace(DB_PATH)
        finally:
            temp_path.unlink(missing_ok=True)
    print(f"컷표 {len(rows):,}행 유지 · 상세 분석 {len(narrative):,}행 연결")


if __name__ == "__main__":
    main()
