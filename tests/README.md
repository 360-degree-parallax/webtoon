# 테스트

- `node tests/e2e/run.js [이름 일부]` — 브라우저 회귀 테스트 31개(정적 서버를 직접 띄움, Playwright 필요). 실패하면 종료 코드 1
- `node rough/test_engine.js` — 엔진 단위 테스트
- `node tools/check_sfx_rules.js` — 효과음 추천 규칙의 단어가 소재 목록에 다 있는지
- GitHub Actions: `.github/workflows/e2e.yml`(rough·tests 변경 때), `db-check.yml`(DB·도구 변경 때)
