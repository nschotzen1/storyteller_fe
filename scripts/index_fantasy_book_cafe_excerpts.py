#!/usr/bin/env python3
"""Index Fantasy Book Cafe excerpt links without redistributing excerpt text."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TAG_URL = "https://www.fantasybookcafe.com/tag/excerpts/"
DEFAULT_OUTPUT = ROOT / "public" / "data" / "fantasy_book_cafe_excerpt_sources.json"

SOURCE_POLICY = (
    "Link index with optional short quote previews. The linked pages may contain "
    "promotional excerpts, but this JSON intentionally does not copy or "
    "redistribute full excerpt text."
)

KNOWN_TITLE_OVERRIDES = {
    "The Republic of Thieves Excerpt": ("The Republic of Thieves", "Scott Lynch", "high"),
    "The First Chapter of Silver Borne": ("Silver Borne", "Patricia Briggs", "medium"),
    "Excerpts: The Writing of Scott Lynch": ("The Writing of Scott Lynch", "Scott Lynch", "medium"),
    "Maledicte and Kings and Assassins Excerpts": ("Maledicte; Kings and Assassins", "Lane Robins", "medium"),
    "Read the First Chapter of Naamah's Kiss and Santa Olivia": (
        "Naamah's Kiss; Santa Olivia",
        "Jacqueline Carey",
        "medium",
    ),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a metadata-only JSON index of Fantasy Book Cafe excerpt posts.",
    )
    parser.add_argument("--tag-url", default=DEFAULT_TAG_URL, help=f"Excerpt tag URL. Default: {DEFAULT_TAG_URL}")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"Output path. Default: {DEFAULT_OUTPUT}")
    parser.add_argument("--max-pages", type=int, default=10, help="Maximum tag pages to inspect.")
    parser.add_argument("--timeout", type=int, default=12, help="Per-request timeout in seconds.")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay between page requests in seconds.")
    parser.add_argument(
        "--quote-preview-words",
        type=int,
        default=25,
        help="Maximum words to quote from each linked page. Use 0 to disable previews.",
    )
    parser.add_argument(
        "--insecure-tls",
        action="store_true",
        help="Disable TLS verification if the local Python CA store is broken.",
    )
    return parser.parse_args()


def build_ssl_context(insecure_tls: bool) -> ssl.SSLContext:
    if insecure_tls:
        return ssl._create_unverified_context()
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def fetch_text(url: str, context: ssl.SSLContext, timeout: int) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "storyteller-fantasy-book-cafe-indexer/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        raw = response.read()
    return raw.decode("utf-8", errors="replace")


def strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


def clean_text(value: str) -> str:
    unescaped = html.unescape(strip_tags(value))
    return re.sub(r"\s+", " ", unescaped).strip()


def quoted_word_count(value: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", value))


def truncate_words(value: str, max_words: int) -> str:
    words = re.findall(r"\S+", value)
    if max_words <= 0 or len(words) <= max_words:
        return value
    preview_words = words[:max_words]
    while preview_words:
        preview = " ".join(preview_words).rstrip(" ,;:-") + "..."
        if quoted_word_count(preview) <= max_words:
            return preview
        preview_words = preview_words[:-1]
    return ""


def clean_url(value: str, base_url: str) -> str:
    return urllib.parse.urljoin(base_url, html.unescape(value.strip()))


def tag_label(tag_class: str) -> str:
    label = tag_class.removeprefix("tag-").replace("-", " ")
    small_words = {"a", "an", "and", "by", "for", "from", "in", "of", "on", "the", "to"}
    parts = []
    for index, part in enumerate(label.split()):
        if index and part in small_words:
            parts.append(part)
        elif len(part) <= 3 and part.isalpha():
            parts.append(part.upper())
        else:
            parts.append(part.capitalize())
    return " ".join(parts)


def tags_from_class(class_value: str) -> list[str]:
    tags = []
    for part in class_value.split():
        if part.startswith("tag-") and part != "tag-excerpts":
            tags.append(tag_label(part))
    return sorted(dict.fromkeys(tags))


def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return value.strip("-")


def infer_from_title(post_title: str, tags: list[str], cover_alt: str) -> tuple[str, str, str]:
    title = post_title.strip()
    override_key = normalize_title_key(title)
    if override_key in KNOWN_TITLE_OVERRIDES:
        return KNOWN_TITLE_OVERRIDES[override_key]

    candidates = [
        (r"^Excerpt from (?P<book>.+?) by (?P<author>.+)$", "high"),
        (r"^Excerpt:\s*(?P<book>.+?) by (?P<author>.+)$", "high"),
        (r"^Giveaway (?:and|&)\s*Excerpt:\s*(?P<book>.+?) by (?P<author>.+)$", "high"),
        (r"^Excerpt and Giveaway:\s*(?P<book>.+?) by (?P<author>.+)$", "high"),
        (r"^#?FearlessWomen:\s*(?P<book>.+?) by (?P<author>.+?) Blog Tour$", "high"),
        (r"^(?P<book>.+?) by (?P<author>.+?):\s*Excerpt\b.*$", "high"),
    ]
    for pattern, confidence in candidates:
        match = re.match(pattern, title, flags=re.IGNORECASE)
        if match:
            return (
                clean_title(match.group("book")),
                clean_author(match.group("author")),
                confidence,
            )

    if cover_alt:
        match = re.match(r"^(?P<book>.+?) by (?P<author>.+?)(?:\s*-\s*Cover Image)?$", cover_alt)
        if match:
            return clean_title(match.group("book")), clean_author(match.group("author")), "medium"

    if title.lower().endswith(" excerpt"):
        return clean_title(title[:-8]), infer_author_from_tags(tags), "low"

    match = re.match(r"^The First Chapter of (?P<book>.+)$", title, flags=re.IGNORECASE)
    if match:
        return clean_title(match.group("book")), infer_author_from_tags(tags), "low"

    match = re.match(r"^Read the First Chapter of (?P<book>.+)$", title, flags=re.IGNORECASE)
    if match:
        return clean_title(match.group("book")), infer_author_from_tags(tags), "low"

    return "", infer_author_from_tags(tags), "unknown"


def normalize_title_key(value: str) -> str:
    return value.replace("\u2019", "'").replace("\u2018", "'")


def clean_title(value: str) -> str:
    value = re.sub(r"\s+Blog Tour$", "", value, flags=re.IGNORECASE)
    return value.strip(" :-")


def clean_author(value: str) -> str:
    return value.strip(" :-")


def infer_author_from_tags(tags: list[str]) -> str:
    blocked = {
        "Excerpt",
        "Excerpts",
        "Fantasy",
        "Science Fiction",
        "Speculative Fiction",
        "Urban Fantasy",
        "Epic Fantasy",
        "Giveaway",
        "Giveaways",
        "Blog Tour",
        "Book Review",
        "Cover Image",
        "Gentleman Bastards",
    }
    for tag in tags:
        if tag in blocked:
            continue
        words = tag.split()
        if 2 <= len(words) <= 4 and all(word[:1].isupper() for word in words):
            return tag
    return ""


def extract_nearest_post_class(html_text: str, index: int) -> str:
    before = html_text[max(0, index - 8000) : index]
    matches = list(re.finditer(r'<div class="([^"]*\bpost-\d+\b[^"]*)"', before))
    return html.unescape(matches[-1].group(1)) if matches else ""


def extract_image_metadata(block: str, page_url: str) -> tuple[str, str]:
    image_match = re.search(r"<img\b([^>]*)>", block, flags=re.IGNORECASE | re.DOTALL)
    if not image_match:
        return "", ""
    attrs = image_match.group(1)
    src_match = re.search(r'\bsrc="([^"]+)"', attrs)
    alt_match = re.search(r'\balt="([^"]*)"', attrs)
    image_url = clean_url(src_match.group(1), page_url) if src_match else ""
    alt = clean_text(alt_match.group(1)) if alt_match else ""
    return image_url, alt


def extract_entry_html(page_html: str) -> str:
    entry_match = re.search(r'<div class="entry"\s*>', page_html, flags=re.IGNORECASE)
    if not entry_match:
        return page_html
    start = entry_match.end()
    end_candidates = [
        page_html.find('<div class="postmeta"', start),
        page_html.find('<div class="comments"', start),
        page_html.find('<div id="comments"', start),
    ]
    end_candidates = [value for value in end_candidates if value != -1]
    end = min(end_candidates) if end_candidates else len(page_html)
    return page_html[start:end]


def remove_non_content_blocks(value: str) -> str:
    value = re.sub(r"<script\b.*?</script>", " ", value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r"<style\b.*?</style>", " ", value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r"<div[^>]+class=\"[^\"]*(?:sharedaddy|sharedaddy sd-sharing-enabled|robots-nocontent|wpa)[^\"]*\".*?</div>", " ", value, flags=re.IGNORECASE | re.DOTALL)
    return value


def is_preview_candidate(text: str) -> bool:
    if quoted_word_count(text) < 12:
        return False
    lowered = text.lower()
    blocked = (
        "share this:",
        "click to share",
        "copyright",
        "all rights reserved",
        "purchase",
        "buy now",
        "available from",
        "this giveaway",
        "giveaway is open",
        "fantasy book cafe",
        "today i have",
    )
    return not any(bit in lowered for bit in blocked)


def extract_quote_preview(page_html: str, max_words: int) -> tuple[str, int, str]:
    if max_words <= 0:
        return "", 0, "disabled"

    entry_html = remove_non_content_blocks(extract_entry_html(page_html))
    blockquote_match = re.search(r"<blockquote\b[^>]*>(.*?)</blockquote>", entry_html, flags=re.IGNORECASE | re.DOTALL)
    if blockquote_match:
        text = clean_text(blockquote_match.group(1))
        if is_preview_candidate(text):
            preview = truncate_words(text, max_words)
            return preview, quoted_word_count(preview), "blockquote"

    paragraph_matches = re.finditer(r"<p\b[^>]*>(.*?)</p>", entry_html, flags=re.IGNORECASE | re.DOTALL)
    for match in paragraph_matches:
        text = clean_text(match.group(1))
        if is_preview_candidate(text):
            preview = truncate_words(text, max_words)
            return preview, quoted_word_count(preview), "paragraph"

    return "", 0, "none"


def extract_entries(html_text: str, page_url: str) -> list[dict]:
    starts = [match.start() for match in re.finditer(r'<div class="excerpt"', html_text)]
    entries: list[dict] = []
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else len(html_text)
        block = html_text[start:end]
        link_match = re.search(
            r'<a\s+href="([^"]+)"\s+rel="bookmark"\s*>(.*?)</a>',
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not link_match:
            continue

        source_url = clean_url(link_match.group(1), page_url)
        post_title = clean_text(link_match.group(2))
        post_class = extract_nearest_post_class(html_text, start)
        tags = tags_from_class(post_class)
        cover_image_url, cover_image_alt = extract_image_metadata(block, page_url)
        inferred_title, inferred_author, confidence = infer_from_title(post_title, tags, cover_image_alt)
        year_month = infer_year_month(source_url)

        entries.append(
            {
                "id": f"fantasy-book-cafe-{hashlib.sha1(source_url.encode('utf-8')).hexdigest()[:12]}",
                "source_type": "third_party_excerpt_link",
                "source_site": "Fantasy Book Cafe",
                "source_url": source_url,
                "listing_page_url": page_url,
                "post_title": post_title,
                "book_title": inferred_title,
                "author": inferred_author,
                "inference_confidence": confidence,
                "posted_year_month": year_month,
                "tags": tags,
                "cover_image_url": cover_image_url,
                "cover_image_alt": cover_image_alt,
                "text": None,
                "quote_preview": "",
                "quote_preview_word_count": 0,
                "quote_preview_source": "not_loaded",
                "rights_note": "Linked excerpt only; full excerpt text is not copied or redistributed. quote_preview is capped at 25 words by default.",
            }
        )
    return entries


def add_quote_preview(entry: dict, context: ssl.SSLContext, args: argparse.Namespace) -> tuple[dict, str]:
    if args.quote_preview_words <= 0:
        entry["quote_preview_source"] = "disabled"
        return entry, ""

    try:
        page_html = fetch_text(entry["source_url"], context, args.timeout)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        entry["quote_preview_source"] = "fetch_failed"
        return entry, f"Could not fetch quote preview from {entry['source_url']}: {exc}"

    preview, word_count, source = extract_quote_preview(page_html, min(25, args.quote_preview_words))
    entry["quote_preview"] = preview
    entry["quote_preview_word_count"] = word_count
    entry["quote_preview_source"] = source
    return entry, ""


def infer_year_month(source_url: str) -> str:
    match = re.search(r"/(20\d{2})/([01]\d)/", source_url)
    if not match:
        return ""
    return f"{match.group(1)}-{match.group(2)}"


def next_page_url(html_text: str, current_url: str) -> str:
    match = re.search(
        r'<a\s+class="nextpostslink"[^>]+href="([^"]+)"',
        html_text,
        flags=re.IGNORECASE,
    )
    if not match:
        match = re.search(r'<link\s+rel="next"\s+href="([^"]+)"', html_text, flags=re.IGNORECASE)
    return clean_url(match.group(1), current_url) if match else ""


def crawl(args: argparse.Namespace) -> tuple[list[dict], list[str], list[str]]:
    context = build_ssl_context(args.insecure_tls)
    url = args.tag_url
    entries: list[dict] = []
    visited_pages: list[str] = []
    warnings: list[str] = []
    seen_urls: set[str] = set()

    for page_number in range(1, max(1, args.max_pages) + 1):
        print(f"[{page_number}] reading {url}", file=sys.stderr, flush=True)
        try:
            page_html = fetch_text(url, context, args.timeout)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            warnings.append(f"Stopped at {url}: {exc}")
            break

        visited_pages.append(url)
        for entry in extract_entries(page_html, url):
            if entry["source_url"] in seen_urls:
                continue
            seen_urls.add(entry["source_url"])
            entry, warning = add_quote_preview(entry, context, args)
            if warning:
                warnings.append(warning)
            entries.append(entry)
            if args.delay > 0:
                time.sleep(args.delay)

        url = next_page_url(page_html, url)
        if not url:
            break
        if args.delay > 0:
            time.sleep(args.delay)

    return entries, visited_pages, warnings


def write_output(path: Path, entries: list[dict], visited_pages: list[str], warnings: list[str], args: argparse.Namespace) -> None:
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_site": "Fantasy Book Cafe",
            "source_tag_url": args.tag_url,
            "source_policy": SOURCE_POLICY,
            "actual_count": len(entries),
            "quote_preview_words": min(25, max(0, args.quote_preview_words)),
            "visited_pages": visited_pages,
            "warnings": warnings,
        },
        "sources": entries,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    entries, visited_pages, warnings = crawl(args)
    write_output(args.output, entries, visited_pages, warnings, args)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    print(f"Wrote {len(entries)} Fantasy Book Cafe excerpt links to {args.output}")
    return 0 if entries else 1


if __name__ == "__main__":
    raise SystemExit(main())
