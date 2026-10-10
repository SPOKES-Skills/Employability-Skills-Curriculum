"""
SPOKES Money Management -- Part 2: Save Money Before You Spend It
Teacher's Guide for The Cushion Challenge (lesson-Money-Management/cushion-challenge.html)

Built from SPOKES Builder/Teachers_Guide_Template.py and the TeachersGuidePDF class
in generate_teachers_guides.py.

Run from anywhere:
    python lesson-Money-Management/Teacher-Resources/Part2_Save_First_Teachers_Guide.py

On a Windows machine with the standard fonts, the guide uses the same fonts as the
other SPOKES Teacher's Guides. Elsewhere it falls back to the self-hosted SPOKES fonts
(Outfit and DM Serif Display, converted from fonts/*.woff2; needs fonttools + brotli).
"""

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import generate_teachers_guides as gtg  # noqa: E402
from fpdf import FPDF  # noqa: E402

gtg.LOGO = str(ROOT / "SPOKES-Logo.png")

OUTPUT_PATH = str(Path(__file__).resolve().parent / "Part2_Save_First_Teachers_Guide.pdf")
LESSON_TITLE = "Money Management"
LESSON_SUBTITLE = "Part 2: Save Money Before You Spend It -- The Cushion Challenge"

WINDOWS_FONTS = Path("C:/Windows/Fonts/segoeui.ttf")


def _fallback_fonts():
    """Make static TTFs from the repo's woff2 files (fpdf2 cannot read woff2)."""
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    out = Path(tempfile.gettempdir()) / "spokes-guide-fonts"
    out.mkdir(exist_ok=True)
    files = {}

    def save(src, name, weight=None):
        target = out / name
        if not target.exists():
            font = TTFont(str(ROOT / "fonts" / src))
            font.flavor = None
            if weight is not None and "fvar" in font:
                font = instancer.instantiateVariableFont(font, {"wght": weight})
            font.save(str(target))
        return str(target)

    files["ui"] = save("outfit-latin.woff2", "outfit-400.ttf", 400)
    files["ui_b"] = save("outfit-latin.woff2", "outfit-700.ttf", 700)
    files["heading"] = save("dm-serif-display-latin.woff2", "dm-serif-display.ttf")
    files["heading_i"] = save("dm-serif-display-italic-latin.woff2", "dm-serif-display-italic.ttf")
    return files


class Part2GuidePDF(gtg.TeachersGuidePDF):
    """TeachersGuidePDF with a font fallback for machines without Windows fonts."""

    def __init__(self, title, subtitle, theme):
        if WINDOWS_FONTS.exists():
            super().__init__(title, subtitle, theme)
            return
        FPDF.__init__(self)
        self._title = title
        self._subtitle = subtitle
        self.t = theme
        self.set_auto_page_break(auto=True, margin=18)
        self.set_top_margin(18)
        self.set_left_margin(10)
        self.set_right_margin(10)
        f = _fallback_fonts()
        self.add_font("ui", "", f["ui"])
        self.add_font("ui", "B", f["ui_b"])
        self.add_font("ui", "I", f["ui"])
        self.add_font("ui", "BI", f["ui_b"])
        self.add_font("heading", "", f["heading"])
        self.add_font("heading", "B", f["heading"])
        self.add_font("heading", "I", f["heading_i"])
        self.add_font("accent", "", f["heading_i"])


# SPOKES default theme from SPOKES Builder/Teachers_Guide_Template.py
THEME = dict(
    primary=(0, 123, 175),
    accent=(55, 181, 80),
    dark=(0, 64, 113),
    gold=(211, 178, 87),
    gray=(96, 99, 107),
    light=(237, 243, 247),
    mauve=(167, 37, 63),
    text=(51, 51, 51),
    white=(255, 255, 255),
    cover_grad_top=(0, 64, 113),
    cover_grad_bot=(0, 19, 63),
    accent_line=(55, 181, 80),
    badge_w=(55, 181, 80),
    badge_i=(0, 123, 175),
    badge_p=(0, 64, 113),
    badge_e=(167, 37, 63),
    badge_a=(211, 178, 87),
)


