#!/usr/bin/env python3
"""
generate-hebrew-lemmas.py — VocaHebrew lemma bulk generator.

Pipeline:
    plain Hebrew word  →  Dicta Nakdan (niqqud + morphology)
                       →  Gemini (definition, example, EN/AR translation, theme)
                       →  HebrewLemma row appended to a .generated.ts file

The script is HEBREW-ONLY. It never reads or writes vocabulary.ts (the
English source). Output goes to vocabulary-hebrew.generated.ts so you
can review before merging into vocabulary-hebrew.ts by hand.

Usage:
    pip install requests
    python scripts/generate-hebrew-lemmas.py \\
        --input scripts/hebrew-seed-words.txt \\
        --output src/data/vocabulary-hebrew.generated.ts \\
        --start-id 31

Env:
    GOOGLE_CLOUD_API_KEY   Optional. Without it, AI fields are emitted
                            as TODO markers for manual fill.

Cache:
    Dicta + Gemini responses are cached under .cache/hebrew-lemmas/
    so re-runs on the same input cost nothing. Delete the cache dir
    to force fresh API calls.

First-run note:
    Dicta APIs evolve. After your first run, eyeball the cached
    response under .cache/hebrew-lemmas/dicta-*.json and confirm the
    parser in extract_morphology() matches the actual shape. Adjust
    DICTA_NAKDAN_URL if the endpoint has moved (see https://dicta.org.il/).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import sys
import time
from typing import Any
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

try:
    import requests
except ImportError:
    sys.exit("requests not installed. Run: pip install requests")

# Windows consoles default to cp1252 and choke on the niqqud + arrows in
# our log lines. Force UTF-8 so prints don't crash on non-ASCII output.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, OSError):
        pass

# ── Endpoints ────────────────────────────────────────────────────────
# Dicta Nakdan returns niqqud + per-token morphology (pos, gender,
# number, root). Verify at https://dicta.org.il/ if this 404s.
DICTA_NAKDAN_URL = "https://nakdan-2-0.loadbalancer.dicta.org.il/api"

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL_TPL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={{key}}"
)

CACHE_DIR = pathlib.Path(".cache/hebrew-lemmas")

# Frequency-rank → gradeBand. Tweak boundaries to taste once you have
# real frequency data feeding the input file.
GRADE_BANDS = [
    (500, "1-2"),
    (1500, "3-4"),
    (3000, "5-6"),
    (10_000, "7-9"),
]

# Allowed pos values mirror types-hebrew.ts HebrewPos.
ALLOWED_POS = {
    "noun", "verb", "adjective", "adverb",
    "preposition", "pronoun", "phrase", "interjection", "other",
}

# ── Cache helpers ────────────────────────────────────────────────────

def cache_key(*parts: str) -> pathlib.Path:
    """Stable filename per input. Keeps re-runs idempotent + cheap."""
    h = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{parts[0]}-{h}.json"


_SENSITIVE_QUERY_KEYS = {"key", "api_key", "apikey", "access_token", "token"}


def _scrub_url_for_cache(url: str) -> str:
    """Drop credential-bearing query params before using a URL as a cache key.

    Google APIs put the API key in `?key=...`. We don't want secrets ending up
    in cache filenames or in the hash input — both are unnecessary, and the
    second trips CodeQL's clear-text-storage rule (py/clear-text-storage-sensitive-data).
    """
    parsed = urlparse(url)
    safe_qs = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
               if k.lower() not in _SENSITIVE_QUERY_KEYS]
    return urlunparse(parsed._replace(query=urlencode(safe_qs)))


def cached_post(label: str, url: str, payload: dict, *, headers: dict | None = None) -> Any:
    """POST + JSON, cached on disk by (label, url, payload) hash."""
    path = cache_key(label, _scrub_url_for_cache(url),
                     json.dumps(payload, sort_keys=True, ensure_ascii=False))
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    r = requests.post(url, json=payload, headers=headers or {}, timeout=30)
    r.raise_for_status()
    data = r.json()
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data


# ── Dicta Nakdan ─────────────────────────────────────────────────────

def call_dicta(word: str) -> Any:
    """Vocalize one Hebrew word and return the raw Dicta response."""
    payload = {
        "task": "nakdan",
        "data": word,
        "genre": "modern",
        "addmorph": True,
        "matchpartial": False,
        "keepmetagim": True,
    }
    return cached_post("dicta", DICTA_NAKDAN_URL, payload)


def extract_niqqud(dicta_response: Any) -> dict[str, Any]:
    """
    Pull the best vocalization out of the Dicta Nakdan response.

    Response shape (verified 2026-05): top-level list of tokens, each
        { "word": "ספר", "options": [["סֵפֶר", [[code, ...], ...]], ...] }
    options[0][0] is Dicta's most-likely niqqud. The numeric morph codes
    are bit-packed and undocumented, so we delegate pos/gender/number/
    shoresh to Gemini rather than try to decode them.
    """
    out: dict[str, Any] = {"lemmaNiqqud": None, "lemmaPlain": None}

    tokens = dicta_response if isinstance(dicta_response, list) else dicta_response.get("data") or []
    if not tokens or not isinstance(tokens[0], dict):
        return out

    first = tokens[0]
    out["lemmaPlain"] = first.get("word")
    options = first.get("options") or []

    if options and isinstance(options[0], (list, tuple)) and options[0]:
        out["lemmaNiqqud"] = options[0][0]
    else:
        out["lemmaNiqqud"] = out["lemmaPlain"]

    return out


_NIQQUD_CHARS = set(range(0x0591, 0x05C8))


def _strip_niqqud(s: str) -> str:
    return "".join(c for c in s if ord(c) not in _NIQQUD_CHARS)


# ── Gemini enrichment (optional) ─────────────────────────────────────

GEMINI_PROMPT = """You are a Hebrew curriculum editor for an Israeli school
vocabulary app. For the Hebrew lemma below, return STRICT JSON with these
exact keys — no prose, no markdown fence:

