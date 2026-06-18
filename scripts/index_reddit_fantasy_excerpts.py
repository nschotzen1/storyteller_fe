#!/usr/bin/env python3
"""Extract Reddit-sourced fantasy excerpt quotes from a thread."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_THREAD_URL = "https://old.reddit.com/r/Fantasy/comments/mxyemn/share_your_favorite_most_evocative_excerpts/?limit=500"
DEFAULT_OUTPUT = ROOT / "public" / "data" / "reddit_fantasy_evocative_excerpts.json"

SOURCE_POLICY = (
    "Reddit-sourced direct quotes copied from a public r/Fantasy thread. "
    "Each record keeps the Reddit permalink and commenter attribution. "
    "These are not publisher-authorized excerpt records."
)

KNOWN_SOURCE_PATTERNS = [
    (r"Ray Bradbury'?s\s+The Halloween Tree", "The Halloween Tree", "Ray Bradbury"),
    (r"Lews Therin Telamon", "The Eye of the World", "Robert Jordan"),
    (r"Titus Groan by Mervyn Peake", "Titus Groan", "Mervyn Peake"),
    (r"The Worm Ouroboros by E\.?\s*R\.?\s*Eddison", "The Worm Ouroboros", "E. R. Eddison"),
    (r"The Lord of the Rings by J\.?\s*R\.?\s*R\.?\s*Tolkien", "The Lord of the Rings", "J. R. R. Tolkien"),
    (r"Carcassonne.? by Lord Dunsany", "Carcassonne", "Lord Dunsany"),
    (r"Lies of Locke Lamora|Locke Lamora|Gentleman Bastards", "The Lies of Locke Lamora", "Scott Lynch"),
    (r"Song for the Basilisk by Patricia M[ckK]illip", "Song for the Basilisk", "Patricia A. McKillip"),
    (r"Tormalyne Palace|Basilisk", "Song for the Basilisk", "Patricia A. McKillip"),
    (r"The Return of the King,?\s*JRR Tolkien", "The Return of the King", "J. R. R. Tolkien"),
    (r"The Great Hunt,?\s*Robert Jordan", "The Great Hunt", "Robert Jordan"),
    (r"Midnight Tides by Steven Erikson", "Midnight Tides", "Steven Erikson"),
    (r"The Paper-Thin Garden", "The Paper-Thin Garden", "Thomas Wharton"),
    (r"Strange the Dreamer|mahalath|Lazlo|Sarai", "Strange the Dreamer", "Laini Taylor"),
    (r"A Feast For Crows|A Feast for Crows|Septon Meribald", "A Feast for Crows", "George R. R. Martin"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract quote records from a Reddit fantasy excerpts thread.")
    parser.add_argument("--thread-url", default=DEFAULT_THREAD_URL, help=f"Old Reddit thread URL. Default: {DEFAULT_THREAD_URL}")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"Output path. Default: {DEFAULT_OUTPUT}")
    parser.add_argument("--min-words", type=int, default=24, help="Minimum words for an extracted quote.")
    parser.add_argument("--max-records", type=int, default=100, help="Maximum quote records to write.")
    parser.add_argument("--timeout", type=int, default=20, help="Request timeout in seconds.")
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
            "User-Agent": "Mozilla/5.0 storyteller-reddit-excerpt-indexer/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        raw = response.read()
    return raw.decode("utf-8", errors="replace")


def clean_text(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"</p\s*>", "\n\n", value, flags=re.IGNORECASE)
    value = re.sub(r"</blockquote\s*>", "\n\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    value = value.replace("\u2018", "'").replace("\u2019", "'")
    value = value.replace("\u2014", "--").replace("\u2013", "-")
    lines = [re.sub(r"\s+", " ", line).strip() for line in value.splitlines()]
    value = "\n".join(line for line in lines if line)
    value = re.sub(r"\n{3,}", "\n\n", value).strip()
    return value


def word_count(value: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", value))


def strip_trailing_attribution(value: str) -> str:
    value = re.sub(r"\n+\s*[-\u2013\u2014]?\s*(?:The Return of the King,?\s*JRR Tolkien|The Great Hunt,?\s*Robert Jordan)\s*$", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\n+\s*[-\u2013\u2014]?\s*Lies of Locke Lamora\s*$", "", value, flags=re.IGNORECASE)
    return value.strip()


def find_balanced_div_end(text: str, start: int) -> int:
    tag_re = re.compile(r"<(/?)div\b[^>]*>", re.IGNORECASE)
    depth = 0
    for match in tag_re.finditer(text, start):
        if match.group(1):
            depth -= 1
            if depth == 0:
                return match.end()
        else:
            depth += 1
    return len(text)


def extract_md_html(block: str) -> str:
    match = re.search(r'<div class="md">', block, flags=re.IGNORECASE)
    if not match:
        return ""
    start = match.end()
    end = find_balanced_div_end(block, match.start())
    return block[start : max(start, end - len("</div>"))]


def extract_comment_blocks(page_html: str) -> list[dict]:
    starts = [
        match.start()
        for match in re.finditer(r'<div class="[^"]*\bthing\b[^"]*"\s+id="thing_t[13]_', page_html)
    ]
    blocks: list[dict] = []
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else len(page_html)
        block = page_html[start:end]
        fullname_match = re.search(r'data-fullname="(t[13]_[^"]+)"', block)
        type_match = re.search(r'data-type="([^"]+)"', block)
        author_match = re.search(r'data-author="([^"]+)"', block)
        permalink_match = re.search(r'data-permalink="([^"]+)"', block)
        if not fullname_match:
            continue
        blocks.append(
            {
                "fullname": html.unescape(fullname_match.group(1)),
                "type": html.unescape(type_match.group(1)) if type_match else "",
                "author": html.unescape(author_match.group(1)) if author_match else "",
                "permalink": html.unescape(permalink_match.group(1)) if permalink_match else "",
                "html": extract_md_html(block),
            }
        )
    return blocks


def blockquote_texts(md_html: str) -> list[str]:
    quotes = []
    for match in re.finditer(r"<blockquote\b[^>]*>(.*?)</blockquote>", md_html, flags=re.IGNORECASE | re.DOTALL):
        text = strip_trailing_attribution(clean_text(match.group(1)))
        if text:
            quotes.append(text)
    return quotes


def split_attributed_quotes(text: str) -> list[tuple[str, str]]:
    if not re.search(r"^--\s+", text, flags=re.MULTILINE):
        return [(text, "")]

    segments: list[tuple[str, str]] = []
    current_lines: list[str] = []
    for line in text.splitlines():
        attribution = re.match(r"^--\s*(.+)$", line.strip())
        if attribution:
            quote = "\n".join(current_lines).strip()
            if quote:
                segments.append((quote, attribution.group(1).strip()))
            current_lines = []
        else:
            current_lines.append(line)

    trailing = "\n".join(current_lines).strip()
    if trailing:
        segments.append((trailing, ""))
    return segments


def plain_excerpt_segments(text: str) -> list[tuple[str, str]]:
    lowered = text.lower()
    discussion_only = (
        "i almost included",
        "here's the chapter",
        "pretty good fanmade narration",
        "i really do need to read",
    )
    if any(bit in lowered for bit in discussion_only):
        return []

    if "here's one of my favorite bits from" in lowered:
        source_match = re.search(r"Here's one of my favorite bits from ([^:\n]+):", text, flags=re.IGNORECASE)
        start = source_match.end() if source_match else 0
        end_match = re.search(r"\nWhat are your favorite", text, flags=re.IGNORECASE)
        excerpt = text[start : end_match.start() if end_match else len(text)].strip()
        return [(excerpt, source_match.group(1).strip() if source_match else "")]

    if "i guess i'll just pull out a paragraph" in lowered:
        start_match = re.search(r"\n(['\"])", text)
        end_match = re.search(r"\nThat's my absolute", text, flags=re.IGNORECASE)
        if start_match:
            excerpt = text[start_match.start() : end_match.start() if end_match else len(text)].strip()
            return [(excerpt, text[: start_match.start()])]

    if re.match(r"Septon Meribald", text, flags=re.IGNORECASE):
        start = text.find(":")
        if start != -1:
            return [(text[start + 1 :].strip(), text[:start])]

    if "- Strange the Dreamer" in text:
        text = text.replace("\u200b", "").strip()
        text = re.sub(r"\n-\s*Strange the Dreamer\s*$", "", text, flags=re.IGNORECASE).strip()
        parts = re.split(r"\nand shortly after\n", text, flags=re.IGNORECASE)
        return [(part.strip(), "Strange the Dreamer") for part in parts if part.strip()]

    return [(text, "")]


def non_blockquote_text(md_html: str) -> str:
    without_quotes = re.sub(r"<blockquote\b[^>]*>.*?</blockquote>", " ", md_html, flags=re.IGNORECASE | re.DOTALL)
    return clean_text(without_quotes)


def source_context_for_quote(md_html: str, quote: str) -> str:
    quote_start = md_html.find(quote[:30])
    if quote_start == -1:
        cleaned = clean_text(md_html)
        quote_start = cleaned.find(quote[:30])
        return cleaned[max(0, quote_start - 400) : quote_start + 400] if quote_start != -1 else cleaned[:700]
    before = clean_text(md_html[:quote_start])
    after = clean_text(md_html[quote_start : quote_start + len(quote) + 500])
    return f"{before[-400:]}\n{after[:500]}"


def infer_source(context: str) -> tuple[str, str, str]:
    for pattern, title, author in KNOWN_SOURCE_PATTERNS:
        if re.search(pattern, context, flags=re.IGNORECASE):
            return title, author, "pattern"

    by_match = re.search(r"([A-Z][A-Za-z0-9' :.-]{2,80})\s+by\s+([A-Z][A-Za-z. '\-]{2,60})", context)
    if by_match:
        return by_match.group(1).strip(" :.-"), by_match.group(2).strip(" .-"), "nearby_text"

    opening_match = re.search(r"opening to\s+([A-Z][A-Za-z0-9' :.-]{2,80})\s+by\s+([A-Z][A-Za-z. '\-]{2,60})", context, flags=re.IGNORECASE)
    if opening_match:
        return opening_match.group(1).strip(" :.-"), opening_match.group(2).strip(" .-"), "nearby_text"

    return "", "", "unknown"


def should_keep_quote(text: str, min_words: int) -> bool:
    if word_count(text) < min_words:
        return False
    lowered = text.lower()
    blocked = (
        "i really do need to read",
        "this gives me nerd chills",
        "that book doesn't get nearly",
        "we need a tehol",
        "contact my",
        "i am a bot",
    )
    return not any(bit in lowered for bit in blocked)


def candidate_quotes(block: dict, min_words: int) -> list[tuple[str, str, str]]:
    md_html = block["html"]
    quotes: list[tuple[str, str, str]] = []
    for quote in blockquote_texts(md_html):
        for segment, context in split_attributed_quotes(quote):
            quotes.append((segment, "blockquote", context))

    if not quotes:
        plain = non_blockquote_text(md_html)
        if plain:
            for segment, context in plain_excerpt_segments(plain):
                quotes.append((segment, "comment_body", context))
    return [
        (strip_trailing_attribution(quote), quote_type, context)
        for quote, quote_type, context in quotes
        if should_keep_quote(strip_trailing_attribution(quote), min_words)
    ]


def record_for_quote(block: dict, quote: str, quote_type: str, context_hint: str, thread_url: str, ordinal: int) -> dict:
    context = f"{context_hint}\n{source_context_for_quote(block['html'], quote)}"
    if context_hint:
        book_title, book_author, inference = infer_source(context_hint)
        if not book_title and not book_author:
            book_title, book_author, inference = infer_source(context)
    else:
        book_title, book_author, inference = infer_source(context)
    comment_url = urllib.parse.urljoin("https://www.reddit.com", block["permalink"])
    record_id = hashlib.sha1(f"{block['fullname']}|{quote[:80]}".encode("utf-8")).hexdigest()[:14]
    return {
        "id": f"reddit-fantasy-{record_id}",
        "source_type": "reddit_comment_quote",
        "source_site": "Reddit r/Fantasy",
        "thread_url": thread_url,
        "reddit_comment_id": block["fullname"],
        "reddit_comment_url": comment_url,
        "reddit_author": block["author"],
        "quote_type": quote_type,
        "book_title": book_title,
        "book_author": book_author,
        "source_inference": inference,
        "text": quote,
        "word_count": word_count(quote),
        "rights_note": "Direct quote copied from a public Reddit comment; verify underlying book rights before republishing outside this local corpus.",
        "ordinal": ordinal,
    }


def extract_records(page_html: str, thread_url: str, min_words: int, max_records: int) -> list[dict]:
    records: list[dict] = []
    seen_texts: set[str] = set()
    for block in extract_comment_blocks(page_html):
        if not block["html"]:
            continue
        for quote, quote_type, context_hint in candidate_quotes(block, min_words):
            fingerprint = hashlib.sha1(re.sub(r"\s+", " ", quote.lower()).encode("utf-8")).hexdigest()
            if fingerprint in seen_texts:
                continue
            seen_texts.add(fingerprint)
            records.append(record_for_quote(block, quote, quote_type, context_hint, thread_url, len(records) + 1))
            if len(records) >= max_records:
                return records
    return records


def write_output(path: Path, records: list[dict], warnings: list[str], args: argparse.Namespace) -> None:
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_thread_url": args.thread_url,
            "source_policy": SOURCE_POLICY,
            "actual_count": len(records),
            "min_words": args.min_words,
            "warnings": warnings,
        },
        "excerpts": records,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    context = build_ssl_context(args.insecure_tls)
    warnings: list[str] = []
    try:
        page_html = fetch_text(args.thread_url, context, args.timeout)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"Failed to fetch Reddit thread: {exc}", file=sys.stderr)
        return 1

    records = extract_records(page_html, args.thread_url, max(1, args.min_words), max(1, args.max_records))
    if not records:
        warnings.append("No excerpt-like quotes matched the extraction filters.")
    write_output(args.output, records, warnings, args)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    print(f"Wrote {len(records)} Reddit excerpt records to {args.output}")
    return 0 if records else 1


if __name__ == "__main__":
    raise SystemExit(main())
