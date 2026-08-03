# Docling 초벌 계약

`scripts/run_docling.py`를 변환 버전과 Docling CLI 옵션의 단일 진실 공급원으로 사용한다. 이 문서는 호출과 bundle 판정 계약을 정의한다.

## 실행 인터페이스

저장소 루트에서 다음 인터페이스를 사용한다.

```bash
mise exec -- python .agents/skills/import-book/scripts/run_docling.py /absolute/path/to/book.pdf --book-slug book-slug --output-root /absolute/path/to/output/pdf/import-book
```

- 기존 초벌을 지정하려면 `--existing-dir /absolute/path/to/bundle`을 추가한다.
- 같은 PDF를 새로 변환하려는 사용자 지시가 있으면 `--force`를 추가한다.
- `--dry-run`은 실행 명령과 예정 경로만 검증한다.

새 실행은 `<output-root>/<book-slug>/<sha12>-<UTC timestamp>/`에 저장한다. 같은 PDF 해시의 manifest와 bundle이 모두 유효하면 가장 최근 실행을 재사용한다. 강제 실행은 새 timestamp 디렉터리에 저장한다.

## 유효한 bundle

다음 조건을 모두 충족해야 한다.

- Docling Markdown이 존재하고 비어 있지 않다.
- JSON의 `schema_name`이 `DoclingDocument`이고 `origin.filename`이 입력 PDF basename과 같다.
- JSON pages가 `1..pdf_tool.py page-count`로 연속되고 각 `page_no`가 key와 같다.
- Markdown과 JSON의 모든 로컬 image URI가 bundle 디렉터리 기준으로 존재한다.
- timing JSON에 `pipeline_total`이 있다.
- 새 실행은 exit code 0이고 manifest에 PDF SHA-256, 페이지 수, bundle 경로와 명령을 기록한다.

초벌 단계는 bundle의 완전성만 판정한다. heading level, code fence 경계와 OCR 정확성은 루트 에이전트가 PDF 대조로 확정한다.