def build_guide():
    pdf = Part2GuidePDF(LESSON_TITLE, LESSON_SUBTITLE, THEME)
    pdf.cover_page()

    pdf.toc([
        ("W", "Chapter 1: Warm-Up -- Meet Jess", "Screen 1"),
        ("I", "Chapter 2: Introduction -- The Idea", "Screen 1"),
        ("P", "Chapter 3: Presentation -- Paydays 1 and 2", "Screens 2-5"),
        ("P", "Chapter 4: Practice -- Paydays 3 and 4", "Screens 6-8"),
        ("E", "Chapter 5: Evaluation -- How It Went", "Screen 9"),
        ("A", "Chapter 6: Application -- Your Turn", "Screen 10"),
    ])

    # ══════════════════════════════════════════════════════════════════
    # CHAPTER 1: WARM-UP
    # ══════════════════════════════════════════════════════════════════
    pdf.chapter_head("W", "CHAPTER 1: WARM-UP -- MEET JESS", "WARM-UP")

    pdf.slide_entry(1, "Meet Jess", "Story Intro")
    pdf.speaking_notes(
        "Part 2 runs about 10 minutes and is taught as one idea through one story. "
        "Before class, open The Cushion Challenge on the classroom screen and press Start over. "
        "It opens in Class mode: large text for the projector, lettered choices, and answers that wait "
        "until you reveal them. Check that the Class mode button at the top says On.\n\n"
        "Play the Meet Jess video at the top of the screen (about one minute, captions on). "
        "It introduces Jess, a mom of two who found work through SPOKES, and ends by asking the class to help her.\n\n"
        "Then point to the facts on screen: she still gets SNAP, her take-home pay is $400 a week, and every dollar "
        "already has a job. Her goal is a small cushion so one bad week does not turn into a crisis."
    )
    pdf.video("Meet Jess (about one minute, captioned)")
    pdf.discussion(
        "Ask: 'What is one surprise cost families run into?' "
        "Take two or three quick answers. Ask for the kind of cost, never the amount."
    )
    pdf.tip(
        "Jess and her numbers are made up on purpose. No one shares their own income, "
        "benefits, or balances at any point in Part 2. Say this out loud before you start."
    )

    # ══════════════════════════════════════════════════════════════════
    # CHAPTER 2: INTRODUCTION
    # ══════════════════════════════════════════════════════════════════
    pdf.chapter_head("I", "CHAPTER 2: INTRODUCTION -- THE IDEA", "INTRODUCTION")

    pdf.slide_entry(1, "State the Goal", "Instructor Talk")
    pdf.speaking_notes(
        "Give the one idea of Part 2 in a sentence before Payday 1:\n"
        "'Save a little first, automatically, somewhere safe, so a small cushion protects your family. "
        "You can do it while on benefits.'\n\n"
        "Point to the cushion meter and its gold goal line at $250. Tell the class they will make "
        "Jess's choices for four paydays and watch what each choice does."
    )
    pdf.tip(
        "How each vote works: read the question, and the class calls out or holds up a letter (A, B, C or D). "
        "Click the winning choice, or press that letter on the keyboard. The meter does not move yet. "
        "Ask one or two learners why they picked it, then click Reveal what happens. "
        "Keep each vote to about 30 seconds to stay inside 10 minutes."
    )

    # ══════════════════════════════════════════════════════════════════
    # CHAPTER 3: PRESENTATION -- PAYDAYS 1 AND 2
    # ══════════════════════════════════════════════════════════════════
    pdf.chapter_head("P", "CHAPTER 3: PAYDAYS 1 AND 2", "PRESENTATION")

    pdf.slide_entry(2, "Payday 1: When Does Jess Save?", "Class Vote")
    pdf.speaking_notes(
        "Choices: save $10, $25, or $50 first, or save what's left at the end of the week.\n\n"
        "If the class picks 'save what's left,' let it play out: by Friday nothing is left. "
        "That is the lesson, so no correction is needed.\n\n"
        "Pop-up line to say: 'Pay yourself first. Treat savings like a bill you pay the day money arrives. "
        "The habit matters more than the amount.'"
    )
    pdf.discussion("Ask: 'Why does saving at the end of the week usually mean saving nothing?'")

    pdf.slide_entry(3, "Payday 2: Where Should Jess Keep Her Savings?", "Class Vote")
    pdf.speaking_notes(
        "Choices: a jar at home, an account with a $12 monthly fee and overdraft charges, "
        "or a Bank On-style account.\n\n"
        "Expected answer: the Bank On-style account. The fee account loses $12 right away. "
        "The jar looks fine now, but Jess dips into it on Payday 3.\n\n"
        "Pop-up line to say: 'Keep savings somewhere safe. Bank On certified accounts have no overdraft "
        "fees, need $25 or less to open, and are federally insured.'"
    )
    pdf.tip(
        "If a learner asks where to find a Bank On account locally, say you will follow up. "
        "The team is checking which nearby banks or credit unions offer one."
    )

    pdf.slide_entry(4, "Payday 2: Make Saving Automatic?", "Class Vote")
    pdf.speaking_notes(
        "Jess's employer can split her direct deposit so the same amount goes to savings every payday.\n\n"
        "Expected answer: yes. If the class says no, Jess skips saving during a busy week on Payday 3 -- "
        "the class will see the difference on the meter.\n\n"
        "Pop-up line to say: 'Set it once. Automatic saving does not depend on remembering or willpower.'"
    )

    pdf.slide_entry(5, "Payday 2: Emergency or Planned?", "Class Vote")
    pdf.speaking_notes(
        "School picture day costs $30, and the form came home two weeks ago.\n\n"
        "Expected answer: planned cost. An emergency is something you did not see coming. "
        "School pictures, birthdays, and car registration come every year, so they belong in the weekly plan, "
        "not the cushion."
    )
    pdf.discussion("Ask: 'What other costs come every year that we could plan for?'")

    # ══════════════════════════════════════════════════════════════════
    # CHAPTER 4: PRACTICE -- PAYDAYS 3 AND 4
    # ══════════════════════════════════════════════════════════════════
    pdf.chapter_head("P", "CHAPTER 4: PAYDAYS 3 AND 4", "PRACTICE")

    pdf.slide_entry(6, "Payday 3: Flat Tire", "Story Event")
    pdf.speaking_notes(
        "No vote here. The screen applies this week's saving, then a $60 flat tire hits.\n\n"
        "If the cushion covered it, point out what that prevented: no late rent, no borrowing, no missed shift. "
        "If Jess came up short, note that a slightly bigger cushion would have covered it.\n\n"
        "Pop-up line to say: 'Families with $250 to $749 saved were less likely to be evicted or miss a "
        "housing or utility payment after a money shock.' (Urban Institute, April 2016)"
    )

    pdf.slide_entry(7, "Payday 3: The SNAP Question", "Class Vote")
    pdf.speaking_notes(
        "A friend tells Jess that saving will cost her SNAP. Choices: stop saving, keep it quiet, "
        "or ask her caseworker how savings affects her benefits.\n\n"
        "Expected answer: ask her caseworker.\n\n"
        "Pop-up line to say: 'In West Virginia, SNAP lists no limit on savings for most households. "
        "WV WORKS is different: it counts savings, so check with a caseworker.' (USDA FNS, June 2026)"
    )
    pdf.tip(
        "If a learner asks about their own benefits, thank them and point them to their caseworker. "
        "Do not give eligibility advice, and do not quote a WV WORKS dollar limit -- the team has not "
        "verified the current figure."
    )

    pdf.slide_entry(8, "Payday 4: Tax Refund", "Class Vote")
    pdf.speaking_notes(
        "Jess's $1,200 refund arrives. Choices: $0, $100, $300, or $600 to savings first.\n\n"
        "Any amount above $0 is a good answer. The point is deciding before the money is spent.\n\n"
        "Pop-up line to say: 'You can split a federal refund into up to three accounts, including savings, "
        "when you e-file or with Form 8888.' (IRS)"
    )

    # ══════════════════════════════════════════════════════════════════
    # CHAPTER 5: EVALUATION
    # ══════════════════════════════════════════════════════════════════
    pdf.chapter_head("E", "CHAPTER 5: EVALUATION -- HOW IT WENT", "EVALUATION")

    pdf.slide_entry(9, "How It Went", "Results")
    pdf.speaking_notes(
        "The screen shows Jess's final cushion, what helped, and what held her back. "
        "Read the one-sentence idea at the bottom aloud.\n\n"
        "Use the class's votes during the game as evidence of understanding. Learners who chose save-first, "
        "a safe account, automation, and asking a caseworker have met the objective."
    )
    pdf.discussion(
        "Ask: 'Which one choice made the biggest difference for Jess?' "
        "Listen for: saving first or making it automatic."
    )
    pdf.tip(
        "Short on time? Skip the discussion and move to Your Turn. Want to show the contrast? "
        "Press Play again and make the opposite choices -- it takes about two minutes."
    )

    # ══════════════════════════════════════════════════════════════════
    # CHAPTER 6: APPLICATION
    # ══════════════════════════════════════════════════════════════════
    pdf.chapter_head("A", "CHAPTER 6: APPLICATION -- YOUR TURN", "APPLICATION")

    pdf.slide_entry(10, "Your Turn: My First Step", "Personal Commitment")
    pdf.speaking_notes(
        "Each learner picks one first step for this week:\n"
        "1. Pick an amount to save first each payday\n"
        "2. Open a safe place for savings\n"
        "3. Set up one automatic transfer or split deposit\n"
        "4. Ask my caseworker one question about saving\n"
        "5. Plan part of my tax refund before it arrives\n\n"
        "In Class mode the screen lists the five steps and tells learners to circle one on their paper card. "
        "Nothing personal goes on the big screen. The amount line is optional, and cards are not collected.\n\n"
        "A learner with a device can open the game with Class mode off and make a private card on the last screen."
    )
    pdf.materials("My First Step card -- one per learner.")
    pdf.tip(
        "One-on-one: turn Class mode off. The game shrinks to laptop size and each answer shows right away. "
        "Virtual groups: keep Class mode on, share your screen, and have learners type a letter in the chat."
    )

    pdf.checklist([
        ("The Cushion Challenge (HTML)", "lesson-Money-Management/cushion-challenge.html"),
        ("Projector, smart board, or shared screen", "Open the game, press Start over, check Class mode is On"),
        ("Speakers for the Meet Jess video", "Video and captions play inside the game"),
        ("My First Step card", "One per learner; paper version in progress"),
        ("Part 2 Lesson Plan", "Teacher-Resources folder"),
        ("Pens or pencils", "For paper cards"),
    ])

    pdf.output(OUTPUT_PATH)
    print(f"Created: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_guide()
