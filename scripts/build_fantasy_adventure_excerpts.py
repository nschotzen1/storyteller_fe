#!/usr/bin/env python3
"""Build a JSON file of fantasy/adventure excerpts.

The default source set is limited to public-domain Project Gutenberg texts.
For copyrighted or otherwise licensed books, pass --local-text-dir with .txt
files you have the right to use. Local files are parsed with the same paragraph
selection rules, but the script never downloads protected modern novels.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import ssl
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "public" / "data" / "fantasy_adventure_excerpts.json"
DEFAULT_CACHE_DIR = ROOT / ".cache" / "gutenberg_texts"

REQUESTED_AUTHORS = [
    "J. R. R. Tolkien",
    "George R. R. Martin",
    "Brandon Sanderson",
    "Robin Hobb",
    "Terry Pratchett",
    "Ursula K. Le Guin",
    "Robert Jordan",
    "Neil Gaiman",
    "Andrzej Sapkowski",
    "Joe Abercrombie",
    "Patrick Rothfuss",
    "Guy Gavriel Kay",
    "N. K. Jemisin",
    "Steven Erikson",
    "Brandon Mull",
    "Sarah J. Maas",
    "Raymond E. Feist",
    "Scott Lynch",
    "Anne McCaffrey",
    "Susanna Clarke",
    "Ernst Hemmingway",
]

COPYRIGHT_NOTE = (
    "Default online sources are public-domain Project Gutenberg texts. "
    "Most requested modern fantasy authors are not downloaded by this script; "
    "add rights-cleared .txt files with --local-text-dir if you have permission "
    "to store excerpts from those works."
)

ADVENTURE_KEYWORDS = {
    "adventure",
    "castle",
    "cavern",
    "dragon",
    "dream",
    "enchant",
    "fairy",
    "forest",
    "gate",
    "giant",
    "island",
    "journey",
    "king",
    "kingdom",
    "magic",
    "mountain",
    "mystery",
    "night",
    "palace",
    "princess",
    "quest",
    "river",
    "road",
    "sea",
    "shadow",
    "ship",
    "sword",
    "tower",
    "traveller",
    "wizard",
    "world",
}

GUTENBERG_TEXT_URLS = (
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt",
    "https://www.gutenberg.org/files/{id}/{id}-0.txt",
    "https://www.gutenberg.org/files/{id}/{id}.txt",
    "https://www.gutenberg.org/ebooks/{id}.txt.utf-8",
)


@dataclass(frozen=True)
class TextSource:
    title: str
    author: str
    source_type: str
    gutenberg_id: int | None = None
    path: Path | None = None
    inline_text: str | None = None
    source_id: str = ""
    session_id: str = ""
    influences: tuple[str, ...] = ()
    expected_terms: tuple[str, ...] = ()

    @property
    def source_url(self) -> str | None:
        if self.gutenberg_id is None:
            return None
        return f"https://www.gutenberg.org/ebooks/{self.gutenberg_id}"

    @property
    def key(self) -> str:
        if self.gutenberg_id is not None:
            return f"pg-{self.gutenberg_id}"
        if self.source_type == "mongo":
            return f"mongo-{self.source_id or slugify(self.session_id or self.title)}"
        return f"local-{slugify(str(self.path or self.title))}"


# The list is intentionally broader than 50 so transient download failures do
# not prevent a full output file.
PUBLIC_DOMAIN_GUTENBERG_SOURCES = [
    TextSource("Alice's Adventures in Wonderland", "Lewis Carroll", "gutenberg", 11),
    TextSource("Through the Looking-Glass", "Lewis Carroll", "gutenberg", 12),
    TextSource("Peter Pan", "J. M. Barrie", "gutenberg", 16),
    TextSource("The Wonderful Wizard of Oz", "L. Frank Baum", "gutenberg", 55),
    TextSource("The Marvelous Land of Oz", "L. Frank Baum", "gutenberg", 54),
    TextSource("The Wind in the Willows", "Kenneth Grahame", "gutenberg", 289),
    TextSource("The Sun Also Rises", "Ernest Hemingway", "gutenberg", 67138),
    TextSource("Men Without Women", "Ernest Hemingway", "gutenberg", 69683),
    TextSource("The Princess and the Goblin", "George MacDonald", "gutenberg", 708),
    TextSource("The Princess and Curdie", "George MacDonald", "gutenberg", 709),
    TextSource("Phantastes", "George MacDonald", "gutenberg", 325),
    TextSource("The Further Adventures of Robinson Crusoe", "Daniel Defoe", "gutenberg", 561),
    TextSource("The Wood Beyond the World", "William Morris", "gutenberg", 3055),
    TextSource("The Well at the World's End", "William Morris", "gutenberg", 169),
    TextSource("The Story of the Glittering Plain", "William Morris", "gutenberg", 2565),
    TextSource("The House of the Wolfings", "William Morris", "gutenberg", 2885),
    TextSource("The Book of Wonder", "Lord Dunsany", "gutenberg", 7477),
    TextSource("A Dreamer's Tales", "Lord Dunsany", "gutenberg", 8129),
    TextSource("The Gods of Pegana", "Lord Dunsany", "gutenberg", 8395),
    TextSource("Time and the Gods", "Lord Dunsany", "gutenberg", 8183),
    TextSource("Five Children and It", "E. Nesbit", "gutenberg", 778),
    TextSource("The Book of Dragons", "E. Nesbit", "gutenberg", 23661),
    TextSource("The Enchanted Castle", "E. Nesbit", "gutenberg", 34219),
    TextSource("The Story of the Amulet", "E. Nesbit", "gutenberg", 837),
    TextSource("The Blue Fairy Book", "Andrew Lang", "gutenberg", 503),
    TextSource("The Red Fairy Book", "Andrew Lang", "gutenberg", 540),
    TextSource("Grimms' Fairy Tales", "Jacob Grimm and Wilhelm Grimm", "gutenberg", 2591),
    TextSource("Gulliver's Travels", "Jonathan Swift", "gutenberg", 829),
    TextSource("A Connecticut Yankee in King Arthur's Court", "Mark Twain", "gutenberg", 86),
    TextSource("The Legend of Sleepy Hollow", "Washington Irving", "gutenberg", 41),
    TextSource("Flatland", "Edwin A. Abbott", "gutenberg", 201),
    TextSource("The Time Machine", "H. G. Wells", "gutenberg", 35),
    TextSource("The War of the Worlds", "H. G. Wells", "gutenberg", 36),
    TextSource("The Island of Doctor Moreau", "H. G. Wells", "gutenberg", 159),
    TextSource("The Invisible Man", "H. G. Wells", "gutenberg", 5230),
    TextSource("A Princess of Mars", "Edgar Rice Burroughs", "gutenberg", 62),
    TextSource("The Gods of Mars", "Edgar Rice Burroughs", "gutenberg", 64),
    TextSource("The Warlord of Mars", "Edgar Rice Burroughs", "gutenberg", 68),
    TextSource("Tarzan of the Apes", "Edgar Rice Burroughs", "gutenberg", 78),
    TextSource("The Return of Tarzan", "Edgar Rice Burroughs", "gutenberg", 81),
    TextSource("The Land That Time Forgot", "Edgar Rice Burroughs", "gutenberg", 551),
    TextSource("The People That Time Forgot", "Edgar Rice Burroughs", "gutenberg", 552),
    TextSource("Out of Time's Abyss", "Edgar Rice Burroughs", "gutenberg", 553),
    TextSource("King Solomon's Mines", "H. Rider Haggard", "gutenberg", 2166),
    TextSource("She", "H. Rider Haggard", "gutenberg", 3155, expected_terms=("she", "haggard")),
    TextSource("Allan Quatermain", "H. Rider Haggard", "gutenberg", 711),
    TextSource("The Lost World", "Arthur Conan Doyle", "gutenberg", 139),
    TextSource("The Mysterious Island", "Jules Verne", "gutenberg", 1268),
    TextSource("Twenty Thousand Leagues under the Seas", "Jules Verne", "gutenberg", 164),
    TextSource("Around the World in Eighty Days", "Jules Verne", "gutenberg", 103),
    TextSource("A Journey to the Centre of the Earth", "Jules Verne", "gutenberg", 3748),
    TextSource("From the Earth to the Moon", "Jules Verne", "gutenberg", 83),
    TextSource("Treasure Island", "Robert Louis Stevenson", "gutenberg", 120),
    TextSource("Strange Case of Dr. Jekyll and Mr. Hyde", "Robert Louis Stevenson", "gutenberg", 43),
    TextSource("Robinson Crusoe", "Daniel Defoe", "gutenberg", 521),
    TextSource("The Jungle Book", "Rudyard Kipling", "gutenberg", 236),
    TextSource("The Second Jungle Book", "Rudyard Kipling", "gutenberg", 1937),
    TextSource("Just So Stories", "Rudyard Kipling", "gutenberg", 2781),
    TextSource("The Three Musketeers", "Alexandre Dumas", "gutenberg", 1257),
    TextSource("Twenty Years After", "Alexandre Dumas", "gutenberg", 1259),
    TextSource("The Count of Monte Cristo", "Alexandre Dumas", "gutenberg", 1184),
    TextSource("The Prisoner of Zenda", "Anthony Hope", "gutenberg", 95),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a JSON corpus of fantasy/adventure excerpts.",
    )
    parser.add_argument("--count", type=int, default=50, help="Number of excerpts to write.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output JSON path. Default: {DEFAULT_OUTPUT}",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=DEFAULT_CACHE_DIR,
        help=f"Cache directory for downloaded texts. Default: {DEFAULT_CACHE_DIR}",
    )
    parser.add_argument(
        "--local-text-dir",
        type=Path,
        help="Optional directory of rights-cleared .txt books to include.",
    )
    parser.add_argument(
        "--mongo-uri",
        help="Optional MongoDB URI to read local app-created narrative fragments from.",
    )
    parser.add_argument(
        "--mongo-collection",
        default="narrativefragments",
        help="Mongo collection to read when --mongo-uri is set. Default: narrativefragments.",
    )
    parser.add_argument(
        "--mongo-limit",
        type=int,
        default=250,
        help="Maximum Mongo documents to inspect when --mongo-uri is set.",
    )
    parser.add_argument(
        "--no-gutenberg",
        action="store_true",
        help="Do not use the built-in public-domain Gutenberg fallback sources.",
    )
    parser.add_argument("--min-chars", type=int, default=320, help="Minimum paragraph length.")
    parser.add_argument("--max-chars", type=int, default=950, help="Maximum paragraph length.")
    parser.add_argument("--seed", type=str, default="fantasy-adventure-50", help="Deterministic selection seed.")
    parser.add_argument(
        "--delay",
        type=float,
        default=0.3,
        help="Delay between Gutenberg downloads in seconds.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=12,
        help="Per-URL download timeout in seconds.",
    )
    parser.add_argument(
        "--insecure-tls",
        action="store_true",
        help="Disable TLS verification for downloads when the local Python CA store is broken.",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def build_ssl_context(insecure_tls: bool) -> ssl.SSLContext:
    if insecure_tls:
        return ssl._create_unverified_context()
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def read_url_text(url: str, context: ssl.SSLContext, timeout: int = 30) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "storyteller-excerpt-builder/1.0 (+https://www.gutenberg.org/)",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        raw = response.read()
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def fetch_gutenberg_text(source: TextSource, cache_dir: Path, context: ssl.SSLContext, timeout: int) -> str:
    if source.gutenberg_id is None:
        raise ValueError("Gutenberg source is missing gutenberg_id")

    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / f"pg{source.gutenberg_id}.txt"
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")

    errors: list[str] = []
    for url_template in GUTENBERG_TEXT_URLS:
        url = url_template.format(id=source.gutenberg_id)
        try:
            text = read_url_text(url, context, timeout=timeout)
            if text.strip():
                cache_path.write_text(text, encoding="utf-8")
                return text
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            errors.append(f"{url}: {exc}")

    raise RuntimeError("; ".join(errors[-2:]) or "No Gutenberg text URL worked")


def load_local_sources(local_text_dir: Path | None) -> list[TextSource]:
    if local_text_dir is None:
        return []
    if not local_text_dir.exists():
        raise FileNotFoundError(f"Local text directory not found: {local_text_dir}")

    sources: list[TextSource] = []
    for path in sorted(local_text_dir.rglob("*.txt")):
        stem = path.stem.strip()
        if " - " in stem:
            author, title = [part.strip() for part in stem.split(" - ", 1)]
        else:
            author, title = "User supplied", stem
        sources.append(TextSource(title=title, author=author, source_type="local", path=path))
    return sources


def load_mongo_sources(args: argparse.Namespace) -> tuple[list[TextSource], list[str]]:
    if not args.mongo_uri:
        return [], []

    warnings: list[str] = []
    collection = re.sub(r"[^a-zA-Z0-9_]", "", args.mongo_collection or "")
    if not collection:
        return [], ["Skipped Mongo import: invalid --mongo-collection."]

    limit = max(args.count, min(max(1, args.mongo_limit), 5000))
    script = f"""
