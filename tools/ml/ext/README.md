# 외부 학습 데이터(개인용·비상업)

원본·전처리 이미지는 저장소에 넣지 않음(~/rough-ext). 저장소에는 받는 법·라벨 매핑·전처리 코드만.

| 출처 | 라이선스 표기 | 받는 방법 | 쓰는 라벨 |
|---|---|---|---|
| szymonrucinski/types-of-film-shots (What a Shot) | CC BY 4.0 | 바로 받음 | 샷 크기 8종(사람 라벨 863장만, 학습분 5.3만 행은 이미지 없음) |
| Vchitect/ShotBench | Apache-2.0(영화 프레임) | 바로 받음 | 샷 크기·앵글·구도·프레이밍 |
| Vchitect/ShotQA | CC BY-NC-ND 4.0 | 로그인+동의(게이트) — 아직 안 받음 | 샷 크기·앵글·구도 등 약 7만 문항 |
| CineScale / CineScale2 | 연구용 동의서(재배포·파생 금지) | 등록 후 메일 링크 — 이 환경에서 접속 불가 | 샷 크기 9종 / 앵글 5종 |

라벨 매핑은 build_ext.py 맨 위 표(SHOT·ANGLE·COMP·FRAMING). 가슴 위(Medium Close Up)는 우리 기준 중경·클로즈업 경계라 `mcu=1`로 표시.
