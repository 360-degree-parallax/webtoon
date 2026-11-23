# 이미지 엔진 최적화 참고 연구 (2026-11)

컷 이미지로 샷·앵글·말풍선·감정·연출 기법을 판정하는 엔진을 개선할 때 쓸 수 있는 논문, 데이터셋, 방법론을 모았습니다.
제목, 학회, 연도는 웹 검색으로 확인했습니다. **[2차]**는 라이선스를 모델 카드나 aggregator에서만 본 것이므로 원본 LICENSE를 다시 확인해야 합니다.

## 1. 패널·말풍선·텍스트

| 자료 | 출처 | 쓸 곳 | 라이선스 |
|---|---|---|---|
| Manga109 / Manga109-s | MTAP 2017, IEEE MultiMedia 2020 | 패널·텍스트·얼굴·몸 박스 사전학습 | 학술 전용 / -s는 상업 실험 가능(조건부) |
| Magi v1–v3 (Sachdeva & Zisserman) | CVPR'24 · ACCV'24 · ICCV'25 | 패널·텍스트·말풍선 꼬리·화자 연결·읽기 순서 통합 모델 → 오프라인 교사 모델 | 학술 연구 전용 |
| Dubray & Laubrock, 말풍선 분할 | ICDAR 2019 (arXiv 1902.08137) | 꼬리 포함 말풍선 U-Net, F1 0.94 이상 | 저장소 확인 필요 |
| comic-text-detector | GitHub dmMaze | 글자 마스크 → 말풍선 확인 | GPL-3.0 [2차] |
| Manga109Dialog | ICME 2024 | 화자-대사 13만 쌍 → 반응 컷·숏/리버스숏 판정 | Manga109 조건 |
| eBDtheque | ICDAR 2013 | 말풍선 형태·읽기 순서 평가 | 비상업, 신청 필요 |
| DCM772 | J. Imaging 2018 | 퍼블릭 도메인 코믹스 박스 | 원화 PD |

웹툰 전용 논문은 찾지 못했습니다. 세로 스크롤 웹툰은 여백 슬라이싱으로 컷 분할이 대부분 해결되고, 학습이 필요한 부분은 블리드·겹침·사선 컷 정도입니다.

## 2. 샷 사이즈·카메라 앵글

| 자료 | 출처 | 핵심 |
|---|---|---|
| MovieShots / SGNet | ECCV 2020 | 샷 스케일 5단계. 피사체 맵을 가이드로 씀 → 얼굴·몸 면적 비율을 특징으로 |
| CineScale | Data in Brief 2021 | 9클래스 스케일, 연구 계약 필요, 재배포 금지 |
| CineScale2 | Data in Brief 2023 | angle 5종(Overhead/High/Neutral/Low/Dutch) → 우리 체계와 거의 1:1. Dutch(사선) 추가 검토 |
| ShotBench / ShotVL | NeurIPS 2025 | GPT-4o의 샷 판단 정확도 60% 미만 → 범용 VLM 단독 라벨러는 믿기 어려움 |
| Zooming into Comics | arXiv 2511.06490 | VLM이 "크게 그려진 캐릭터 = 가깝다"고 착각 → SD·효과 배경 컷 주의 |

만화 컷의 샷·앵글 분류를 직접 다룬 논문은 찾지 못했습니다. 비어 있는 영역이라 우리 데이터셋 자체가 기여가 될 수 있습니다.

## 3. 얼굴·감정

- **anime-face-detector**(hysts): 얼굴 박스와 랜드마크 28점, MIT [2차]. 얼굴 면적/컷 면적은 클로즈업 판별의 가장 강한 특징이고, 랜드마크 기울기는 앵글 단서가 됩니다.
- **VisEmoComic**(ICPR 2024): 캐릭터 단위 7감정. **EmoRecCom**(ICDAR 2021): 장면 8감정 멀티라벨, 이미지와 대사를 함께 씀.
  → 감정은 **멀티라벨에 글과 그림을 융합**해야 합니다. 지금 텍스트만 쓰는 판정의 22%는 이 구조적 한계 탓이기도 합니다.

## 4. 시퀀스·서사 구조

