"""컷 ID로 비공개 컷 이미지 저장소(webtoon-cut)의 원본 이미지를 찾는다.

이미지는 비공개 저장소 webtoon-cut 에 있고, 이 저장소에는 서브모듈(cuts/)로만 연결돼 있다.
권한이 있으면 서브모듈을 받아 쓴다:

    git clone --recurse-submodules https://github.com/360-degree-parallax/webtoon
    # 이미 받았다면: git submodule update --init --depth 1

권한이 없으면 cuts/ 가 비어 있고, 이 모듈은 FileNotFoundError 를 낸다.
다른 위치의 사본을 쓰려면 환경변수 WEBTOON_CUT_DIR 로 지정한다.

사용 예
    python3 cutlink.py GM-03-045            # 경로와 메타데이터 출력
    python3 cutlink.py --check              # manifest와 실제 파일 대조

    from cutlink import find_cut, cuts_of
    find_cut("DN-01-019")["path"]
    cuts_of(work="GM", episode=3, type="그림")
"""
import csv
import os
import sys
from functools import lru_cache
from pathlib import Path


def cut_dir() -> Path:
    env = os.environ.get("WEBTOON_CUT_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return (Path(__file__).resolve().parent / "cuts").resolve()


@lru_cache(maxsize=1)
def _manifest() -> dict:
    root = cut_dir()
    path = root / "manifest.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"manifest.csv를 찾지 못했습니다: {path}\n"
            "git submodule update --init --depth 1 로 cuts/ 를 받거나 WEBTOON_CUT_DIR 를 지정하세요 (비공개 저장소 접근 권한 필요)."
        )
    out = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            row["episode"] = int(row["episode"])
            for k in ("src_y", "height", "width"):
                row[k] = int(row[k])
            row["path"] = str(root / row["file"])
            out[row["cut_id"]] = row
    return out


def find_cut(cut_id: str) -> dict:
    """컷 ID 하나의 메타데이터와 이미지 절대 경로(path)를 돌려준다."""
    m = _manifest()
    if cut_id not in m:
        raise KeyError(f"manifest에 없는 컷 ID: {cut_id}")
    return m[cut_id]


def cuts_of(work: str | None = None, episode: int | None = None, type: str | None = None) -> list[dict]:
    """조건에 맞는 컷 목록 (컷 ID 순)."""
    rows = _manifest().values()
    return sorted(
        (r for r in rows
         if (work is None or r["work"] == work)
         and (episode is None or r["episode"] == episode)
         and (type is None or r["type"] == type)),
        key=lambda r: r["cut_id"],
    )


def check() -> int:
    missing = [r["cut_id"] for r in _manifest().values() if not Path(r["path"]).exists()]
    print(f"manifest {len(_manifest())}컷, 파일 없음 {len(missing)}컷")
    for cid in missing[:20]:
        print("  ", cid)
    return 1 if missing else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    if sys.argv[1] == "--check":
        sys.exit(check())
    for cid in sys.argv[1:]:
        r = find_cut(cid)
        print(f"{cid}\t{r['path']}\t{r['work']} {r['episode']}화 {r['type']} y={r['src_y']} h={r['height']}")
