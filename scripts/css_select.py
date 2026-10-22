"""Match a CSS selector list against one parsed element and its ancestors.

Just enough selector matching for the validator's logo checks (LOGO-02). Tag, class,
id and attribute selectors, :not(), :is() and :where() are matched; other pseudo-classes
(:hover, :first-child) are assumed to match; pseudo-elements (::before) never match the
element itself. Sibling combinators (+, ~) are assumed to match, because the parser does
not record siblings. Classes the lesson's script adds at runtime count as present.
"""
import re
from collections.abc import Sequence
from typing import Protocol


class Node(Protocol):
    tag: str
    attrs: dict[str, str | None]


PSEUDO_ELEMENTS = {"before", "after", "first-line", "first-letter", "marker", "placeholder", "selection", "backdrop"}
FUNCTIONAL_RE = re.compile(r"(::?)([\w-]+)\(")
SIMPLE_RE = re.compile(r"\*|[a-zA-Z][\w-]*|\.[\w-]+|#[\w-]+|\[[^\]]*\]|::?[\w-]+")
ATTR_RE = re.compile(r"""\[\s*([\w-]+)\s*(?:([*^$~|]?=)\s*['"]?([^'"\]]*?)['"]?\s*(?:\s[iIsS])?)?\s*\]""")


def split_top_level(text: str, separators: str) -> list[tuple[str, str]]:
    """Split on separator characters outside parentheses and brackets; each part keeps the separator before it."""
    parts: list[tuple[str, str]] = []
    depth, start, sep = 0, 0, ""
    for i, ch in enumerate(text):
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        elif depth == 0 and ch in separators:
            parts.append((sep, text[start:i]))
            start, sep = i + 1, ch
    parts.append((sep, text[start:]))
    return parts


def _compounds(selector: str) -> list[tuple[str, str]]:
    """(combinator before it, compound) pairs, left to right; the combinator is ' ', '>', '+' or '~'."""
    spaced = re.sub(r"\s*([>+~])\s*", r"\1", " ".join(selector.split()))
    return [(comb or " ", part) for comb, part in split_top_level(spaced, " >+~") if part]


def _pseudo_argument(compound: str, start: int) -> tuple[str, int]:
    """The text inside the parentheses that open at `start`, and the index after the closing one."""
    depth = 0
    for i in range(start, len(compound)):
        depth += {"(": 1, ")": -1}.get(compound[i], 0)
        if depth == 0:
            return compound[start + 1:i], i + 1
    return compound[start + 1:], len(compound)


def _attr_matches(token: str, node: Node) -> bool:
    match = ATTR_RE.fullmatch(token)
    if not match:
        return True
    name, op, expected = match.group(1).lower(), match.group(2), (match.group(3) or "").lower()
    value = node.attrs.get(name)
    if value is None and name not in node.attrs:
        return False
    actual = (value or "").lower()
    tests = {None: True, "=": actual == expected, "*=": expected in actual, "^=": actual.startswith(expected),
             "$=": actual.endswith(expected), "~=": expected in actual.split(),
             "|=": actual == expected or actual.startswith(expected + "-")}
    return tests.get(op, True)


def _list_matches(selector_list: str, node: Node, dynamic: set[str]) -> bool:
    """Compound-level match of a selector list used inside :not(), :is() or :where()."""
    return any(_compound_matches(_compounds(part)[-1][1], node, dynamic)
               for _, part in split_top_level(selector_list, ",") if _compounds(part))


def _simple_matches(token: str, node: Node, classes: set[str], dynamic: set[str]) -> bool:
    if token.startswith("."):
        return token[1:] in classes or token[1:] in dynamic
    if token.startswith("#"):
        return (node.attrs.get("id") or "") == token[1:]
    if token.startswith("["):
        return _attr_matches(token, node)
    if token.startswith(":"):
        return token.lstrip(":") not in PSEUDO_ELEMENTS and not token.startswith("::")
    return token == "*" or token == node.tag


def _compound_matches(compound: str, node: Node, dynamic: set[str]) -> bool:
    classes = set((node.attrs.get("class") or "").split())
    pos = 0
    while pos < len(compound):
        functional = FUNCTIONAL_RE.match(compound, pos)
        if functional:
            argument, pos = _pseudo_argument(compound, functional.end() - 1)
            name = functional.group(2).lower()
            if functional.group(1) == "::":
                return False
            if name == "not" and _list_matches(argument, node, dynamic):
                return False
            if name in ("is", "where", "matches") and not _list_matches(argument, node, dynamic):
                return False
            continue
        token = SIMPLE_RE.match(compound, pos)
        if not token or not _simple_matches(token.group(0), node, classes, dynamic):
            return False
        pos = token.end()
    return pos > 0


def _chain_matches(chain: list[tuple[str, str]], ancestors: Sequence[Node], dynamic: set[str]) -> bool:
    """Match the compounds left of the target against the ancestors, nearest last."""
    if not chain:
        return True
    *rest, (combinator, compound) = chain
    if combinator in "+~":
        return True
    for i in range(len(ancestors) - 1, -1, -1):
        if _compound_matches(compound, ancestors[i], dynamic) and _chain_matches(rest, ancestors[:i], dynamic):
            return True
        if combinator == ">":
            return False
    return False


def selector_matches(selector_list: str, node: Node, ancestors: Sequence[Node], dynamic: set[str]) -> bool:
    """True when any selector in the list could select `node`, given its ancestors (outermost first)."""
    for _, selector in split_top_level(selector_list, ","):
        compounds = _compounds(selector)
        if not compounds or compounds[0][1].startswith("@"):
            continue
        if not _compound_matches(compounds[-1][1], node, dynamic):
            continue
        shifted = [(comb, part) for (comb, _), (_, part) in zip(compounds[1:], compounds[:-1])]
        if _chain_matches(shifted, ancestors, dynamic):
            return True
    return False
