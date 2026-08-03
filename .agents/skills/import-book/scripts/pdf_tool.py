#!/usr/bin/env python
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "Pillow==12.3.0",
#   "pypdfium2==5.12.1",
# ]
# ///
"""Inspect and render PDF pages without system PDF packages."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import pypdfium2 as pdfium

PAGE_RANGE_PATTERN = re.compile(r"^[1-9]\d*(?:-[1-9]\d*)?$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect or render a PDF.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    page_count = subparsers.add_parser("page-count", help="Print the page count")
    page_count.add_argument("pdf", type=Path, help="Source PDF path")

    render = subparsers.add_parser("render", help="Render selected pages as PNG")
    render.add_argument("pdf", type=Path, help="Source PDF path")
    render.add_argument(
        "--pages",
        required=True,
        help="1-based pages and ranges, for example 1,3-5",
    )
    render.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def source_pdf(path: Path) -> Path:
    pdf = path.expanduser().resolve()
    if not pdf.is_file() or pdf.suffix.lower() != ".pdf":
        raise ValueError(f"source is not a PDF file: {pdf}")
    return pdf


def parse_page_ranges(value: str, page_count: int) -> list[int]:
    pages: list[int] = []
    for raw_token in value.split(","):
        token = raw_token.strip()
        if not PAGE_RANGE_PATTERN.fullmatch(token):
            raise ValueError(f"invalid page range: {raw_token!r}")
        start_text, separator, end_text = token.partition("-")
        start = int(start_text)
        end = int(end_text) if separator else start
        if start > end:
            raise ValueError(f"page range starts after it ends: {token}")
        if end > page_count:
            raise ValueError(f"page {end} exceeds the {page_count}-page PDF")
        pages.extend(range(start, end + 1))
    return list(dict.fromkeys(pages))


def render_pages(pdf: Path, page_numbers: list[int], output_dir: Path) -> None:
    output = output_dir.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(pdf)
    try:
        for page_number in page_numbers:
            page = document[page_number - 1]
            try:
                bitmap = page.render(scale=2)
                try:
                    image = bitmap.to_pil()
                    target = output / f"page-{page_number:04d}.png"
                    image.save(target)
                    image.close()
                finally:
                    bitmap.close()
            finally:
                page.close()
            print(target)
    finally:
        document.close()


def main() -> int:
    args = parse_args()
    pdf = source_pdf(args.pdf)
    document = pdfium.PdfDocument(pdf)
    try:
        page_count = len(document)
    finally:
        document.close()

    if args.command == "page-count":
        print(page_count)
        return 0

    render_pages(pdf, parse_page_ranges(args.pages, page_count), args.output_dir)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
