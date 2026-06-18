#!/usr/bin/env python3
"""Extract short inspirational "torn shards" from excerpt JSON corpora."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
DEFAULT_INPUTS = [
    DATA_DIR / "reddit_fantasy_evocative_excerpts.json",
    DATA_DIR / "fantasy_adventure_local_examples.json",
    DATA_DIR / "fantasy_adventure_excerpts.json",
    DATA_DIR / "fantasy_book_cafe_excerpt_sources.json",
]
DEFAULT_OUTPUT = DATA_DIR / "torn_excerpt_shards.json"

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had", "has",
    "have", "he", "her", "him", "his", "i", "if", "in", "into", "is", "it", "its", "me", "my",
    "like", "not", "of", "on", "or", "our", "she", "so", "that", "the", "their", "them", "then",
    "there", "they", "this", "to", "was", "were", "which", "who", "whom", "whose", "why",
    "will", "with", "would", "could", "should", "because", "us", "we", "you", "your",
}

FIRST_SECOND_PERSON = {"i", "me", "mine", "my", "our", "ours", "us", "we", "you", "your", "yours"}
PRONOUN_STARTS = FIRST_SECOND_PERSON | {
    "he", "her", "hers", "herself", "him", "himself", "his", "she", "their", "theirs",
    "them", "themselves", "they",
}
TITLE_WORDS = {"King", "Queen", "Lord", "Lady", "Sir", "Prince", "Princess"}

ENTITY_BLOCKLIST = {
    "And", "At", "But", "For", "From", "He", "Her", "His", "I", "If", "In", "It", "Now",
    "Only", "She", "That", "The", "Then", "There", "They", "This", "What", "When", "Where",
    "While", "With", "Yes",
}

SENSORY_ADJECTIVES = {
    "ancient", "ashen", "black", "bleak", "blind", "bright", "broken", "burned", "burning",
    "charred", "cold", "cracked", "crimson", "crumbling", "dark", "dead", "deep", "dim",
    "distant", "dry", "dusty", "empty", "faint", "fiery", "forgotten", "golden", "gray",
    "green", "hidden", "hollow", "iron", "jagged", "living", "lonely", "molten", "old",
    "pale", "quiet", "red", "rotting", "rough", "ruined", "secret", "shadowy", "shattered",
    "shining", "silent", "silver", "small", "smoke-blackened", "strange", "sweet", "tall",
    "thin", "trembling", "white", "wild",
}

STRONG_VERBS = {
    "blazed", "breathed", "burned", "carried", "climbed", "coalesced", "collapsed", "crawled",
    "drifted", "exhaled", "faded", "fell", "flamed", "flung", "fountained", "glimmered",
    "gushed", "heaved", "howled", "loomed", "moved", "poured", "rose", "shattered",
    "shimmered", "shone", "shrieked", "split", "stilled", "struck", "thrashed", "trembled",
    "turned", "vanished", "waited", "watched", "whispered",
}

IMAGE_WORDS = {
    "abyss", "ash", "banner", "bone", "bones", "castle", "cinders", "citadel", "cloud", "darkness",
    "dragon", "dust", "fire", "fog", "gate", "hearth", "horn", "island", "light", "mist",
    "moon", "mountain", "palace", "river", "shadow", "sky", "smoke", "stone", "storm", "tower",
    "tree", "wall", "wind", "window",
}

OPEN_END_WORDS = {
    "above", "across", "after", "against", "among", "before", "behind", "beneath", "between",
    "beyond", "inside", "into", "near", "over", "through", "toward", "under", "until", "where",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract 2-10 word torn shards from excerpt JSON files.")
    parser.add_argument(
        "--input",
        type=Path,
        action="append",
        help="Input JSON file. May be repeated. Defaults to the generated excerpt/source files.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"Output path. Default: {DEFAULT_OUTPUT}")
    parser.add_argument("--min-words", type=int, default=2, help="Minimum words per shard.")
    parser.add_argument("--max-words", type=int, default=10, help="Maximum words per shard.")
    parser.add_argument("--per-source", type=int, default=10, help="Maximum shards to keep per source text.")
    parser.add_argument("--max-shards", type=int, default=2000, help="Maximum total shards.")
    parser.add_argument("--min-score", type=int, default=5, help="Minimum quality score to keep a shard.")
    parser.add_argument(
        "--include-previews",
        action="store_true",
        help="Also extract shards from short quote_preview fields when full text is null.",
    )
    return parser.parse_args()


def normalize_space(value: str) -> str:
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    value = value.replace("\u2018", "'").replace("\u2019", "'")
    value = value.replace("\u2014", "--").replace("\u2013", "-")
    return re.sub(r"\s+", " ", value).strip()


def tokenize(value: str) -> list[str]:
    return re.findall(r"[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'-]*|[0-9]+", value)


def word_count(value: str) -> int:
    return len(tokenize(value))


def split_sentences(text: str) -> list[str]:
    text = normalize_space(text)
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [part.strip() for part in parts if part.strip()]


def clean_shard(value: str) -> str:
    value = normalize_space(value)
    value = value.strip(" \t\n\r\"'.,;:!?()[]{}")
    value = re.sub(r"^(and|but|or|then|that|while|when)\s+", "", value, flags=re.IGNORECASE)
    value = re.sub(r"^(at|by|for|from|in|into|to|with)\s+", "", value, flags=re.IGNORECASE)
    value = re.sub(r"^(a|an|the|this|these|those)\s+", "", value, flags=re.IGNORECASE)
    value = re.sub(r"^o\s+", "", value, flags=re.IGNORECASE)
    return value.strip(" \t\n\r\"'.,;:!?()[]{}")


def valid_shard(value: str, min_words: int, max_words: int) -> bool:
    value = clean_shard(value)
    count = word_count(value)
    if not (min_words <= count <= max_words):
        return False
    words = [word.lower() for word in tokenize(value)]
    if not words:
        return False
    if all(word in STOPWORDS for word in words):
        return False
    if words[0] in PRONOUN_STARTS:
        return False
    if words[-1] in STOPWORDS:
        return False
    if count <= 3 and words[-1].endswith("ly"):
        return False
    if count <= 7 and any(word in FIRST_SECOND_PERSON for word in words):
        return False
    if count <= 4 and sum(1 for word in words if word in STOPWORDS) > count / 2:
        return False
    if len(set(words)) == 1 and count > 2:
        return False
    if re.search(r"\b(word|stage)[0-9]{2,}\b", value, flags=re.IGNORECASE):
        return False
    return True


def source_records_from_file(path: Path, include_previews: bool) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    records: list[dict] = []
    if isinstance(data.get("excerpts"), list):
        for item in data["excerpts"]:
            text = item.get("text")
            if not isinstance(text, str) or not text.strip():
                continue
            records.append(source_record(path, item, text, "text"))
    if isinstance(data.get("sources"), list):
        for item in data["sources"]:
            text = item.get("text")
            field = "text"
            if (not isinstance(text, str) or not text.strip()) and include_previews:
                text = item.get("quote_preview")
                field = "quote_preview"
            if not isinstance(text, str) or not text.strip():
                continue
            records.append(source_record(path, item, text, field))
    return records


def source_record(path: Path, item: dict, text: str, text_field: str) -> dict:
    title = item.get("title") or item.get("book_title") or item.get("post_title") or ""
    author = item.get("author") or item.get("book_author") or item.get("reddit_author") or ""
    return {
        "source_file": str(path.relative_to(ROOT)),
        "source_id": item.get("id", ""),
        "source_type": item.get("source_type", ""),
        "source_url": item.get("source_url") or item.get("reddit_comment_url") or item.get("thread_url") or "",
        "title": title,
        "author": author,
        "text": text,
        "text_field": text_field,
    }


def entity_shards(text: str, min_words: int, max_words: int) -> list[dict]:
    shards = []
    pattern = re.compile(
        r"\b(?:[A-Z][A-Za-z\u00C0-\u024F'-]+|[A-Z]\.)"
        r"(?:\s+(?:of|the|and|for|to|in|at|from|[A-Z][A-Za-z\u00C0-\u024F'-]+|[A-Z]\.)){0,7}"
    )
    for match in pattern.finditer(text):
        candidate = clean_shard(match.group(0))
        if candidate in ENTITY_BLOCKLIST:
            continue
        words = tokenize(candidate)
        if len(words) == 1 and candidate in ENTITY_BLOCKLIST:
            continue
        if valid_shard(candidate, min_words, max_words):
            shards.append(make_candidate(candidate, "entity", "capitalized phrase", 8))
    return shards


def adjective_shards(sentence: str, min_words: int, max_words: int) -> list[dict]:
    tokens = tokenize(sentence)
    shards = []
    for index, token in enumerate(tokens[:-1]):
        lowered = token.lower()
        if token.isupper() and len(token) > 1:
            continue
        if lowered not in SENSORY_ADJECTIVES and not lowered.endswith(("less", "lit", "worn")):
            continue
        phrase_tokens = [token]
        cursor = index + 1
        while cursor < len(tokens) and len(phrase_tokens) < max_words:
            if tokens[cursor].lower() in STOPWORDS or tokens[cursor].lower() in OPEN_END_WORDS:
                break
            phrase_tokens.append(tokens[cursor])
            if len(phrase_tokens) >= 2:
                phrase = clean_shard(" ".join(phrase_tokens))
                if valid_shard(phrase, min_words, max_words):
                    shards.append(make_candidate(phrase, "adjective_phrase", "sensory adjective window", 7))
            cursor += 1
    return shards


def verb_shards(sentence: str, min_words: int, max_words: int) -> list[dict]:
    tokens = tokenize(sentence)
    shards = []
    for index, token in enumerate(tokens):
        lowered = token.lower()
        if lowered not in STRONG_VERBS and not lowered.endswith(("ed", "ing")):
            continue
        if lowered in SENSORY_ADJECTIVES:
            continue
        phrase_tokens = [token]
        for cursor in range(index + 1, min(len(tokens), index + max_words)):
            if tokens[cursor].lower() in {"and", "but", "because", "while", "when"}:
                break
            if tokens[cursor][:1].isupper() and len(phrase_tokens) >= 3:
                break
            phrase_tokens.append(tokens[cursor])
            phrase = clean_shard(" ".join(phrase_tokens))
            if valid_shard(phrase, min_words, max_words):
                score = 7 if lowered in STRONG_VERBS else score_shard(phrase)
                if lowered in STRONG_VERBS or score >= 6:
                    shards.append(make_candidate(phrase, "verb_phrase", "verb motion window", score))
    return shards


def clause_shards(sentence: str, min_words: int, max_words: int) -> list[dict]:
    pieces = re.split(r",|;|:|--|\(|\)|[!?]|[\"\u201C\u201D]+|\band\b|\bbut\b", sentence)
    shards = []
    for piece in pieces:
        piece = clean_shard(piece)
        if valid_shard(piece, min_words, max_words):
            kind = "continuation_cue" if tokenize(piece)[-1].lower() in OPEN_END_WORDS else "image_shard"
            shards.append(make_candidate(piece, kind, "clause fragment", score_shard(piece)))
    return shards


def ngram_shards(sentence: str, min_words: int, max_words: int) -> list[dict]:
    tokens = tokenize(sentence)
    shards = []
    for size in range(min_words, max_words + 1):
        for start in range(0, max(0, len(tokens) - size + 1)):
            phrase = clean_shard(" ".join(tokens[start : start + size]))
            if not valid_shard(phrase, min_words, max_words):
                continue
            if crosses_title_boundary(tokens[start : start + size]):
                continue
            score = score_shard(phrase)
            if score >= 6:
                shards.append(make_candidate(phrase, "image_shard", "scored ngram", score))
    return shards


def score_shard(value: str) -> int:
    words = [word.lower() for word in tokenize(value)]
    score = 0
    score += sum(3 for word in words if word in IMAGE_WORDS)
    score += sum(2 for word in words if word in SENSORY_ADJECTIVES)
    score += sum(2 for word in words if word in STRONG_VERBS)
    score += 2 if any(word[:1].isupper() for word in tokenize(value)) else 0
    score += 1 if 3 <= len(words) <= 7 else 0
    score -= sum(1 for word in words if word in STOPWORDS) // 2
    return score


def make_candidate(text: str, kind: str, reason: str, score: int) -> dict:
    return {
        "text": clean_shard(text),
        "kind": kind,
        "reason": reason,
        "score": score,
        "word_count": word_count(text),
    }


def extract_candidates(text: str, min_words: int, max_words: int) -> list[dict]:
    candidates = entity_shards(text, min_words, max_words)
    for sentence in split_sentences(text):
        candidates.extend(adjective_shards(sentence, min_words, max_words))
        candidates.extend(verb_shards(sentence, min_words, max_words))
        candidates.extend(clause_shards(sentence, min_words, max_words))
        candidates.extend(ngram_shards(sentence, min_words, max_words))
    return dedupe_candidates(candidates)


def dedupe_candidates(candidates: list[dict]) -> list[dict]:
    best_by_text: dict[str, dict] = {}
    kind_priority = {
        "entity": 4,
        "verb_phrase": 3,
        "adjective_phrase": 2,
        "continuation_cue": 1,
        "image_shard": 0,
    }
    for candidate in candidates:
        key = re.sub(r"\s+", " ", candidate["text"].lower())
        previous = best_by_text.get(key)
        if previous is None:
            best_by_text[key] = candidate
            continue
        current_rank = (candidate["score"], kind_priority.get(candidate["kind"], 0))
        previous_rank = (previous["score"], kind_priority.get(previous["kind"], 0))
        if current_rank > previous_rank:
            best_by_text[key] = candidate
    ranked = sorted(
        best_by_text.values(),
        key=lambda item: (item["score"], kind_priority.get(item["kind"], 0), -abs(5 - item["word_count"])),
        reverse=True,
    )
    selected: list[dict] = []
    selected_word_lists: list[list[str]] = []
    for candidate in ranked:
        words = [word.lower() for word in tokenize(candidate["text"])]
        if any(is_subsequence_window(words, selected_words) for selected_words in selected_word_lists):
            continue
        selected.append(candidate)
        selected_word_lists.append(words)
    return selected


def is_subsequence_window(needle: list[str], haystack: list[str]) -> bool:
    if len(needle) >= len(haystack):
        return False
    for start in range(0, len(haystack) - len(needle) + 1):
        if haystack[start : start + len(needle)] == needle:
            return True
    return False


def crosses_title_boundary(tokens: list[str]) -> bool:
    for index, token in enumerate(tokens[1:], start=1):
        if token not in TITLE_WORDS:
            continue
        previous = tokens[index - 1].lower()
        if previous not in {"of", "the"}:
            return True
    return False


def shard_record(candidate: dict, source: dict, ordinal: int) -> dict:
    source_key = f"{source['source_file']}|{source['source_id']}|{candidate['text']}"
    return {
        "id": f"torn-shard-{hashlib.sha1(source_key.encode('utf-8')).hexdigest()[:14]}",
        "text": candidate["text"],
        "kind": candidate["kind"],
        "reason": candidate["reason"],
        "score": candidate["score"],
        "word_count": candidate["word_count"],
        "source": {
            "source_file": source["source_file"],
            "source_id": source["source_id"],
            "source_type": source["source_type"],
            "source_url": source["source_url"],
            "title": source["title"],
            "author": source["author"],
            "text_field": source["text_field"],
        },
        "ordinal": ordinal,
    }


def collect_shards(args: argparse.Namespace) -> tuple[list[dict], Counter, Counter]:
    input_paths = args.input or DEFAULT_INPUTS
    sources: list[dict] = []
    for path in input_paths:
        if path.exists():
            sources.extend(source_records_from_file(path, args.include_previews))

    shards: list[dict] = []
    seen_text_source: set[str] = set()
    for source in sources:
        source_candidates = [
            candidate
            for candidate in extract_candidates(source["text"], args.min_words, args.max_words)
            if candidate["score"] >= args.min_score
        ]
        for candidate in source_candidates[: args.per_source]:
            key = f"{source['source_id']}|{candidate['text'].lower()}"
            if key in seen_text_source:
                continue
            seen_text_source.add(key)
            shards.append(shard_record(candidate, source, len(shards) + 1))
            if len(shards) >= args.max_shards:
                return (
                    shards,
                    Counter(source["source_file"] for source in sources),
                    Counter(shard["source"]["source_file"] for shard in shards),
                )
    return (
        shards,
        Counter(source["source_file"] for source in sources),
        Counter(shard["source"]["source_file"] for shard in shards),
    )


def write_output(
    path: Path,
    shards: list[dict],
    loaded_source_counts: Counter,
    shard_source_counts: Counter,
    args: argparse.Namespace,
) -> None:
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "actual_count": len(shards),
            "min_words": args.min_words,
            "max_words": args.max_words,
            "per_source": args.per_source,
            "include_previews": args.include_previews,
            "min_score": args.min_score,
            "method": "dependency-free heuristic extraction: capitalized entities, sensory adjectives, strong verbs, clause fragments, scored ngrams",
            "source_counts": dict(loaded_source_counts),
            "shard_source_counts": dict(shard_source_counts),
            "kind_counts": dict(Counter(shard["kind"] for shard in shards)),
        },
        "shards": shards,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if args.min_words < 1 or args.max_words < args.min_words:
        raise SystemExit("Invalid min/max word range.")
    if args.max_words > 10:
        raise SystemExit("--max-words must be 10 or lower for torn shards.")
    shards, loaded_source_counts, shard_source_counts = collect_shards(args)
    write_output(args.output, shards, loaded_source_counts, shard_source_counts, args)
    print(f"Wrote {len(shards)} torn shards to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