{{
  "pos": "<one of: noun, verb, adjective, adverb, preposition, pronoun, phrase, interjection, other>",
  "gender": "<m | f | both | null — null for verbs/adverbs/etc that have no grammatical gender>",
  "number": "<singular | plural | dual | null>",
  "shoresh": "<3 root letters as a 3-character string, or null if no clear root>",
  "binyan": "<paal | nifal | piel | pual | hifil | hufal | hitpael | null — set only when pos == verb>",
  "definitionHe": "<short Hebrew definition WITH niqqud, classroom-appropriate>",
  "exampleHe": "<one short Hebrew example sentence WITH niqqud, uses the lemma>",
  "translationEn": "<single most common English translation>",
  "translationAr": "<single most common Arabic translation>",
  "theme": "<one of: animals, family, school, weather, feelings, food, body, time, verbs, household, nature, transport, clothing, other>"
}}

Lemma (vocalized): {lemma_niqqud}
Lemma (plain): {lemma_plain}
"""


def call_gemini(api_key: str, niqqud: dict[str, Any]) -> dict[str, Any]:
    """Return AI-generated morphology + text fields. Empty dict on any failure."""
    prompt = GEMINI_PROMPT.format(
        lemma_niqqud=niqqud["lemmaNiqqud"] or "?",
        lemma_plain=niqqud["lemmaPlain"] or "?",
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }
    url = GEMINI_URL_TPL.format(key=api_key)

    try:
        data = cached_post(f"gemini-{niqqud['lemmaPlain']}", url, payload)
    except requests.HTTPError as e:
        print(f"  ! Gemini error for {niqqud['lemmaPlain']}: {e}", file=sys.stderr)
        return {}

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"  ! Gemini parse error for {niqqud['lemmaPlain']}: {e}", file=sys.stderr)
        return {}

    if not isinstance(parsed, dict):
        return {}

    out: dict[str, Any] = {}
    pos = (parsed.get("pos") or "").lower()
    out["pos"] = pos if pos in ALLOWED_POS else "other"

    g = (parsed.get("gender") or "").lower()
    if g in ("m", "f", "both"):
        out["gender"] = g

    n = (parsed.get("number") or "").lower()
    if n in ("singular", "plural", "dual"):
        out["number"] = n

    sh = parsed.get("shoresh")
    if isinstance(sh, str) and 2 <= len(sh) <= 4:
        out["shoresh"] = list(sh)
    elif isinstance(sh, list) and 2 <= len(sh) <= 4:
        out["shoresh"] = [str(c) for c in sh]

    bn = (parsed.get("binyan") or "").lower()
    if bn in ("paal", "nifal", "piel", "pual", "hifil", "hufal", "hitpael"):
        out["binyan"] = bn

    for k in ("definitionHe", "exampleHe", "translationEn", "translationAr", "theme"):
        v = parsed.get(k)
        if isinstance(v, str) and v.strip():
            out[k] = v.strip()

    return out


# ── Grade-band assignment ────────────────────────────────────────────

def grade_band(rank: int) -> str:
    for cap, band in GRADE_BANDS:
        if rank <= cap:
            return band
    return "10-12"


# ── TS output ────────────────────────────────────────────────────────

TS_HEADER = """// AUTO-GENERATED by scripts/generate-hebrew-lemmas.py
// Review for niqqud accuracy + AI translations before merging into
// vocabulary-hebrew.ts. Each row's id is stable — never renumber.

