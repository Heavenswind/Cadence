# Roadmap

Work I plan to do, roughly in order. Effort estimates are rough.

## Chart (≈7 h)

- [ ] Draw a target curve and compare the planned intensity against it
- [ ] Separate curves for challenge and emotional intensity, since a sad story beat can be calm to play
- [ ] Drag a beat's edge on the chart to change its length, and its top to change intensity
- [ ] Mark each element's teach / test / twist moments on a timeline lane under the curve
- [ ] Export the chart as PNG or SVG for design reviews and Forge pages

## Beat chart (≈6 h)

- [ ] Drag-and-drop row reordering, and collapsing acts
- [ ] Notes per beat for art, audio and tech needs, with a column filter
- [ ] Filter element columns by kind (mechanics, enemies, tools)
- [ ] Keyboard navigation between cells, like a spreadsheet
- [x] Duplicate a beat

## Checks (≈5 h)

- [x] The same beat type too many times in a row (four puzzles back to back)
- [x] Boss beats without a breather before or after
- [ ] Per-act rules (a tutorial act may teach faster)
- [ ] Choose which checks are warnings, errors or off
- [ ] Suggestions: where a reminder beat would fix an element that's forgotten

## Integration (≈8 h)

- [ ] Import levels from Blockout files as beats, with a time estimate from the critical path length
- [ ] Import quests from Questline, using their minutes and tiers
- [ ] Take elements from Forge entities and link beats to Forge level pages
- [ ] Read Parley conversations attached to a beat to fill in its story beat

## Quality (≈4 h)

- [ ] Component tests for the grid and the chart
- [ ] File format migrations when the version number changes
- [ ] GitHub Actions: typecheck, test and build on every push
- [ ] Deploy the app to GitHub Pages
- [ ] Light theme and a print stylesheet for the beat chart
