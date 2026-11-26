# 테스트

- `node tests/e2e/run.js [이름 일부]` — 브라우저 회귀 테스트 31개(정적 서버를 직접 띄움, Playwright 필요). 실패하면 종료 코드 1
- `node rough/test_engine.js` — 엔진 단위 테스트(소품 화면 판단 시험 포함)
- `node tools/eval_props.js [--holdout|--script] [--all]` — 소품이 화면에 보이는지(보임·화면 밖·언급만) 정확도와 틀린 문장. 문장 시험(`prop-presence*.json`) · `--script`: 씬 스크립트 컷 600개(`prop-script.json`은 `node tools/gen_prop_script_cases.js`로 만듦 + `prop-script-hand.json` 손으로 씀)를 컷 글 해석→컷 프롬프트까지 거쳐
- `node tools/eval_actions.js [--holdout] [--all]` — 동작·인물 해석(부정·시도·대조·참음·여러 동작·누가·대명사·무리·몸 일부·위치·시선·세기·장소·외형) 정확도. 시험 세트 `action-script.json` 67컷, 확인용 `action-script-holdout.json` 40컷(규칙 고칠 때 보지 않음). `rough/test_engine.js`에도 들어감
- `node tools/check_sfx_rules.js` — 효과음 추천 규칙의 단어가 소재 목록에 다 있는지
- GitHub Actions: `.github/workflows/e2e.yml`(rough·tests 변경 때), `db-check.yml`(DB·도구 변경 때)
