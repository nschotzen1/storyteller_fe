#!/usr/bin/env python3
"""Generate original continuation hooks from fantasy/adventure source vocabulary."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
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
DEFAULT_OUTPUT = DATA_DIR / "story_hook_fragments.json"

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "almost", "also", "an",
    "and", "any", "are", "as", "at", "away", "back", "be", "because", "been", "before",
    "being", "below", "between", "both", "but", "by", "came", "can", "could", "did", "do",
    "does", "down", "each", "even", "ever", "every", "for", "from", "get", "got", "had",
    "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how", "i", "if",
    "in", "into", "is", "it", "its", "just", "like", "little", "long", "made", "make",
    "many", "me", "more", "most", "much", "my", "never", "no", "not", "now", "of", "off",
    "on", "once", "one", "only", "or", "other", "our", "out", "over", "own", "said", "saw",
    "say", "she", "should", "so", "some", "still", "such", "than", "that", "the", "their",
    "them", "then", "there", "these", "they", "this", "those", "through", "to", "too", "up",
    "upon", "us", "very", "was", "way", "we", "were", "what", "when", "where", "which",
    "while", "who", "why", "will", "with", "without", "would", "you", "your",
}

SEED_ADJECTIVES = [
    "ancient", "ashen", "black", "blind", "bright", "broken", "buried", "cold", "cracked",
    "crimson", "dark", "dead", "distant", "empty", "forgotten", "golden", "hollow", "iron",
    "lonely", "moonlit", "nameless", "old", "pale", "quiet", "red", "ruined", "secret",
    "shadowed", "silver", "strange", "thin", "white", "wild",
]

SEED_PLACES = [
    "bridge", "castle", "city", "courtyard", "crossroads", "door", "forest", "gate",
    "harbor", "hill", "keep", "marsh", "market", "mountain", "pass", "river", "road",
    "shore", "threshold", "tower", "valley", "wall", "well", "wood",
]

SEED_OBJECTS = [
    "arrow", "banner", "bell", "book", "bottle", "box", "candle", "cloak", "coin", "crown",
    "door", "drum", "feather", "flame", "horn", "key", "knife", "lantern", "letter", "map",
    "mask", "mirror", "oak tree", "ring", "rope", "sail", "seal", "shadow", "song", "spear",
    "stone", "sword", "thread", "torch", "window",
]

SEED_CREATURES = [
    "bird", "crow", "dog", "dragon", "fox", "horse", "hound", "raven", "serpent", "wolf",
]

SEED_PEOPLE = [
    "apprentice", "child", "guard", "heir", "king", "messenger", "pilgrim", "prisoner",
    "queen", "rider", "sailor", "scribe", "soldier", "stranger", "thief", "traveler",
    "witch", "witness",
]

SEED_VERBS = [
    "answer", "burn", "call", "cross", "dream", "fall", "follow", "forget", "hide",
    "listen", "open", "remember", "return", "run", "sing", "sleep", "speak", "turn",
    "vanish", "wait", "wake", "whisper",
]

SEED_OBJECT_VERBS = [
    "burn", "open", "ring", "sing", "split", "stir", "vanish", "wake", "whisper",
]

SEED_PAST_VERBS = [
    "burned", "called", "fell", "opened", "rang", "rose", "shivered", "stirred", "vanished",
    "waited", "whispered", "woke",
]

SEED_TIMES = [
    "dawn", "dusk", "midnight", "morning", "night", "spring", "sunrise", "winter",
]

SEED_SOUNDS = [
    "bell", "cry", "drum", "footstep", "horn", "knock", "song", "voice", "whisper",
]

COMMANDS = ["Run", "Hide", "Listen", "Wait", "Wake", "Look"]
MYSTERY_NOUNS = ["answer", "curse", "door", "name", "oath", "promise", "road", "secret", "sign", "warning"]
HIDING_PLACES = ["bridge", "floor", "gate", "oak tree", "roots", "stair", "table", "threshold", "tower", "well"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate original unfinished story hooks.")
    parser.add_argument("--count", type=int, default=500, help="Number of hooks to generate.")
    parser.add_argument("--seed", type=int, default=20260611, help="Deterministic random seed.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"Output path. Default: {DEFAULT_OUTPUT}")
    parser.add_argument("--min-words", type=int, default=2, help="Minimum words per hook.")
    parser.add_argument("--max-words", type=int, default=10, help="Maximum words per hook.")
    parser.add_argument("--input", type=Path, action="append", help="Input JSON file. May be repeated.")
    parser.add_argument(
        "--include-previews",
        action="store_true",
        help="Use Fantasy Book Cafe quote_preview fields as vocabulary evidence.",
    )
    return parser.parse_args()


def normalize_space(value: str) -> str:
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    value = value.replace("\u2018", "'").replace("\u2019", "'")
    value = value.replace("\u2014", "--").replace("\u2013", "-")
    return re.sub(r"\s+", " ", value).strip()


def tokenize(value: str) -> list[str]:
    return re.findall(r"[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'-]*", value)


def word_count(value: str) -> int:
    return len(tokenize(value))


def read_source_records(paths: list[Path], include_previews: bool) -> tuple[list[dict], Counter]:
    records: list[dict] = []
    source_counts: Counter = Counter()
    for path in paths:
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data.get("excerpts"), list):
            for item in data["excerpts"]:
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    records.append(source_record(path, item, text, "text"))
                    source_counts[str(path.relative_to(ROOT))] += 1
        if isinstance(data.get("sources"), list):
            for item in data["sources"]:
                text = item.get("text")
                field = "text"
                if (not isinstance(text, str) or not text.strip()) and include_previews:
                    text = item.get("quote_preview")
                    field = "quote_preview"
                if isinstance(text, str) and text.strip():
                    records.append(source_record(path, item, text, field))
                    source_counts[str(path.relative_to(ROOT))] += 1
    return records, source_counts


def source_record(path: Path, item: dict, text: str, field: str) -> dict:
    return {
        "source_file": str(path.relative_to(ROOT)),
        "source_id": item.get("id", ""),
        "title": item.get("title") or item.get("book_title") or item.get("post_title") or "",
        "author": item.get("author") or item.get("book_author") or item.get("reddit_author") or "",
        "text": text,
        "text_field": field,
    }


def harvest_lexicon(records: list[dict]) -> dict[str, Counter]:
    token_counts: Counter = Counter()
    lowercase_counts: Counter = Counter()
    uppercase_counts: Counter = Counter()
    noun_context_counts: Counter = Counter()
    adjective_counts: Counter = Counter()
    verb_counts: Counter = Counter()

    for record in records:
        text = normalize_space(record["text"])
        tokens = tokenize(text)
        lowered = [token.lower() for token in tokens]
        for token, lower in zip(tokens, lowered):
            if not useful_word(lower):
                continue
            token_counts[lower] += 1
            if token[:1].isupper():
                uppercase_counts[lower] += 1
            else:
                lowercase_counts[lower] += 1
            if looks_like_adjective(lower):
                adjective_counts[lower] += 1
            if looks_like_verb(lower):
                verb_counts[lower] += 1
        for index, lower in enumerate(lowered[:-1]):
            if lower not in {"a", "an", "the", "this", "that"}:
                continue
            window = lowered[index + 1 : index + 4]
            for candidate in reversed(window):
                if useful_word(candidate):
                    noun_context_counts[candidate] += 1
                    break

    properish = {word for word, count in uppercase_counts.items() if count > lowercase_counts[word]}
    return {
        "tokens": token_counts,
        "properish": Counter(properish),
        "nouns": noun_context_counts,
        "adjectives": adjective_counts,
        "verbs": verb_counts,
    }


def useful_word(word: str) -> bool:
    if word in STOPWORDS:
        return False
    if len(word) < 3 or len(word) > 14:
        return False
    if re.search(r"(.)\1\1", word):
        return False
    if "'" in word:
        return False
    return True


def looks_like_adjective(word: str) -> bool:
    return word in SEED_ADJECTIVES or word.endswith(("ed", "en", "ful", "less", "lit", "ous", "y"))


def looks_like_verb(word: str) -> bool:
    return word in SEED_PAST_VERBS or word.endswith(("ed", "ing"))


def build_pools(lexicon: dict[str, Counter]) -> dict[str, list[tuple[str, int]]]:
    properish = set(lexicon["properish"])
    nouns = lexicon["nouns"]
    tokens = lexicon["tokens"]

    return {
        "adjectives": ranked_pool(SEED_ADJECTIVES, lexicon["adjectives"], properish, limit=42),
        "places": ranked_pool(SEED_PLACES, nouns + Counter({word: tokens[word] for word in SEED_PLACES}), properish, limit=36),
        "objects": ranked_pool(SEED_OBJECTS, nouns + Counter({word: tokens[word] for word in SEED_OBJECTS}), properish, limit=48),
        "creatures": ranked_pool(SEED_CREATURES, nouns + Counter({word: tokens[word] for word in SEED_CREATURES}), properish, limit=20),
        "people": ranked_pool(SEED_PEOPLE, nouns + Counter({word: tokens[word] for word in SEED_PEOPLE}), properish, limit=30),
        "verbs": ranked_pool(SEED_VERBS, Counter({word: tokens[word] for word in SEED_VERBS}), properish, limit=28),
        "object_verbs": ranked_pool(SEED_OBJECT_VERBS, Counter({word: tokens[word] for word in SEED_OBJECT_VERBS}), properish, limit=20),
        "past_verbs": ranked_pool(SEED_PAST_VERBS, lexicon["verbs"], properish, limit=26),
        "times": ranked_pool(SEED_TIMES, Counter({word: tokens[word] for word in SEED_TIMES}), properish, limit=16),
        "sounds": ranked_pool(SEED_SOUNDS, nouns + Counter({word: tokens[word] for word in SEED_SOUNDS}), properish, limit=18),
        "mysteries": ranked_pool(MYSTERY_NOUNS, nouns + Counter({word: tokens[word] for word in MYSTERY_NOUNS}), properish, limit=18),
        "hiding_places": ranked_pool(HIDING_PLACES, nouns + Counter({word: tokens[word] for word in HIDING_PLACES}), properish, limit=18),
    }


def ranked_pool(seed_words: list[str], evidence: Counter, properish: set[str], limit: int) -> list[tuple[str, int]]:
    seen: set[str] = set()
    ranked: list[tuple[str, int]] = []
    for word in seed_words:
        key = word.lower()
        seen.add(key)
        ranked.append((word, max(2, evidence[key] + 2)))
    return ranked[:limit]


def choose(randomizer: random.Random, pool: list[tuple[str, int]]) -> str:
    words = [item[0] for item in pool]
    weights = [max(1, item[1]) for item in pool]
    return randomizer.choices(words, weights=weights, k=1)[0]


def cap_first(value: str) -> str:
    return value[:1].upper() + value[1:]


def article(value: str) -> str:
    first = value.strip().lower()[:1]
    return "an" if first in {"a", "e", "i", "o", "u"} else "a"


def pluralize(value: str) -> str:
    if " " in value:
        head, tail = value.rsplit(" ", 1)
        return f"{head} {pluralize(tail)}"
    if value.endswith("y") and value[-2:-1] not in {"a", "e", "i", "o", "u"}:
        return value[:-1] + "ies"
    if value.endswith(("s", "x", "ch", "sh")):
        return value + "es"
    return value + "s"


def different(randomizer: random.Random, pool: list[tuple[str, int]], other: str) -> str:
    for _ in range(20):
        value = choose(randomizer, pool)
        if value != other:
            return value
    return choose(randomizer, pool)


def generate_candidate(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    template = randomizer.choice(TEMPLATES)
    return template(randomizer, pools)


def template_almost_time(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    time = choose(randomizer, pools["times"])
    subject = randomizer.choice(["they", "someone", f"the {choose(randomizer, pools['people'])}"])
    text = f"It was almost {time} when {subject}"
    return hook(text, "unfinished_clause", "threshold", {"time": time, "subject": subject})


def template_command_until(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    command = randomizer.choice(COMMANDS)
    verb = randomizer.choice(["look back", "stop", "sleep", "speak", "turn around"])
    place = choose(randomizer, pools["places"])
    text = f'"{command}! {command}, and don\'t {verb} until you reach the {place}'
    return hook(text, "command", "urgent", {"command": command, "verb": verb, "place": place})


def template_adjective_and(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    noun = choose(randomizer, pools["objects"])
    adjective = choose(randomizer, pools["adjectives"])
    text = f"{cap_first(article(noun))} {noun}, {adjective} and"
    return hook(text, "image_fragment", "wonder", {"noun": noun, "adjective": adjective})


def template_no_one_remembered(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    place = choose(randomizer, pools["places"])
    text = f"No one near the {place} remembered why"
    return hook(text, "mystery", "forgotten", {"place": place})


def template_only_rule(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    person = choose(randomizer, pools["people"])
    text = f"The {person} had only one rule:"
    return hook(text, "rule", "mystery", {"person": person})


def template_when_began(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    noun = choose(randomizer, pools["objects"])
    verb = choose(randomizer, pools["object_verbs"])
    text = f"When the {noun} began to {verb},"
    return hook(text, "threshold", "uncanny", {"noun": noun, "verb": verb})


def template_edge_someone(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    place = choose(randomizer, pools["places"])
    text = f"At the edge of the {place}, someone"
    return hook(text, "unfinished_clause", "arrival", {"place": place})


def template_map_ended(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    place = choose(randomizer, pools["places"])
    text = f"The map ended at the {place}, but"
    return hook(text, "mystery", "threshold", {"place": place})


def template_last_noun(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    noun = choose(randomizer, pools["objects"])
    place = choose(randomizer, pools["places"])
    text = f"The last {noun} before the {place}"
    return hook(text, "image_fragment", "lastness", {"noun": noun, "place": place})


def template_sound_only(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    sound = choose(randomizer, pools["sounds"])
    subject = randomizer.choice(["the child", "the stranger", "the guard", "the witch"])
    text = f"Everyone heard the {sound}; only {subject}"
    return hook(text, "mystery", "secret", {"sound": sound, "subject": subject})


def template_beyond_something(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    place = choose(randomizer, pools["places"])
    verb = choose(randomizer, pools["past_verbs"])
    text = f"Beyond the {place}, something {verb}"
    return hook(text, "image_fragment", "beyond", {"place": place, "verb": verb})


def template_warm_although(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    noun = choose(randomizer, pools["objects"])
    text = f"The {noun} was warm, although the"
    return hook(text, "mystery", "uncanny", {"noun": noun})


def template_opened_only_when(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    adjective = choose(randomizer, pools["adjectives"])
    noun = choose(randomizer, pools["objects"])
    text = f"The {adjective} {noun} opened only when"
    return hook(text, "threshold", "uncanny", {"adjective": adjective, "noun": noun})


def template_between_places(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    first = choose(randomizer, pools["places"])
    second = different(randomizer, pools["places"], first)
    text = f"Between the {first} and the {second},"
    return hook(text, "image_fragment", "journey", {"first_place": first, "second_place": second})


def template_found_beneath(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    person = choose(randomizer, pools["people"])
    thing = choose(randomizer, pools["objects"])
    adjective = choose(randomizer, pools["adjectives"])
    hiding_place = choose(randomizer, pools["hiding_places"])
    text = f"The {person} found the {thing} under the {adjective} {hiding_place}"
    return hook(
        text,
        "mystery",
        "discovery",
        {"person": person, "thing": thing, "adjective": adjective, "hiding_place": hiding_place},
    )


def template_before_bells(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    noun = choose(randomizer, pools["sounds"])
    person = choose(randomizer, pools["people"])
    text = f"Before the {pluralize(noun)} rang, the {person}"
    return hook(text, "unfinished_clause", "omen", {"sound": noun, "person": person})


def template_creature_at_window(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    creature = choose(randomizer, pools["creatures"])
    adjective = choose(randomizer, pools["adjectives"])
    text = f"The {creature} at the window was {adjective}, and"
    return hook(text, "image_fragment", "uncanny", {"creature": creature, "adjective": adjective})


def template_first_lie(randomizer: random.Random, pools: dict[str, list[tuple[str, int]]]) -> dict:
    person = choose(randomizer, pools["people"])
    mystery = choose(randomizer, pools["mysteries"])
    text = f"The {person} lied about the {mystery} because"
    return hook(text, "mystery", "secret", {"person": person, "mystery": mystery})


TEMPLATES = [
    template_almost_time,
    template_command_until,
    template_adjective_and,
    template_no_one_remembered,
    template_only_rule,
    template_when_began,
    template_edge_someone,
    template_map_ended,
    template_last_noun,
    template_sound_only,
    template_beyond_something,
    template_warm_although,
    template_opened_only_when,
    template_between_places,
    template_found_beneath,
    template_before_bells,
    template_creature_at_window,
    template_first_lie,
]


def hook(text: str, kind: str, mood: str, ingredients: dict[str, str]) -> dict:
    return {
        "text": normalize_space(text),
        "kind": kind,
        "mood": mood,
        "ingredients": ingredients,
    }


def anchor_hooks() -> list[dict]:
    return [
        hook(
            "It was almost night when they",
            "unfinished_clause",
            "threshold",
            {"time": "night", "subject": "they"},
        ),
        hook(
            '"Run! Run, and don\'t stop until you reach the river',
            "command",
            "urgent",
            {"command": "Run", "verb": "stop", "place": "river"},
        ),
        hook(
            "An oak tree, ancient and",
            "image_fragment",
            "wonder",
            {"noun": "oak tree", "adjective": "ancient"},
        ),
    ]


def valid_hook(item: dict, min_words: int, max_words: int) -> bool:
    text = item["text"]
    count = word_count(text)
    if not (min_words <= count <= max_words):
        return False
    lowered = text.lower()
    if re.search(r"\b(\w+)\s+\1\b", lowered):
        return False
    if "  " in text or "the the" in lowered:
        return False
    if text.endswith("."):
        return False
    values = [value.lower() for value in item["ingredients"].values()]
    return len(values) == len(set(values))


def score_hook(item: dict) -> int:
    text = item["text"]
    score = 4
    if text.endswith((",", ":", "and", "but", "because", "when", "the")):
        score += 2
    if text.startswith('"'):
        score += 2
    if any(word in text.lower() for word in ["almost", "only", "no one", "before", "beyond"]):
        score += 1
    if any(value in text.lower() for value in ["river", "gate", "door", "forest", "tower", "road"]):
        score += 1
    return score


def hook_record(item: dict, ordinal: int, seed: int) -> dict:
    text = item["text"]
    key = f"{seed}|{ordinal}|{text}"
    return {
        "id": f"story-hook-{hashlib.sha1(key.encode('utf-8')).hexdigest()[:14]}",
        "text": text,
        "kind": item["kind"],
        "mood": item["mood"],
        "score": score_hook(item),
        "word_count": word_count(text),
        "ingredients": item["ingredients"],
        "ordinal": ordinal,
    }


def generate_hooks(args: argparse.Namespace, pools: dict[str, list[tuple[str, int]]]) -> list[dict]:
    randomizer = random.Random(args.seed)
    hooks: list[dict] = []
    seen: set[str] = set()
    for candidate in anchor_hooks():
        if valid_hook(candidate, args.min_words, args.max_words):
            seen.add(candidate["text"].lower())
            hooks.append(hook_record(candidate, len(hooks) + 1, args.seed))

    attempts = 0
    max_attempts = max(1000, args.count * 80)
    while len(hooks) < args.count and attempts < max_attempts:
        attempts += 1
        candidate = generate_candidate(randomizer, pools)
        key = candidate["text"].lower()
        if key in seen or not valid_hook(candidate, args.min_words, args.max_words):
            continue
        seen.add(key)
        hooks.append(hook_record(candidate, len(hooks) + 1, args.seed))
    return hooks


def write_output(path: Path, hooks: list[dict], source_counts: Counter, pools: dict[str, list[tuple[str, int]]], args: argparse.Namespace) -> None:
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "requested_count": args.count,
            "actual_count": len(hooks),
            "seed": args.seed,
            "min_words": args.min_words,
            "max_words": args.max_words,
            "include_previews": args.include_previews,
            "method": "original template generation from corpus-weighted fantasy/adventure vocabulary; hooks are not copied source excerpts",
            "source_counts": dict(source_counts),
            "ingredient_counts": {name: len(pool) for name, pool in pools.items()},
            "kind_counts": dict(Counter(hook["kind"] for hook in hooks)),
            "mood_counts": dict(Counter(hook["mood"] for hook in hooks)),
        },
        "hooks": hooks,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if args.min_words < 1 or args.max_words < args.min_words:
        raise SystemExit("Invalid min/max word range.")
    if args.max_words > 12:
        raise SystemExit("--max-words must be 12 or lower for short continuation hooks.")
    records, source_counts = read_source_records(args.input or DEFAULT_INPUTS, args.include_previews)
    lexicon = harvest_lexicon(records)
    pools = build_pools(lexicon)
    hooks = generate_hooks(args, pools)
    write_output(args.output, hooks, source_counts, pools, args)
    print(f"Wrote {len(hooks)} story hooks to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
