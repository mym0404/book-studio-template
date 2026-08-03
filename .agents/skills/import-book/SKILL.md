---
name: import-book
description: "PDF 책을 Docling 초벌과 원문 대조를 거쳐 Fumadocs MDX로 가져온다."
---

# Import Book

PDF 한 권을 재개 가능한 Docling 초벌로 만든 뒤, 루트 에이전트가 **원문 추적성**을 유지하며 Fumadocs 문서로 가져온다. 입력부터 최종 대조까지 루트 에이전트가 직접 맡고, 책 전체의 표현 카탈로그를 먼저 잠근 뒤 섹션을 하나씩 작성·대조한다.

## 1. 입력과 충실도 계약 잠그기

1. 저장소 루트의 `AGENTS.md`, `.agents/knowledge/markdown-syntax.md`, `.agents/knowledge/book-mdx-structure.md`를 전체 읽는다.
2. 원본 PDF의 절대경로를 확인하고 `mise exec -- uv run .agents/skills/import-book/scripts/pdf_tool.py page-count /absolute/path/to/book.pdf`로 페이지 수를 확인한 뒤 안정적인 kebab-case book slug를 정한다.
3. 기존 대상은 같은 원본임을 확인한 뒤 재사용한다. 원본이나 내용이 다르면 쓰기 전에 사용자 결정을 받는다.
4. [fidelity-contract.md](references/fidelity-contract.md)를 전체 읽고 두 축의 선택을 확정한다.
5. 두 선택을 `충실도 계약`으로 기록해 전체 작업에 같은 값으로 적용한다.

완료 조건: PDF 경로·페이지 수·book slug·본문 모드·MDX 모드·기존 문서 충돌 여부가 모두 확정되어야 한다.

## 2. Docling 초벌 확정하기

1. [docling-contract.md](references/docling-contract.md)를 전체 읽는다.
2. `scripts/run_docling.py`에 확정한 입력을 전달하고 스크립트가 반환한 검증된 bundle만 사용한다.
3. 게시 MDX는 PDF 대조로 작성하고, bundle의 Markdown·JSON·이미지는 위치와 내용의 단서로 사용한다.

완료 조건: 스크립트가 `validated`, `reused`, `converted` 중 하나와 bundle 경로를 반환해야 한다.

## 3. 표현 카탈로그 잠그기

1. MDX 본문을 작성하기 전에 [representation-catalog-contract.md](references/representation-catalog-contract.md)를 전체 읽는다.
2. 루트 에이전트가 책 전체의 Docling 결과와 PDF 렌더를 훑어 특별한 개념과 구조화된 설명 방식을 수집한다.
3. 각 항목의 PDF 근거, 의미, 단 하나의 Markdown·MDX 표현, 제목·본문·캡션·배치 규칙과 예외를 책별 표현 카탈로그에 기록한다.
4. 카탈로그를 잠근 뒤 섹션 작성을 시작한다. 새 표현을 발견하면 카탈로그를 갱신하고 앞서 처리한 범위를 같은 규칙으로 다시 확인한다.

완료 조건: PDF에 근거가 있는 모든 카탈로그 대상에 하나의 표준 MDX 표현이 배정되고, 재개 가능한 카탈로그 파일이 존재해야 한다.

## 4. 책과 섹션 지도 만들기

1. PDF 목차와 시각적 heading을 기준으로 앞부분, 장, 장 도입부와 번호 절의 물리 페이지 범위를 만든다.
2. `book-mdx-structure.md`에 따라 페이지 트리와 대상 파일을 정하고, 게시할 모든 콘텐츠 블록을 정확히 한 섹션에 배정한다.
3. 떠 있는 figure·표·특수 박스는 설명하는 절에 배정하고 구조 이동을 원문 추적표에 기록한다.
4. 제외할 페이지·블록과 그 근거, asset 경로, `meta.json.pages`, 목차 링크 변경을 열거한다.

완료 조건: 게시할 모든 블록에 소유자가 하나씩 있고, 제외 항목과 구조 이동에는 PDF 근거가 있어야 한다.

## 5. 루트 에이전트가 섹션별로 처리하기

1. [root-section-contract.md](references/root-section-contract.md)를 전체 읽는다.
2. 루트 에이전트가 섹션 하나의 PDF 렌더, MDX fragment 작성, 원문 추적표와 PDF 대조를 순서대로 끝낸다.
3. 해당 섹션이 `Result: PASS`가 된 뒤 다음 섹션을 처리한다.
4. 카탈로그에 없는 표현이 나오면 3단계로 돌아가 표준 표현을 확정한다.

완료 조건: 모든 섹션에 PASS fragment와 원문 추적표가 하나씩 있고, 모든 특수 표현이 카탈로그와 일치해야 한다.

## 6. 조립하고 전체 대조하기

1. 루트 에이전트가 PASS fragment를 원문 순서로 연결하고 페이지 수준 요소를 통합한다.
2. 루트 에이전트가 원본 PDF, 완성된 MDX와 표현 카탈로그를 처음부터 다시 대조한다.
3. `Result: FAIL`이면 차이가 생긴 fragment를 수정하고 섹션 대조부터 다시 수행한다.

완료 조건: 전체 원문 추적성과 카탈로그 일관성 검사 결과가 `Result: PASS`여야 한다.

## 7. 저장소 검증하고 정리하기

1. `AGENTS.md`와 저장소 설정이 요구하는 검증 명령을 실행한다.
2. 성공한 Docling bundle과 게시 문서·asset을 보존하고 섹션 fragment, PDF 렌더, smoke-test 파일을 삭제한다. 책 일부만 처리한 실행에서는 표현 카탈로그를 다음 실행까지 보존한다.
3. 선택한 충실도 계약, 추가한 페이지, PDF 대조 결과와 검증 명령 결과를 보고한다.

완료 조건: 모든 필수 명령과 콘텐츠 감사가 통과하고 섹션 임시 파일이 남지 않아야 한다. 부분 작업의 표현 카탈로그는 보존되어야 한다.
