# webtoon

웹툰 연출을 분석해 DB로 만들고, 그 DB를 연출 문법으로 써서 러프를 만드는 도구 모음입니다.

| 폴더 | 내용 |
|---|---|
| `analysis/` | 기존 웹툰 회차를 컷 단위로 나누고 샷·앵글·역할·감정·색·5컷 리듬을 기록하는 파이프라인 |
| `rough/` | 장면 비트와 원하는 리듬을 넣으면 DB의 실제 5컷 패턴을 골라 세로 러프를 그리는 웹 툴 (v0) |
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
`http://localhost:8000/rough/` 가 열립니다. `cuts/`가 있으면 고른 패턴의 원본 컷이 러프 아래에 함께 보입니다 (로컬에서만).

## 컷 이미지 찾기
```
python3 cutlink.py GM-03-045
``` `patterns.json`은 이두나!(DN)·녹빛자정의 연인(GM) 1~7화 244개 묶음의 구조 통계(샷·앵글·역할·감정·강도·컷 높이·여백 비율)만 담고, 작품 이미지나 대사는 담지 않습니다.

## 상태
- 분석: 두 작품 1~7화 완료 (1,497컷, 244묶음)
- 러프 툴: v0. 결과물 형태는 개발 중

### 컷 이미지 생성

Cloudflare Workers AI의 **FLUX.2 [klein] 4B**로 이미지를 생성합니다. Workers Free 계정에서 하루 10,000 Neurons의 무료 할당량을 공유합니다. 무료 할당량을 넘기면 Free 계정의 생성 요청은 실패합니다. [Cloudflare 요금표](https://developers.cloudflare.com/workers-ai/platform/pricing/)

[Cloudflare Workers AI REST API 설정](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)에서 계정 ID를 확인하고 Workers AI API 토큰을 생성합니다. `CLOUDFLARE_ACCOUNT_ID`와 `CLOUDFLARE_API_TOKEN`을 터미널 환경에 설정한 뒤 `python3 rough/serve.py`를 실행합니다. 토큰은 로컬 서버에서만 사용합니다.

**컷** 목록에서 컷을 선택하고 **이미지 생성**을 누르면 스케치와 샷·앵글·비율을 바탕으로 컬러 러프가 콘티에 들어갑니다. **이미지 생성 설정**에서 장면 공통 묘사와 직접 만든 캐릭터 참고 이미지 한 장을 추가할 수 있습니다. 창작 연출 카드의 구도는 텍스트 지시로 적용되고 작품 원본 컷은 API로 전송되지 않습니다.

생성된 그림 위에 기존 대사를 별도 레이어로 표시합니다. 컷별로 재생성하거나 스케치로 돌아갈 수 있습니다. 작업 중 이미지는 열린 탭에 유지되므로 페이지를 닫기 전에 PNG 또는 SVG로 저장하세요.
