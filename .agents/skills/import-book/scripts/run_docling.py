#!/usr/bin/env python
"""Run or validate the pinned Docling first-pass bundle for a book PDF."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote

DOCLING_VERSION = "2.113.0"
ONNXRUNTIME_VERSION = "1.27.0"
BOOK_SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\((.*?)\)")
PDF_TOOL = Path(__file__).with_name("pdf_tool.py")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create, reuse, or validate a Docling book bundle.",
    )
    parser.add_argument("pdf", type=Path, help="Source PDF path")
    parser.add_argument("--book-slug", help="Stable lowercase kebab-case book slug")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("output/pdf/import-book"),
        help="Root directory for versioned Docling runs",
    )
    parser.add_argument(
        "--existing-dir",
        type=Path,
        help="Validate and use an existing Docling bundle without converting",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Create a new timestamped run even when a valid hash match exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the resolved conversion command without running Docling",
    )
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pdf_page_count(pdf: Path) -> int:
    result = subprocess.run(
        ["uv", "run", str(PDF_TOOL), "page-count", str(pdf)],
        check=True,
        capture_output=True,
        text=True,
    )
    page_count = int(result.stdout.strip())
    if page_count < 1:
        raise ValueError("PDF must contain at least one page")
    return page_count


def local_uri_path(bundle_dir: Path, uri: str) -> Path | None:
    if uri.startswith(("data:", "http://", "https://")):
        return None
    value = unquote(uri)
    if value.startswith("file://"):
        return Path(value[7:])
    path = Path(value)
    return path if path.is_absolute() else bundle_dir / path


def collect_json_uris(value: Any) -> list[str]:
    if isinstance(value, dict):
        uris = [value["uri"]] if isinstance(value.get("uri"), str) else []
        for child in value.values():
            uris.extend(collect_json_uris(child))
        return uris
    if isinstance(value, list):
        uris: list[str] = []
        for child in value:
            uris.extend(collect_json_uris(child))
        return uris
    return []


def markdown_uri(raw_target: str) -> str:
    target = raw_target.strip()
    if target.startswith("<") and ">" in target:
        return target[1 : target.index(">")]
    return target.split(maxsplit=1)[0]


def find_docling_document(bundle_dir: Path, pdf: Path) -> tuple[Path, dict[str, Any]]:
    matches: list[tuple[Path, dict[str, Any]]] = []
    for json_path in bundle_dir.glob("*.json"):
        if "-timings-" in json_path.name or json_path.name == "manifest.json":
            continue
        try:
            document = json.loads(json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if (
            document.get("schema_name") == "DoclingDocument"
            and document.get("origin", {}).get("filename") == pdf.name
        ):
            matches.append((json_path, document))
    if len(matches) != 1:
        raise ValueError(
            f"expected one Docling JSON for {pdf.name}, found {len(matches)}",
        )
    return matches[0]


def validate_bundle(bundle_dir: Path, pdf: Path, page_count: int) -> dict[str, Any]:
    bundle = bundle_dir.resolve()
    if not bundle.is_dir():
        raise ValueError(f"bundle directory does not exist: {bundle}")

    json_path, document = find_docling_document(bundle, pdf)
    markdown_path = bundle / f"{json_path.stem}.md"
    if not markdown_path.is_file() or markdown_path.stat().st_size == 0:
        raise ValueError(f"missing or empty Docling Markdown: {markdown_path}")

    pages = document.get("pages")
    if not isinstance(pages, dict):
        raise ValueError("Docling JSON pages must be an object")
    expected_keys = [str(page) for page in range(1, page_count + 1)]
    if list(pages.keys()) != expected_keys:
        raise ValueError("Docling JSON pages are not a continuous 1..N sequence")
    for key, page in pages.items():
        if not isinstance(page, dict) or page.get("page_no") != int(key):
            raise ValueError(f"Docling page_no does not match page key {key}")

    timings = sorted(bundle.glob(f"{json_path.stem}-timings-*.json"))
    if not timings:
        raise ValueError("missing Docling timings JSON")
    timing_data = json.loads(timings[-1].read_text(encoding="utf-8"))
    if "pipeline_total" not in timing_data:
        raise ValueError("Docling timings JSON has no pipeline_total")

    markdown_text = markdown_path.read_text(encoding="utf-8")
    markdown_uris = [
        markdown_uri(match.group(1))
        for match in MARKDOWN_IMAGE_PATTERN.finditer(markdown_text)
    ]
    all_uris = set(markdown_uris + collect_json_uris(document))
    missing_uris = sorted(
        uri
        for uri in all_uris
        if (path := local_uri_path(bundle, uri)) is not None and not path.is_file()
    )
    if missing_uris:
        preview = ", ".join(missing_uris[:5])
        raise ValueError(f"missing {len(missing_uris)} image URI targets: {preview}")

    return {
        "bundle_dir": str(bundle),
        "document_json": str(json_path),
        "markdown": str(markdown_path),
        "timings": str(timings[-1]),
        "page_count": page_count,
        "local_image_uri_count": len(all_uris),
    }


def conversion_command(pdf: Path) -> list[str]:
    return [
        "uvx",
        "--python",
        "3.12",
        "--with",
        f"onnxruntime=={ONNXRUNTIME_VERSION}",
        f"docling=={DOCLING_VERSION}",
        "convert",
        str(pdf),
        "--from",
        "pdf",
        "--to",
        "md",
        "--to",
        "json",
        "--image-export-mode",
        "referenced",
        "--ocr",
        "--ocr-engine",
        "rapidocr",
        "--enrich-code",
        "--table-mode",
        "accurate",
        "--abort-on-error",
        "--profiling",
        "--save-profiling",
        "--output",
        ".",
    ]


def reusable_bundle(
    book_root: Path,
    pdf: Path,
    source_hash: str,
    page_count: int,
) -> dict[str, Any] | None:
    manifests = sorted(book_root.glob("*/manifest.json"), reverse=True)
    for manifest_path in manifests:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("source_sha256") != source_hash:
                continue
            details = validate_bundle(manifest_path.parent, pdf, page_count)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
        return details
    return None


def new_run_dir(book_root: Path, source_hash: str) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    base = book_root / f"{source_hash[:12]}-{timestamp}"
    candidate = base
    suffix = 1
    while candidate.exists():
        candidate = Path(f"{base}-{suffix}")
        suffix += 1
    return candidate


def emit(status: str, source_hash: str, details: dict[str, Any], **extra: Any) -> None:
    print(
        json.dumps(
            {
                "status": status,
                "source_sha256": source_hash,
                **details,
                **extra,
            },
            ensure_ascii=False,
            sort_keys=True,
        ),
    )


def main() -> int:
    args = parse_args()
    pdf = args.pdf.expanduser().resolve()
    if not pdf.is_file() or pdf.suffix.lower() != ".pdf":
        raise ValueError(f"source is not a PDF file: {pdf}")

    source_hash = sha256_file(pdf)
    page_count = pdf_page_count(pdf)

    if args.existing_dir:
        details = validate_bundle(args.existing_dir.expanduser(), pdf, page_count)
        emit("validated", source_hash, details)
        return 0

    if not args.book_slug or not BOOK_SLUG_PATTERN.fullmatch(args.book_slug):
        raise ValueError("--book-slug must be lowercase kebab-case")

    output_root = args.output_root.expanduser().resolve()
    book_root = output_root / args.book_slug
    if not args.force:
        reused = reusable_bundle(book_root, pdf, source_hash, page_count)
        if reused:
            emit("reused", source_hash, reused)
            return 0

    run_dir = new_run_dir(book_root, source_hash)
    command = conversion_command(pdf)
    if args.dry_run:
        emit(
            "dry-run",
            source_hash,
            {"bundle_dir": str(run_dir), "page_count": page_count},
            command=command,
        )
        return 0

    run_dir.mkdir(parents=True)
    subprocess.run(command, cwd=run_dir, check=True)
    details = validate_bundle(run_dir, pdf, page_count)
    manifest = {
        "source_filename": pdf.name,
        "source_sha256": source_hash,
        "page_count": page_count,
        "docling_version": DOCLING_VERSION,
        "onnxruntime_version": ONNXRUNTIME_VERSION,
        "command": command,
        "created_at": datetime.now(UTC).isoformat(),
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    emit("converted", source_hash, details, command=command)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
