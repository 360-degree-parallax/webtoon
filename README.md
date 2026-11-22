# webtoon

웹툰 연출을 분석해 DB로 만들고, 그 DB를 연출 문법으로 써서 러프를 만드는 도구 모음입니다.

| 폴더 | 내용 |
|---|---|
| `analysis/` | 기존 웹툰 회차를 컷 단위로 나누고 샷·앵글·역할·감정·색·5컷 리듬을 기록하는 파이프라인 |
| `rough/` | 장면 글만 넣으면 감정·정점·연출 목적을 계산하고 DB에서 가장 닮은 5컷 패턴으로 세로 러프를 그리는 웹 툴. 엔진은 `rough/engine.js`, 설계는 `docs/rough-plan.md` |
| `docs/codebook.md` | 두 쪽이 함께 쓰는 코드표와 판정 규칙 |
| `cutlink.py` | 컷 ID로 원본 컷 이미지를 찾는 함수 (`cuts/` 필요) |
| `cuts/` | 원본 컷 이미지 (비공개 저장소 `webtoon-cut` 서브모듈) |

## 받기
```
git clone --recurse-submodules https://github.com/360-degree-parallax/webtoon
```
`cuts/`는 비공개 저장소라 접근 권한이 있어야 내려받아집니다. 권한이 없으면 비어 있고, 나머지 기능은 그대로 쓸 수 있습니다. 이미 받았다면 `git submodule update --init --depth 1`.

## 러프 툴 실행
```
python3 rough/serve.py
```
`http://localhost:8000/rough/` 가 열립니다. 장면만 적으면 판정·패턴·컷 배치가 자동으로 나오고, 틀린 값만 눌러서 고치면 됩니다.

엔진 판정 검증:
```
node rough/test_engine.js
```

## 컷 이미지 찾기
```
python3 cutlink.py GM-03-045
```

`rough/patterns.json`은 이두나!(DN)·녹빛자정의 연인(GM) 1~7화 244개 묶음의 구조 통계(샷·앵글·역할·감정·강도·컷 높이·여백 비율)만 담고, 작품 이미지나 대사는 담지 않습니다.

## 상태
- 분석: 두 작품 1~7화 완료 (1,497컷, 244묶음)
- 러프 툴: v1. 선택 없이 연산으로 러프 생성, 결과물(그림) 형태는 개발 중

### 컷 색 러프 생성

기본 생성 서버는 같은 컴퓨터에서 실행 중인 **ComfyUI**입니다. [공식 FLUX.2 Klein 4B 가이드](https://docs.comfy.org/tutorials/flux/flux-2-klein)의 Distilled Image Edit에 쓰는 모델 파일 세 개를 ComfyUI에 설치해주세요.

| ComfyUI 폴더 | 모델 파일 |
| --- | --- |
| `models/diffusion_models/` | `flux-2-klein-4b-fp8.safetensors` |
| `models/text_encoders/` | `qwen_3_4b.safetensors` |
| `models/vae/` | `flux2-vae.safetensors` |

ComfyUI의 주소가 `http://127.0.0.1:8188`이면, ComfyUI를 켠 상태에서 `python3 rough/serve.py`를 실행합니다. 예를 들어 ComfyUI가 8000번 포트에서 열린다면 러프 툴에는 다른 포트를 지정합니다.

```bash
COMFYUI_PORT=8000 python3 rough/serve.py --port 8001
```

**컷**에서 컷을 선택하고 **이미지 생성**을 누릅니다. 장면 공통 묘사와 캐릭터 참고 이미지는 선택 사항입니다. 스케치와 참고 이미지는 ComfyUI의 로컬 입력 폴더에 저장됩니다. 결과는 열린 러프 툴 탭에 유지되므로 PNG 또는 SVG로 저장해주세요.

Cloudflare 설정을 이미 마쳤다면 `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`이 있는 터미널에서 `ROUGH_IMAGE_PROVIDER=cloudflare python3 rough/serve.py`로 실행할 수 있습니다.
