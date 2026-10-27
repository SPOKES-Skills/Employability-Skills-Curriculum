# Round 2 lesson structure

Status: design, decided by Britt on October 27, 2026. It applies to all six Round 2 lessons: Goal Setting, Money Management (Budget), Professionalism and Diversity, Knowing Your Rights in the Workplace, Communicating Assertively, and Workplace Ethics.

This file says how team-built content becomes one lesson. It does not authorize building a lesson. A build still needs Britt's explicit go and complete instructor-owned content (see `CLAUDE.md`).

Money Management is the first lesson using it. Its applied version is `lesson-Money-Management/lesson-structure.md`.

## Decisions

| Decision | Detail |
|---|---|
| One unified WIPPEA lesson | The team's parts become segments inside one Warm-Up, Introduction, Presentation, Practice, Evaluation, Application sequence. Parts are not separate mini-lessons, so they do not have their own warm-up or evaluation. Nine mini-WIPPEAs would take hours and repeat the opening and closing nine times. |
| Core of 2 hours, up to 3 with extensions | Every class gets the 2-hour core. The instructor adds optional activities based on class size and pace. |
| Objectives and rubric are lesson-level | One objective set, one rubric, and one exit ticket cover the whole lesson. Each part maps to one or two objectives. |
| Old lesson stays separate | The original module files stay in `Old <Topic> Module/`, which git ignores through `/lesson-*/Old */`. Any deck redesigned from the old module goes in `Previous-Lesson-Deck/`. New team content never mixes with either. |

## Phase 1 conventions this follows

The six Phase 1 lessons share one shape. Round 2 lessons match it.

- One `index.html` of 28 to 36 slides.
- Seven sidebar chapters in this order: Warm-Up, Introduction, three content chapters, Evaluation, Application. The content chapters are labeled Presentation, and the third can be labeled Practice (Controlling Anger does this).
- `SPOKES-STANDARD.md` Section 9 minimums: at least 3 activity boxes (one in Warm-Up, one or more in Practice, one in Application) and at least 2 knowledge checks (one in Practice, one in Evaluation).
- The lesson plan uses the WV Adult Basic Education template:
  - Lesson Basics: topic, Employability Skills Framework standards such as `WS.RM` or `AK.CTS`, objectives in Audience Behavior Condition Degree form, and assessment.
  - Lesson Materials.
  - An Activity Plan table with a time, an activity, a slide range, and materials for each WIPPEA stage.
- Controlling Anger's plan is the timing reference. It runs Warm-Up 10 to 15 minutes, Introduction 20, Presentation 30 and 30, Practice 35 to 45, Evaluation 20 to 30, and Application 20 to 25. That totals about 2.5 to 3.25 hours.
- The rubric is one page. It opens with the lesson goal, the essential questions, and 5 or 6 student expectations. Below that are 4 to 6 category rows, each tied to one activity, scored Exceeding 10, Meeting 8, Approaching 5, Emerging 2.
- Time Management also has a pre/post test and a self-assessment.
- Learner files go in `Handouts/`. The teacher's guide and speaker notes go in `Teacher-Resources/`.

## Time budget for the 2-hour core

| Stage | Minutes | Contents |
|---|---|---|
| Warm-Up and Introduction | about 10 | One shared opener. State the objectives and review the rubric once. |
| Presentation and Practice | about 95 | The parts, grouped into the three content chapters. With 8 segments, each one gets about 12 minutes. |
| Evaluation and Application | about 15 | One exit ticket, rubric scoring, and one next step for each learner. |
| Optional extensions | up to 60 more | Longer activities, group versions, worksheets, and outside quizzes. |

## Brief for each part owner

Each part delivers one segment:

1. One idea, taught in a few slides.
2. One core activity that fits the roughly 12-minute segment.
3. A short list of optional extensions for the third hour.
4. The objective or objectives the segment serves, so the rubric and exit ticket can check it.

A segment has no warm-up, evaluation, or closing of its own. The lesson-level stages do that work. If a team built its part as a full mini-lesson, keep the activity and fold the rest into the lesson's opening and closing.

When a folder holds more material than one segment can use, the team picks one core activity and lists the rest as extensions.

## Folder layout

```text
lesson-<Topic>/
  index.html                     the built lesson, once authorized
  Handouts/                      lesson plan, rubric, learner worksheets
  Teacher-Resources/             teacher's guide, speaker notes
  Part-<N>-<Title>-<Owner>/      one folder per team part
  Previous-Lesson-Deck/          deck redesigned from the old module, if one exists
  Old <Topic> Module/            original files, ignored by git
```

Git ignores `Part-*` folders through `/lesson-*/Part-*/` in `.gitignore`, because the repo is public and team folders hold third-party and draft material. They stay on the machine that has them. Track a part with a `!` line once its licenses and content are reviewed. Money Management Part 2 is tracked this way.

The repo rules apply. A file sits at most three folders below the repo root, so a part folder can hold one more level of subfolders such as `Activities/` or `PDFs/`. New paths have no spaces. Team files use kebab-case.

## Order of work

1. Write the lesson-level objectives.
2. Map each part to the objectives and to a chapter.
3. Write the rubric, one row for each chapter's core activity.
4. Teams finish their segments against the brief above.
5. Write the lesson plan's Activity Plan with times and slide ranges.
6. The build happens only after Britt authorizes it.
