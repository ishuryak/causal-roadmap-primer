"""Check that every evidence quote in the quiz bank appears verbatim in its source.

Usage: python3 tools/check_evidence.py FILE.json [--sources DIR]
FILE is a question source (docs/quiz/questions_source.json,
docs/dag-quiz/questions_source.json) or tools/page_claims.json.
Exit 0 when every quote is found, 1 otherwise, 2 if the sources are missing.

The full texts (*.norm.txt) are kept outside this repository because several are
under publisher copyright. Pass their folder with --sources or set
CAUSAL_PRIMER_SOURCES. tools/reference_manifest.json maps each reference number
to its file. A quote match shows the quoted words are in the source. It does not
show that the surrounding sentence on the page follows from them: read changed
passages against the full text.
A quote may use " ... " to skip text; each piece must be at least 6 words and the
pieces must appear in order. Matching ignores case, whitespace, curly quotes and
dash variants, and nothing else. If that fails, a second pass compares words only
(letters and digits, in order, contiguous), which absorbs the spacing that XML tags
and PDF extraction leave around punctuation. Every word must still match. The count of
quotes that needed the second pass is printed.
A manifest entry may list several files when one reference has several full texts
(two revisions of the same online book); the quote must name one of them.
"""
import json, re, sys, unicodedata
from pathlib import Path

import os
HERE = Path(__file__).resolve().parent


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"[‐-―−]", "-", s)
    s = s.replace("·", ".")  # Lancet mid-dot decimals
    return re.sub(r"\s+", " ", s).strip().lower()


MANIFEST = HERE / "reference_manifest.json"  # primer reference number -> full-text file


def words(s):
    """Word-level form: letters and digits, plus the tokens that carry meaning in
    numbers (decimals, signs, comparison symbols), so 0.5 never matches -0.5 or
    0 5, and < never matches >."""
    toks = re.findall(r"\d+(?:\.\d+)+|[a-z0-9]+|[<>=≤≥±%]|-(?=\s?\d)", norm(s))
    return " " + " ".join(toks) + " "


def found_in_order(pieces, src, fn):
    pos = 0
    for p in pieces:
        k = src.find(fn(p), pos)
        if k < 0:
            return p
        pos = k + len(fn(p))
    return None


def main(bank_path, ref_dir):
    bank = json.loads(Path(bank_path).read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    cache, bad, n, loose_n = {}, [], 0, 0
    for q in bank.get("questions") or bank.get("claims") or []:
        ev = q.get("evidence") or []
        if not ev:
            bad.append(f"{q['id']}: no evidence")
        for e in ev:
            n += 1
            f = ref_dir / e["file"]
            if not f.exists():
                bad.append(f"{q['id']}: missing source file {e['file']}")
                continue
            if f not in cache:
                raw = f.read_text(encoding="utf-8")
                cache[f] = (norm(raw), words(raw))
            strict, loose = cache[f]
            pieces = [p for p in re.split(r"\s*(?:\.\.\.|…)\s*", e["quote"]) if p.strip()]
            short = [p for p in pieces if len(p.split()) < 6]
            if short:
                bad.append(f"{q['id']}: quote piece under 6 words: {short[0]!r}")
            elif found_in_order(pieces, strict, norm) is not None:
                miss = found_in_order(pieces, loose, words)
                if miss is not None:
                    bad.append(f"{q['id']}: not found in {e['file']}: {miss[:90]!r}")
                else:
                    loose_n += 1
                    print(f"WORDS-ONLY {q['id']}: {e['quote'][:100]!r} (check by eye)")
            allowed = manifest.get(str(e.get("ref")))
            allowed = allowed if isinstance(allowed, list) else [allowed]
            if e["file"] not in allowed:
                bad.append(f"{q['id']}: reference {e.get('ref')} maps to {allowed}, but the quote names {e['file']}")
            if int(e.get("ref", -1)) not in q.get("refs", []):
                bad.append(f"{q['id']}: evidence ref {e.get('ref')} not in the question's refs {q.get('refs')}")
    for b in bad:
        print("FAIL", b)
    print(f"{n} quotes checked ({loose_n} matched on words only), {len(bad)} problems")
    return 0 if not bad else 1


if __name__ == "__main__":
    args = sys.argv[1:]
    src = os.environ.get("CAUSAL_PRIMER_SOURCES")
    if "--sources" in args:
        k = args.index("--sources")
        src = args[k + 1]
        del args[k:k + 2]
    if len(args) != 1 or not src or not Path(src).is_dir():
        print("usage: check_evidence.py FILE.json --sources DIR (or set CAUSAL_PRIMER_SOURCES)", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(args[0], Path(src)))
