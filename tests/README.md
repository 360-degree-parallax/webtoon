# 테스트

- `node tests/e2e/run.js [이름 일부]` — 브라우저 회귀 테스트 31개(정적 서버를 직접 띄움, Playwright 필요). 실패하면 종료 코드 1
- `node rough/test_engine.js` — 엔진 단위 테스트(소품 화면 판단 시험 포함)
- `node tools/eval_props.js [--holdout|--script] [--all]` — 소품이 화면에 보이는지(보임·화면 밖·언급만) 정확도와 틀린 문장. 문장 시험(`prop-presence*.json`) · `--script`: 씬 스크립트 컷 600개(`prop-script.json`은 `node tools/gen_prop_script_cases.js`로 만듦 + `prop-script-hand.json` 손으로 씀)를 컷 글 해석→컷 프롬프트까지 거쳐
- `node tools/check_sfx_rules.js` — 효과음 추천 규칙의 단어가 소재 목록에 다 있는지
- GitHub Actions: `.github/workflows/e2e.yml`(rough·tests 변경 때), `db-check.yml`(DB·도구 변경 때)
