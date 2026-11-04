"""Renumber the primer's references in order of first citation.

  python3 tools/renumber_refs.py           # rewrite in place, then rebuild both banks
  python3 tools/renumber_refs.py --check   # exit 1 if renumbering is needed; writes nothing

docs/index.html is the canonical page. To add a reference, give its <li> and its
citation links any unused number, then run this script. It rewrites, in one pass:
  - docs/index.html: citation links, list ids and the order of the list items;
  - docs/quiz/questions_source.json and docs/dag-quiz/questions_source.json:
    each question's refs and evidence refs;
  - tools/reference_manifest.json: reference number -> full-text file name;
  - tools/page_claims.json: refs of the claims behind the page text.
It computes the whole mapping first and refuses to write anything if a cited
number has no list item, a list item is never cited, or a question or claim
points at a number the page does not list. It is idempotent: on a page already
in first-use order the mapping is the identity and nothing changes.
Afterwards rebuild the banks:
  node docs/quiz/build_bank.mjs docs/quiz/questions_source.json
  node docs/quiz/build_bank.mjs docs/dag-quiz/questions_source.json docs/dag-quiz
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "docs/index.html"
SOURCES = [ROOT / "docs/quiz/questions_source.json", ROOT / "docs/dag-quiz/questions_source.json"]
MANIFEST = ROOT / "tools/reference_manifest.json"
CLAIMS = ROOT / "tools/page_claims.json"


def mapping(html):
    body = html[: html.index('id="references"')]
    order = []
    for m in re.finditer(r'href="#ref-(\d+)"', body):
        n = int(m.group(1))
        if n not in order:
            order.append(n)
    listed = [int(n) for n in re.findall(r'<li id="ref-(\d+)">', html)]
    problems = [f"cited but not listed: {n}" for n in order if n not in listed]
    problems += [f"listed but never cited: {n}" for n in listed if n not in order]
    return {old: i + 1 for i, old in enumerate(order)}, problems


def renumber_page(html, new):
    # "@ref-" marks a number already mapped, so no number is mapped twice.
    html = re.sub(r'<a class="cite" href="#ref-(\d+)">(,?)(\d+)</a>',
                  lambda m: f'<a class="cite" href="#@ref-{new[int(m.group(1))]}">{m.group(2)}{new[int(m.group(1))]}</a>', html)
    html = re.sub(r'(href="#|id=")ref-(\d+)"', lambda m: f'{m.group(1)}@ref-{new[int(m.group(2))]}"', html).replace("@ref-", "ref-")
    a = html.index('<ol class="refs" id="refs">') + len('<ol class="refs" id="refs">')
    b = html.index("</ol>", a)
    items = re.findall(r'(\s*<li id="ref-\d+">.*?</li>)', html[a:b], re.S)
    items.sort(key=lambda t: int(re.search(r'id="ref-(\d+)"', t).group(1)))
    return html[:a] + "".join(items) + "\n    " + html[b:]


def main(check):
    html = PAGE.read_text(encoding="utf-8")
    new, problems = mapping(html)
    banks = {p: json.loads(p.read_text(encoding="utf-8")) for p in SOURCES}
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    claims = json.loads(CLAIMS.read_text(encoding="utf-8"))
    for p, d in banks.items():
        for q in d["questions"]:
            for r in q["refs"] + [e["ref"] for e in q["evidence"]]:
                if r not in new:
                    problems.append(f"{p.name} {q['id']}: ref {r} is not on the page")
    for c in claims["claims"]:
        for r in c["refs"] + [e["ref"] for e in c["evidence"]]:
            if r not in new:
                problems.append(f"page_claims {c['id']}: ref {r} is not on the page")
    if problems:
        print("\n".join("FAIL " + x for x in problems))
        return 1
    if all(k == v for k, v in new.items()):
        print("references already in first-use order; nothing to do")
        return 0
    moved = {k: v for k, v in new.items() if k != v}
    print(f"renumbering {len(moved)} references: " + ", ".join(f"{k}->{v}" for k, v in sorted(moved.items())))
    if check:
        return 1
    PAGE.write_text(renumber_page(html, new), encoding="utf-8")
    for p, d in banks.items():
        for q in d["questions"]:
            q["refs"] = [new[r] for r in q["refs"]]
            for e in q["evidence"]:
                e["ref"] = new[e["ref"]]
        p.write_text(json.dumps(d, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    remapped = {str(new[int(k)]): v for k, v in manifest.items() if int(k) in new}
    MANIFEST.write_text(json.dumps(dict(sorted(remapped.items(), key=lambda kv: int(kv[0]))), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for c in claims["claims"]:
        c["refs"] = sorted(new[r] for r in c["refs"])
        for e in c["evidence"]:
            e["ref"] = new[e["ref"]]
    CLAIMS.write_text(json.dumps(claims, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote the page, both question sources, the manifest and the claims. Now rebuild both banks.")
    return 0


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
