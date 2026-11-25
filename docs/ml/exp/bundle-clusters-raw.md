# T5 5컷 묶음 군집

묶음 1344개 · 연출명 15종. 사람 라벨 없이 컷 모양·그림 임베딩만으로 KMeans.

작품과의 NMI(k=25): 0.452 — 높을수록 화풍으로 묶였다는 뜻. 옵션: --raw

| k | 실루엣 | 연출명과 NMI | ARI |
|---|---|---|---|
| 10 | 0.034 | 0.055 | 0.014 |
| 15 | 0.033 | 0.057 | 0.010 |
| 20 | 0.030 | 0.076 | 0.011 |
| 25 | 0.037 | 0.089 | 0.013 |
| 30 | 0.031 | 0.093 | 0.012 |

무작위로 섞은 연출명과의 NMI(우연 수준): 0.046

## 군집 내용 (k=25)

| 군집 | 묶음 수 | 많은 연출명(비율) | 작품 분포 | 순도 |
|---|---|---|---|---|
| 0 | 53 | Color Shock 15%, Dramatic Irony 13%, Delayed Reveal 11% | GM40, HM8, HC4, YD1 | 15% |
| 1 | 32 | Delayed Reveal 25%, Bridge 16%, Reaction Framing 12% | SL29, YD2, HM1 | 25% |
| 2 | 63 | Insert 22%, Bridge 22%, Montage 11% | HN25, MD10, YP9, YD7 | 22% |
| 3 | 56 | Reaction Framing 27%, Delayed Reveal 14%, Walk and Talk 12% | MD20, YD20, YP5, DN3 | 27% |
| 4 | 45 | Delayed Reveal 24%, Fragmented Reveal 18%, Stretch 16% | HN32, DN3, HC3, YP3 | 24% |
| 5 | 108 | Delayed Reveal 21%, Reaction Framing 16%, Shot / Reverse Shot 15% | HM65, HN32, YD6, HC2 | 21% |
| 6 | 74 | Delayed Reveal 24%, Bridge 9%, Reaction Framing 9% | HN41, HC10, MD8, HM8 | 24% |
| 7 | 49 | Shot / Reverse Shot 33%, Push-in 14%, Fragmented Reveal 10% | YP46, DN1, YD1, SL1 | 33% |
| 8 | 55 | Delayed Reveal 16%, Fragmented Reveal 13%, Reaction Framing 13% | MD30, GM7, HN7, DN5 | 16% |
| 9 | 46 | Delayed Reveal 24%, Bridge 15%, Shot / Reverse Shot 11% | YP14, HC12, HN7, YD6 | 24% |
| 10 | 92 | Shot / Reverse Shot 26%, Dramatic Irony 15%, Delayed Reveal 15% | YD77, HM5, MD4, DN2 | 26% |
| 11 | 15 | Delayed Reveal 27%, Bridge 13%, Push-in 13% | HM4, HC3, SL3, GM2 | 27% |
| 12 | 19 | Reaction Framing 26%, Delayed Reveal 26%, Bridge 11% | YP10, SL5, YD2, HC1 | 26% |
| 13 | 41 | Shot / Reverse Shot 17%, Insert 15%, Stretch 12% | GM40, MD1 | 17% |
| 14 | 1 | Insert 100% | YD1 | 100% |
| 15 | 50 | Reaction Framing 16%, Delayed Reveal 16%, Insert 16% | DN15, HN11, MD7, YP7 | 16% |
| 16 | 87 | Reaction Framing 23%, Delayed Reveal 17%, Shot / Reverse Shot 10% | MD81, YP4, DN1, HC1 | 23% |
| 17 | 50 | Bridge 30%, Montage 14%, Push-in 10% | GM9, HC9, YP9, YD9 | 30% |
| 18 | 88 | Bridge 14%, Push-in 12%, Shot / Reverse Shot 11% | DN84, MD2, HM1, SL1 | 14% |
| 19 | 66 | Push-in 21%, Shot / Reverse Shot 20%, Delayed Reveal 15% | SL63, HN1, YP1, HM1 | 21% |
| 20 | 49 | Delayed Reveal 18%, Reaction Framing 12%, Hold 12% | YD16, YP14, DN5, MD5 | 18% |
| 21 | 81 | Delayed Reveal 17%, Walk and Talk 17%, Reaction Framing 15% | HC73, MD3, YD2, DN1 | 17% |
| 22 | 54 | Delayed Reveal 20%, Color Shock 13%, Shot / Reverse Shot 13% | DN12, SL11, YD10, YP7 | 20% |
| 23 | 35 | Delayed Reveal 23%, Bridge 20%, Insert 11% | YP15, SL12, HN4, HC2 | 23% |
| 24 | 35 | Reaction Framing 20%, Delayed Reveal 17%, Fragmented Reveal 14% | YP34, HC1 | 20% |