- **Visual Narrative Engine**(Martens, Cardona-Rivera, Cohn, ACS 2020): VNG를 계산 모델로 형식화했습니다.
- **Drawing Insights**(BMVC 2024, Cohn 공저): 패널 임베딩 위에 시퀀스 트랜스포머 → 5컷 연출 기법 분류 구조의 참고가 됩니다.
- **Panel Transitions for Genre Analysis**(arXiv 2312.08720): McCloud 전환 라벨.
- **CoMix**(NeurIPS 2024 D&B), **ComicsPAP**(ICDAR 2025), 서베이 **LoCU**(arXiv 2409.09502).
- **MangaUB**(2024), **MangaLMM**(2025): LMM은 단일 컷 인식은 괜찮지만 감정과 다중 컷 이해에 약합니다.
- 웹툰 스크롤 페이싱 실증 연구는 찾지 못했습니다. 컷 간격과 연출 기법의 상관 분석은 새로운 기여가 될 수 있습니다.

## 5. 방법론 (5천 컷 규모)

- **임베딩 고정 + 가벼운 헤드**: SigLIP/DINOv2 임베딩 위에 로지스틱 회귀나 kNN → 이후 LoRA.
- **작품 단위 교차검증**(5작품 leave-one-out)으로 화풍 일반화를 확인. 지표는 macro-F1, Cohen kappa, 순서형은 가중 kappa.
- **순서형 라벨**: CORAL(2020)과 CORN(2023)으로 강도 1~3과 샷 크기(설정→디테일)를 학습.
- **사람 사이 불일치**: Peterson et al. ICCV 2019(CIFAR-10H) 방식으로 어노테이터 분포를 soft label로 씀. 모델 성능은 사람 간 일치도(감정 kappa 0.47)를 천장으로 놓고 보고.
- **라벨 감사**: Confident Learning(cleanlab, JAIR 2021), Dawid-Skene → 의심 라벨만 다시 보기. ← 이번 앵글 오류 7%를 자동으로 찾는 방법.
- **능동학습**: 처음에는 대표성 샘플링(TypiClust, ICML 2022), 이후에는 불확실도·위원회 불일치 순.
- **감정 14종**: valence/arousal 축이나 6~8개 상위 범주로 계층화해 함께 보고.
- **레이아웃**: Cao et al. SIGGRAPH Asia 2012, SIGGRAPH 2014의 "중요도 → 패널 크기" 모델을 웹툰의 "강도·역할 → 컷 높이·간격" 통계 규칙으로 옮김.

## 6. 실행 계획

**A. 1~3주**
1. 3,668장 컷 이미지의 SigLIP·DINOv2 임베딩 → 샷·앵글 선형 프로브, 작품 단위 교차검증.
2. **앵글·샷 감사 큐**: 모델과 사람 라벨이 크게 어긋나는 컷만 모음(cleanlab). 이번 수작업 재검수를 자동화하는 단계.
3. 얼굴 비율·랜드마크 특징 추가(MovieShots 아이디어).
4. 브라우저에는 미리 계산한 결과(JSON)만 올리고, 새 이미지 분석이 필요할 때만 transformers.js와 양자화 ONNX를 씀.

**B. 1~2개월**
5. 말풍선 검출기 교체: 500~800컷 박스 주석(Magi·comic-text-detector로 반자동) → Apache 계열 소형 검출기(RT-DETR, YOLOX 등). 목표는 정확 개수 일치율 73% → 90%.
6. 강도·샷을 CORN 순서형으로 학습하고, 감정은 soft label로.
7. 감정 멀티모달화: 대사와 컷·얼굴 임베딩을 결합(EmoRecCom 방식).
8. 새 작품이 들어오면 능동학습 큐로 라벨링.

**C. 3개월 이상**
9. 5컷 기법·VNG 시퀀스 모델(BMVC'24 구조).
10. VLM(MangaLMM, ShotVL)은 서술형 근거를 내는 세컨드 오피니언으로만 씀.
11. 기법별 컷 높이·간격 통계로 레이아웃 제안.
12. 주석과 임베딩만 공개하는 데이터셋 검토.

## 라이선스 유의

- Manga109(학술 전용)와 Magi(학술 연구 전용)로 학습한 가중치는 공개 사이트에 배포하지 않습니다. 오프라인 비교와 교사 모델로만 씁니다.
- CineScale 계열은 재배포와 2차 저작물 금지 → 내부 실험에만 씁니다.
- Ultralytics YOLO는 AGPL-3.0 [2차] → 배포 모델로는 피합니다.

찾지 못한 것: "Comic Transformer", "EmoMangaset", "ComicBERT"라는 이름의 자료, 웹툰 스크롤 페이싱 실증 연구, 만화 샷·앵글 분류 논문.
