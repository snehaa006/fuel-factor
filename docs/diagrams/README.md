# Workflow diagrams

PlantUML activity diagrams for the five Fuel Factor flows. Source of truth is the `.puml`
files; the PNGs are generated and safe to delete.

| File | Flow |
|---|---|
| `01-first-run.puml` | Onboarding. Consent gates everything, and targets are computed from the profile. |
| `02-daily-loop.puml` | The product: log six slots, evening check-in, score, streak, advice. |
| `03-advice-engine.puml` | Food in → macros → target comparison → rule evaluation → up to three cards. |
| `04-weekly-loop.puml` | Four themed weeks, each with lessons, a challenge and a Sunday recap. |
| `05-coach-and-research.puml` | The coach dashboard and the CSV export that feeds the study. |

`_style.puml` holds the shared skin and is included by each diagram. It uses the brand palette
and defines three node roles: `<<fuel>>` amber, `<<go>>` green, `<<alert>>` rust with cream text.

## Rendering

```bash
cd docs/diagrams && plantuml -tpng *.puml
```

SVG instead of PNG:

```bash
cd docs/diagrams && plantuml -tsvg *.puml
```

These are activity diagrams, so they render natively — Graphviz is only needed for class and
component diagrams. Install with `brew install plantuml`, or use the VS Code PlantUML extension,
which previews `.puml` files as you edit.

## Two decisions the diagrams record

**The streak increments on the evening check-in, not on a logged meal.** That makes it reward
finishing a day rather than opening an app, and it pulls the athlete through the two fields the
current dataset is missing entirely: fluid intake and the five subjective ratings.

**The target is computed, never stored** — `body_weight × g/kg × day_type`. Correcting an
athlete's weight recomputes every number in the app, which is why the disagreement between the
two spreadsheet tabs was never a blocker.
