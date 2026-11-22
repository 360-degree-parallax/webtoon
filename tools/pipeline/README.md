# 연출 DB 수집 파이프라인

네이버웹툰 회차를 받아 컷으로 나누고, 손으로 쓴 판정(notes · scenes · annx)과 합쳐 연출 DB 행과 러프 툴용 컷 이미지를 만든다.
HC · HN · MD 10화씩을 이 스크립트로 만들었다. GM은 이전 버전으로 만들어서 notes 형식만 같다.

권리자 허락을 받은 작품만 공개 저장소에 컷 이미지를 올린다.

## 준비

```bash
pip install pillow numpy opencv-python-headless openpyxl
```

작업 폴더는 저장소 밖 아무 곳이나 쓴다(받은 원본 회차 이미지는 저장소에 넣지 않는다).
작품 접두어는 환경 변수 `P`(소문자)로 준다: `hc`, `hn`, `md`. 새 작품은 `hpipe.py`의 `NAME`, `hc_cuts.py`의 `TID`·`NAME`에 추가한다.

## 순서 (작품 md, 8화 예)

| 단계 | 명령 | 결과 |
|---|---|---|
| 1. 받기 | `bash fetch.sh 849913 8 md` | `md/8/strip.png` (회차 전체를 세로로 이은 그림) |
| 2. 나누기 | `P=md python3 hseg.py 8` | `md8_seg.json` (빈 줄로 나눈 블록) |
| 3. 보기용 시트 | `P=md python3 hsheets.py 8` | `md8_sheet_0.jpg …` (블록 번호가 찍힌 시트) |
| 4. 판정 쓰기 | 손으로 | `md8_notes.txt`, `md8_scenes.txt`, `md8_annx.txt` (아래 형식) |
| 5. 덮었는지 확인 | `P=md python3 hcmap.py 8 [블록번호…]` | 빠진 블록·중복 수, 블록→컷 번호 |
| 6. 옛 묶음 보기 | `P=md python3 hold.py 8` | annx를 쓸 때 묶음별 그림 컷 수 |
| 7. 행 만들기 | `P=md python3 hpipe.py 8 write` | `md8_write.json` (컷표 · 5컷 리듬 · 장면 · 컬러 띠) |
| 8. 값 검사 | `python3 check_pre.py md8_write.json` | 정해진 값 밖·VNG 칸 수 불일치 |
| 9. 리듬 열 변환 | `P=md python3 hc_taxo.py 8` | 5컷 리듬을 27열 형식으로 |
| 10. 컷 이미지 | `P=md python3 hc_cuts.py 8` | `rough/cuts/MD/08/*.jpg`, `index.json`·`manifest.csv` 갱신, 칸·말풍선 판정 |
| 11. DB용 파일 | `P=md python3 hmulti.py 7 8 9 10` | `md7_8_9_10_imp.xlsx` (시트에 가져오기용) |

`notes/`에 있는 판정 파일은 작업 폴더에 같은 이름이 없으면 자동으로 읽는다. 그래서 다시 만들 때는 1·2·7~10단계만 하면 된다.
`hc_cuts.py`는 기본으로 저장소의 `rough/cuts/`에 쓴다(`ROUGH_CUTS`로 바꿀 수 있음).

## 판정 파일 형식

- **notes** 한 줄 = 블록 범위 하나: `블록범위|유형|샷|앵글|역할|감정|강도|세부|블록내컷|말풍선|밀도|내용|장면키`
  - 크레딧·광고는 `a-b|X`
  - 역할은 설정·전개·공개·반응·전환 중 하나. 회상은 감정 칸에만 쓴다.
- **scenes**: `S01|이름|시작 상태|끝 상태|전환점 컷번호`
- **annx**: `Gnn|연출명|리듬|의도|VNG(→로 구분, 개수 = 그 묶음 그림 컷 수)|컷 전환`
  - 연출명·컷 전환은 `check_pre.py`의 NAME·TR 목록 안에서 고른다. 그림 컷 2개 이하 묶음은 연출명을 비워도 된다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `fetch.sh` | 회차 이미지 받기·잇기 |
| `seg2.py`, `hseg.py` | 블록 나누기 |
| `bsheet.py`, `hsheets.py` | 블록 시트 그리기 |
| `hcmap.py`, `hold.py`, `hgl.py` | 판정 확인 도우미 |
| `hpipe.py` | 판정 + 그림 측정(색·높이·여백) → DB 행 |
| `check_pre.py` | 넣기 전 값 검사 |
| `hc_taxo.py`, `taxo.json` | 5컷 리듬 분류(리듬 유형·템포 기준값) |
| `panels.py`, `hc_cuts.py` | 칸 모양·말풍선 판정, 컷 이미지 저장 |
| `hmulti.py` | 여러 화를 xlsx 한 파일로 |
| `notes/` | 작품별·화별 손 판정 원본 |