군집 중심(앞 5컷의 높이/폭 · 인물 수, 표준화 값):

- 0: 높이 +0.7 +0.4 +0.6 +1.2 +0.6 · 인물 -0.0 +0.2 -0.3 -0.3 -0.5
- 1: 높이 -0.3 -0.1 -0.0 -0.2 +0.1 · 인물 +0.3 +0.3 +0.6 +0.3 +0.4
- 2: 높이 -0.5 -0.6 -0.3 -0.3 -0.1 · 인물 -0.7 -0.8 -0.7 -0.4 -0.5
- 3: 높이 +0.5 +0.4 +1.0 +0.5 +0.5 · 인물 +0.2 +0.6 +1.2 +0.8 +0.8
- 4: 높이 -0.2 +0.2 -0.1 -0.3 -0.6 · 인물 -0.6 -0.2 -0.1 -0.1 -0.8
- 5: 높이 +0.1 -0.3 -0.1 -0.1 -0.1 · 인물 +0.3 -0.1 +0.3 +0.1 +0.2
- 6: 높이 -0.3 +0.2 -0.2 -0.3 -0.2 · 인물 -0.4 -0.3 -0.5 -0.5 -0.4
- 7: 높이 -0.1 -0.3 -0.2 -0.3 -0.4 · 인물 +0.2 -0.1 +0.1 -0.0 -0.2
- 8: 높이 -0.3 -0.5 -0.6 -0.4 -0.6 · 인물 -0.1 -0.6 -0.6 -0.4 -0.6
- 9: 높이 +0.7 +0.1 +0.7 +0.5 +0.5 · 인물 -0.4 -0.2 +0.0 -0.1 -0.3
- 10: 높이 +0.2 +0.4 +0.1 +0.1 +0.1 · 인물 +0.3 -0.1 -0.2 -0.2 -0.3
- 11: 높이 +0.3 +0.1 +1.8 +1.4 +4.7 · 인물 -0.3 -0.1 -0.0 -0.2 -0.0
- 12: 높이 +0.6 +0.3 -0.2 +0.1 -0.1 · 인물 +0.2 -0.4 -0.6 +0.4 +0.1
- 13: 높이 +0.4 -0.3 -0.5 -0.0 -0.2 · 인물 +0.5 -0.3 +0.1 +0.3 +0.2
- 14: 높이 +10.7 +11.5 +11.0 +10.1 +9.5 · 인물 -1.3 -1.4 -1.5 -1.4 -1.4
- 15: 높이 -0.1 -0.8 -0.5 -0.5 -0.4 · 인물 -0.0 -0.6 -0.3 -0.6 -0.5
- 16: 높이 +0.3 +0.0 -0.1 +0.0 +0.0 · 인물 +0.5 +0.4 +0.6 +0.5 +0.7
- 17: 높이 -0.3 +0.4 -0.2 -0.1 -0.0 · 인물 -0.7 +1.3 +0.3 +0.8 +0.7
- 18: 높이 -0.6 -0.7 -0.7 -0.5 -0.5 · 인물 +0.3 +0.2 -0.1 +0.1 +0.3
- 19: 높이 +0.4 +0.7 +0.8 +0.7 +0.4 · 인물 -0.2 +0.3 +0.1 +0.3 -0.1
- 20: 높이 -0.8 -0.2 -0.1 -0.1 -0.2 · 인물 -0.6 -0.0 +0.1 -0.2 +0.2
- 21: 높이 +0.2 +0.5 +0.2 +0.2 +0.2 · 인물 +0.4 +0.3 +0.2 +0.2 +0.3
- 22: 높이 -0.2 -0.1 -0.4 -0.7 -0.2 · 인물 +0.2 -0.1 -0.5 -0.8 -0.3
- 23: 높이 -0.3 +0.2 -0.2 -0.0 +0.2 · 인물 -0.6 -0.4 -0.6 -0.4 -0.0
- 24: 높이 -0.1 -0.1 +0.1 +0.1 -0.2 · 인물 +0.4 +0.4 +0.4 +0.3 +0.2
