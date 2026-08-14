"""Generate the response-matrix SVGs for the SimulacraBench page and splice
them into index.html at the @PLACEHOLDER comments.

Every graphic on the page descends from one vocabulary:
  filled cell    an observed response       class c-obs
  hollow cell    a model estimate           class c-est

Re-runnable: it always rewrites from the placeholders, which are restored on
each pass so the file can be regenerated after edits.
"""
import random
import re
import pathlib

# resolved from this file's own location, so the project can live anywhere
HTML = pathlib.Path(__file__).resolve().parent / "index.html"


def cell(x, y, s, cls):
    return ('<rect x="%g" y="%g" width="%g" height="%g" class="%s"/>'
            % (x, y, s, s, cls))


# ------------------------------------------------------- why compete, 3 panels
def wc_grid(kind, seed=0):
    """Three panels over the same population of cells: all observed, all
    predicted, and predicted with a small random subsample of human labels."""
    n, s, gap = 8, 14, 5
    step = s + gap
    side = n * step - gap
    parts = []
    if kind == "solid":
        for r in range(n):
            for c in range(n):
                parts.append(cell(c * step, r * step, s, "c-obs"))
    elif kind == "hollow":
        for r in range(n):
            for c in range(n):
                parts.append(cell(c * step, r * step, s, "c-est"))
    else:
        rnd = random.Random(seed)
        # A genuinely random subset carries a human label. Sampling the flat
        # index rather than one per row is what keeps it from reading as a
        # pattern — clumps and empty regions are the point.
        labelled = set(rnd.sample(range(n * n), 9))
        for r in range(n):
            for c in range(n):
                parts.append(cell(c * step, r * step, s,
                                  "c-obs" if r * n + c in labelled else "c-est"))
    return ('<svg class="mx" viewBox="0 0 %g %g" '
            'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">%s</svg>'
            % (side, side, "".join(parts)))


def main():
    BLOCKS = {
        "HERO_PATTERN": hero_code(),
        "WC_P1": wc_grid("solid"),
        "WC_P2": wc_grid("hollow"),
        "WC_P3": wc_grid("mixed", seed=2887),
    }
    
    src = HTML.read_text()
    for name, svg in BLOCKS.items():
        ph = "<!--@%s-->" % name
        # restore the placeholder if a previous pass already filled it
        src = re.sub(r'<!--@%s-->.*?<!--/@%s-->' % (name, name), ph, src, flags=re.S)
        if ph not in src:
            raise SystemExit("placeholder missing: " + name)
        src = src.replace(ph, "%s%s<!--/@%s-->" % (ph, svg, name))
    HTML.write_text(src)
    print("filled %d blocks, %d bytes" % (len(BLOCKS), len(src)))


# ============================================================ hero pattern
# The banner says what kind of thing this is, in the response alphabet itself.

def hero_code():
    """The response alphabet as the banner's background. The field runs to
    the section edges — the exclusion around the copy is a CSS mask, not a
    boundary baked into the drawing, so nothing reads as a contained shape."""
    rnd = random.Random(11)
    tokens = ["0", "1", "0", "1", "\u03a9", "1", "0", "0", "1",
              "p\u0302", "1", "0", "0", "1"]
    W, H = 1460, 720
    fs, lh = 13, 27
    cw = fs * 0.62
    parts = []
    i = 0
    y = 18
    while y < H + lh:
        x = rnd.uniform(-20, 30)
        while x < W:
            tok = tokens[(i * 7 + (i % 13)) % len(tokens)]
            i += 1
            adv = (len(tok) + 1) * cw
            t = x / W * 0.5 + (1 - y / H) * 0.3
            if rnd.random() > 0.30 + t * 0.5:
                x += adv
                continue
            yj = y + rnd.uniform(-5, 5)
            cls = "hc-em" if len(tok) > 1 else "hc"
            parts.append('<text class="%s" x="%g" y="%g" opacity="%.2f">%s</text>'
                         % (cls, round(x, 1), round(yj, 1),
                            0.10 + t * 0.38 + rnd.uniform(0, 0.06), tok))
            x += adv
        y += lh
    return _hero_svg(None, W, H, parts)


def _hero_svg(gid, w, h, parts):
    fill = ' fill="url(#%s)"' % gid if gid else ''
    return ('<svg class="hero-pattern-svg" viewBox="0 0 %g %g" '
            'preserveAspectRatio="xMidYMid slice"%s '
            'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">%s</svg>'
            % (w, h, fill, "".join(parts)))

if __name__ == "__main__":
    main()