import type { HebrewLemma } from "./types-hebrew";

export const HEBREW_LEMMAS_GENERATED: readonly HebrewLemma[] = [
"""

TS_FOOTER = "];\n"


def render_lemma(lemma: dict[str, Any]) -> str:
    """Render one HebrewLemma object as a TS literal."""
    def _q(v: Any) -> str:
        if v is None:
            return "undefined"
        if isinstance(v, str):
            return json.dumps(v, ensure_ascii=False)
        if isinstance(v, (list, tuple)):
            return "[" + ", ".join(_q(x) for x in v) + "]"
        return json.dumps(v, ensure_ascii=False)

    fields = [
        ("id", lemma["id"]),
        ("lemmaNiqqud", lemma["lemmaNiqqud"]),
        ("lemmaPlain", lemma["lemmaPlain"]),
        ("pos", lemma["pos"]),
    ]
    for opt in ("shoresh", "binyan", "gender", "number"):
        if lemma.get(opt) is not None:
            fields.append((opt, lemma[opt]))
    fields.extend([
        ("definitionHe", lemma.get("definitionHe", "TODO")),
        ("exampleHe", lemma.get("exampleHe", "TODO")),
        ("translationEn", lemma.get("translationEn", "TODO")),
        ("translationAr", lemma.get("translationAr", "TODO")),
        ("gradeBand", lemma["gradeBand"]),
        ("theme", lemma.get("theme", "other")),
    ])
    body = ",\n    ".join(f"{k}: {_q(v)}" for k, v in fields)
    return "  {\n    " + body + ",\n  }"


# ── Main ─────────────────────────────────────────────────────────────

def read_input(path: pathlib.Path) -> list[str]:
    """One Hebrew word per line, # for comments, blank lines ignored."""
    if not path.exists():
        sys.exit(f"input file not found: {path}")
    out: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.split("#", 1)[0].strip()
        if s:
            out.append(s)
    return out


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, type=pathlib.Path,
                   help="Text file, one Hebrew word per line.")
    p.add_argument("--output", required=True, type=pathlib.Path,
                   help="TS file to write generated lemmas to.")
    p.add_argument("--start-id", type=int, required=True,
                   help="First numeric id to use. MUST be greater than the max id "
                        "already in vocabulary-hebrew.ts.")
    p.add_argument("--limit", type=int, default=0,
                   help="Stop after N words (0 = no limit).")
    p.add_argument("--rate-ms", type=int, default=200,
                   help="Sleep between API calls, milliseconds.")
    args = p.parse_args()

    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")
    if not api_key:
        print("! GOOGLE_CLOUD_API_KEY not set — translations will be TODO.", file=sys.stderr)

    words = read_input(args.input)
    if args.limit > 0:
        words = words[: args.limit]
    print(f"→ processing {len(words)} word(s)")

    lemmas: list[dict[str, Any]] = []
    for rank, word in enumerate(words, start=1):
        print(f"  [{rank}/{len(words)}] {word}")
        try:
            niqqud = extract_niqqud(call_dicta(word))
        except requests.HTTPError as e:
            print(f"    ! Dicta failed: {e}", file=sys.stderr)
            continue

        if not niqqud["lemmaPlain"]:
            print(f"    ! Dicta returned no niqqud — skipping", file=sys.stderr)
            continue

        lemma: dict[str, Any] = {
            **niqqud,
            "id": args.start_id + rank - 1,
            "pos": "other",
            "gradeBand": grade_band(rank),
        }

        if api_key:
            lemma.update(call_gemini(api_key, niqqud))

        lemmas.append(lemma)
        if args.rate_ms > 0:
            time.sleep(args.rate_ms / 1000)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    body = ",\n".join(render_lemma(l) for l in lemmas)
    args.output.write_text(TS_HEADER + body + ("\n" if lemmas else "") + TS_FOOTER,
                           encoding="utf-8")
    print(f"✓ wrote {len(lemmas)} lemma(s) → {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