const collection = db.getCollection({json.dumps(collection)});
const docs = collection
  .find({{ fragment: {{ $type: "string", $ne: "" }} }}, {{ session_id: 1, fragment: 1, createdAt: 1, updatedAt: 1 }})
  .sort({{ updatedAt: -1, createdAt: -1, _id: -1 }})
  .limit({limit})
  .toArray();
const sessionIds = Array.from(new Set(docs.map((doc) => doc.session_id || "").filter(Boolean)));
const influenceBySession = {{}};
db.getCollection("storytellers")
  .find({{
    $or: [
      {{ session_id: {{ $in: sessionIds }} }},
      {{ sessionId: {{ $in: sessionIds }} }}
    ]
  }}, {{ session_id: 1, sessionId: 1, influences: 1, known_universes: 1 }})
  .forEach((doc) => {{
    const sessionId = doc.session_id || doc.sessionId || "";
    if (!sessionId) return;
    if (!influenceBySession[sessionId]) influenceBySession[sessionId] = new Set();
    for (const value of [...(doc.influences || []), ...(doc.known_universes || [])]) {{
      if (typeof value === "string" && value.trim()) influenceBySession[sessionId].add(value.trim());
    }}
  }});
const payload = docs.map((doc) => ({{
    id: String(doc._id),
    session_id: doc.session_id || "",
    fragment: doc.fragment || "",
    influences: Array.from(influenceBySession[doc.session_id || ""] || []).sort().slice(0, 24),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : "",
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : ""
  }}));
print(JSON.stringify(payload));
"""
    try:
        completed = subprocess.run(
            ["mongosh", "--quiet", args.mongo_uri, "--eval", script],
            check=True,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except FileNotFoundError:
        return [], ["Skipped Mongo import: mongosh is not installed or not on PATH."]
    except subprocess.TimeoutExpired:
        return [], ["Skipped Mongo import: mongosh query timed out."]
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        return [], [f"Skipped Mongo import: {detail}"]

    try:
        docs = json.loads(completed.stdout.strip() or "[]")
    except json.JSONDecodeError as exc:
        return [], [f"Skipped Mongo import: could not parse mongosh JSON output: {exc}"]

    sources: list[TextSource] = []
    for doc in docs:
        fragment = normalize_paragraph(str(doc.get("fragment", "")))
        if not fragment:
            continue
        source_id = str(doc.get("id", "")).strip()
        session_id = str(doc.get("session_id", "")).strip()
        label = session_id or source_id or f"mongo-fragment-{len(sources) + 1}"
        sources.append(
            TextSource(
                title=f"Local narrative fragment {label}",
                author="Local app corpus",
                source_type="mongo",
                inline_text=fragment,
                source_id=source_id,
                session_id=session_id,
                influences=tuple(str(value) for value in doc.get("influences", []) if str(value).strip()),
            )
        )

    if not sources:
        warnings.append(f"Mongo import found no string fragments in collection '{collection}'.")
    return sources, warnings


def strip_gutenberg_boilerplate(text: str) -> str:
    start_match = re.search(
        r"\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if start_match:
        text = text[start_match.end() :]

    end_match = re.search(
        r"\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if end_match:
        text = text[: end_match.start()]
    return text


def title_terms(source: TextSource) -> tuple[str, ...]:
    if source.expected_terms:
        return source.expected_terms
    raw_terms = re.findall(r"[a-z0-9]+", source.title.lower())
    return tuple(term for term in raw_terms if len(term) > 2 and term not in {"the", "and", "under"})


def validate_downloaded_title(source: TextSource, text: str) -> bool:
    if source.source_type != "gutenberg":
        return True
    header = text[:5000].lower()
    terms = title_terms(source)
    if not terms:
        return True
    matches = sum(1 for term in terms if term in header)
    return matches >= min(2, len(terms))


def normalize_paragraph(raw_paragraph: str) -> str:
    lines = [line.strip() for line in raw_paragraph.splitlines()]
    lines = [line for line in lines if line]
    paragraph = " ".join(lines)
    paragraph = paragraph.replace("“", '"').replace("”", '"')
    paragraph = paragraph.replace("‘", "'").replace("’", "'")
    paragraph = paragraph.replace("—", "--").replace("–", "-")
    paragraph = re.sub(r"\s+", " ", paragraph).strip()
    return paragraph


def split_paragraphs(text: str) -> Iterable[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = strip_gutenberg_boilerplate(text)
    for raw_paragraph in re.split(r"\n\s*\n+", text):
        paragraph = normalize_paragraph(raw_paragraph)
        if paragraph:
            yield paragraph


def is_heading_like(paragraph: str) -> bool:
    if len(paragraph) > 140:
        return False
    if re.fullmatch(r"(chapter|book|part)\s+[ivxlcdm0-9 .-]+", paragraph, re.IGNORECASE):
        return True
    letters = [char for char in paragraph if char.isalpha()]
    if letters and sum(1 for char in letters if char.isupper()) / len(letters) > 0.8:
        return True
    return False


def is_clean_excerpt(paragraph: str, min_chars: int, max_chars: int) -> bool:
    if not (min_chars <= len(paragraph) <= max_chars):
        return False
    lowered = paragraph.lower()
    blocked_bits = (
        "project gutenberg",
        "transcriber's note",
        "produced by",
        "ebook",
        "contents",
        "illustration:",
        "[illustration",
    )
    if any(bit in lowered for bit in blocked_bits):
        return False
    if is_heading_like(paragraph):
        return False
    alpha_count = sum(1 for char in paragraph if char.isalpha())
    if alpha_count < len(paragraph) * 0.55:
        return False
    if paragraph.count("|") or paragraph.count("_") > 4:
        return False
    words = paragraph.split()
    if len(words) < 55:
        return False
    lowered_words = [re.sub(r"[^a-z0-9'-]", "", word.lower()) for word in words]
    meaningful_words = [word for word in lowered_words if word]
    unique_words = set(meaningful_words)
    if len(unique_words) < 24:
        return False
    if len(unique_words) / max(1, len(meaningful_words)) < 0.28:
        return False
    if re.search(r"\b(word|stage)[0-9]{2,}\b", lowered):
        return False
    if re.search(r"([a-zA-Z])\1{5,}", paragraph):
        return False
    return True


def excerpt_variants(paragraph: str, min_chars: int, max_chars: int) -> list[str]:
    if len(paragraph) <= max_chars:
        return [paragraph]

    sentences = re.split(r"(?<=[.!?])\s+", paragraph)
    if len(sentences) < 2:
        return []

    variants: list[str] = []
    for start in range(len(sentences)):
        parts: list[str] = []
        for sentence in sentences[start:]:
            candidate = " ".join([*parts, sentence]).strip()
            if len(candidate) > max_chars:
                break
            parts.append(sentence)
            if len(candidate) >= min_chars:
                variants.append(candidate)
    return variants


def stable_random(seed: str, *parts: object) -> float:
    digest = hashlib.sha256("|".join([seed, *(str(part) for part in parts)]).encode("utf-8")).hexdigest()
    return int(digest[:12], 16) / float(0xFFFFFFFFFFFF)


def score_paragraph(paragraph: str, source: TextSource, index: int, seed: str) -> float:
    words = set(re.findall(r"[a-z]+", paragraph.lower()))
    keyword_score = sum(1 for word in ADVENTURE_KEYWORDS if word in words) * 10
    length_score = max(0, 160 - abs(len(paragraph) - 620) / 4)
    sentence_score = min(60, paragraph.count(".") * 8 + paragraph.count("?") * 8 + paragraph.count("!") * 8)
    jitter = stable_random(seed, source.key, index) * 12
    return keyword_score + length_score + sentence_score + jitter


def source_text(source: TextSource, cache_dir: Path, context: ssl.SSLContext, timeout: int) -> str:
    if source.inline_text is not None:
        return source.inline_text
    if source.source_type == "local":
        if source.path is None:
            raise ValueError("Local source is missing path")
        return source.path.read_text(encoding="utf-8", errors="replace")
    return fetch_gutenberg_text(source, cache_dir, context, timeout)


def ranked_source_candidates(
    source: TextSource,
    text: str,
    min_chars: int,
    max_chars: int,
    seed: str,
) -> list[tuple[float, int, str]]:
    candidates: list[tuple[float, int, str]] = []
    seen: set[str] = set()
    for index, paragraph in enumerate(split_paragraphs(text)):
        for variant in excerpt_variants(paragraph, min_chars, max_chars):
            fingerprint = hashlib.sha1(variant.lower().encode("utf-8")).hexdigest()
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            if is_clean_excerpt(variant, min_chars, max_chars):
                candidates.append((score_paragraph(variant, source, index, seed), index, variant))
    candidates.sort(key=lambda candidate: candidate[0], reverse=True)
    return candidates


def excerpt_record(source: TextSource, paragraph: str, paragraph_index: int, ordinal: int) -> dict:
    source_slug = slugify(f"{source.author}-{source.title}") or source.key
    record = {
        "id": f"{source.key}-{ordinal:03d}",
        "title": source.title,
        "author": source.author,
        "source_type": source.source_type,
        "paragraph_index": paragraph_index,
        "text": paragraph,
        "tags": ["fantasy", "adventure"],
    }
    if source.source_type == "gutenberg":
        record.update(
            {
                "gutenberg_id": source.gutenberg_id,
                "source_url": source.source_url,
                "license_note": "Public domain in the United States via Project Gutenberg.",
                "attribution_key": source_slug,
            }
        )
    elif source.source_type == "mongo":
        record.update(
            {
                "mongo_id": source.source_id,
                "session_id": source.session_id,
                "influences": list(source.influences),
                "license_note": "Local app-created narrative text. Verify reuse and redistribution rights before publishing.",
                "attribution_key": source_slug,
            }
        )
    else:
        record.update(
            {
                "source_path": str(source.path),
                "license_note": "User-supplied local text. Verify reuse and redistribution rights.",
                "attribution_key": source_slug,
            }
        )
    return record


def collect_excerpts(args: argparse.Namespace) -> tuple[list[dict], list[str]]:
    context = build_ssl_context(args.insecure_tls)
    mongo_sources, mongo_warnings = load_mongo_sources(args)
    gutenberg_sources = [] if args.no_gutenberg else PUBLIC_DOMAIN_GUTENBERG_SOURCES
    sources = [*mongo_sources, *load_local_sources(args.local_text_dir), *gutenberg_sources]
    warnings: list[str] = [*mongo_warnings]
    all_ranked: list[tuple[TextSource, list[tuple[float, int, str]]]] = []

    total_sources = len(sources)
    for position, source in enumerate(sources, start=1):
        print(f"[{position}/{total_sources}] reading {source.key}: {source.title}", file=sys.stderr, flush=True)
        try:
            text = source_text(source, args.cache_dir, context, args.timeout)
            if not validate_downloaded_title(source, text):
                warnings.append(f"Skipped {source.key}: downloaded text did not match expected title '{source.title}'.")
                continue
            ranked = ranked_source_candidates(source, text, args.min_chars, args.max_chars, args.seed)
            if ranked:
                all_ranked.append((source, ranked))
            else:
                if source.source_type != "mongo":
                    warnings.append(f"Skipped {source.key}: no clean paragraphs matched length filters.")
        except Exception as exc:
            warnings.append(f"Skipped {source.key} ({source.title}): {exc}")
        finally:
            if source.source_type == "gutenberg" and args.delay > 0:
                time.sleep(args.delay)

    excerpts: list[dict] = []
    used_text_fingerprints: set[str] = set()

    # First pass: one excerpt per source, preserving the "different books" goal.
    for source, ranked in all_ranked:
        if len(excerpts) >= args.count:
            break
        for _score, paragraph_index, paragraph in ranked:
            fingerprint = hashlib.sha1(paragraph.lower().encode("utf-8")).hexdigest()
            if fingerprint in used_text_fingerprints:
                continue
            used_text_fingerprints.add(fingerprint)
            excerpts.append(excerpt_record(source, paragraph, paragraph_index, len(excerpts) + 1))
            break

    # Second pass: fill from remaining strong paragraphs if fewer than requested.
    cursor = 1
    while len(excerpts) < args.count:
        added = False
        for source, ranked in all_ranked:
            if cursor >= len(ranked):
                continue
            _score, paragraph_index, paragraph = ranked[cursor]
            fingerprint = hashlib.sha1(paragraph.lower().encode("utf-8")).hexdigest()
            if fingerprint in used_text_fingerprints:
                continue
            used_text_fingerprints.add(fingerprint)
            excerpts.append(excerpt_record(source, paragraph, paragraph_index, len(excerpts) + 1))
            added = True
            if len(excerpts) >= args.count:
                break
        if not added:
            break
        cursor += 1

    return excerpts, warnings


def write_output(path: Path, excerpts: list[dict], warnings: list[str], args: argparse.Namespace) -> None:
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "requested_count": args.count,
            "actual_count": len(excerpts),
            "min_chars": args.min_chars,
            "max_chars": args.max_chars,
            "seed": args.seed,
            "source_policy": COPYRIGHT_NOTE,
            "requested_authors": REQUESTED_AUTHORS,
            "requested_author_note": (
                "The provided list is retained for tracking. The misspelled "
                "'Ernst Hemmingway' is treated as Ernest Hemingway only when "
                "public-domain Gutenberg sources are available."
            ),
            "warnings": warnings,
        },
        "excerpts": excerpts,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if args.count <= 0:
        print("--count must be greater than 0", file=sys.stderr)
        return 2
    if args.min_chars <= 0 or args.max_chars < args.min_chars:
        print("Invalid --min-chars/--max-chars range", file=sys.stderr)
        return 2

    excerpts, warnings = collect_excerpts(args)
    write_output(args.output, excerpts, warnings, args)

    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    print(f"Wrote {len(excerpts)} excerpts to {args.output}")
    if len(excerpts) < args.count:
        print(
            f"warning: requested {args.count} excerpts but only found {len(excerpts)}. "
            "Try lowering --min-chars, adding --local-text-dir, or rerunning failed downloads.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
