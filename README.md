# Cadence

A beat chart for planning a game's pacing. Level designers have long kept a "beat chart": one row per level or section, with its playtime, intensity, setting, story beat, and which mechanics and enemies it introduces or builds on. It's usually a hand-coloured spreadsheet. Cadence makes it a live document:

- the **intensity curve** of the whole game over play time, split into acts, with breathers shaded;
- a **teach → test → twist** grid for every element (mechanic, enemy, tool), filled with a click;
- **pacing checks** against rules you set: an element used before it's taught, twisted before it's tested, taught once and dropped, or left unused for so long players forget it; beats that introduce too much at once; long stretches without a breather; flat intensity.

I'm building it to plan the pacing of my own games. It's one of a set of pre-production tools around [Forge](https://github.com/Heavenswind/Forge), my game design document tool: [Blockout](https://github.com/Heavenswind/Blockout) sketches the levels, [Questline](https://github.com/Heavenswind/Questline) plans the quests, [Parley](https://github.com/Heavenswind/Parley) writes the dialogue, [Hoard](https://github.com/Heavenswind/Hoard) balances the loot, and Cadence lays all of it out in time.

## Features

- **Beats** in play order, each with an act, type (story, exploration, puzzle, combat, boss, rest), minutes, intensity from 1 to 5, setting and story beat. Insert, reorder and delete rows; consecutive beats with the same act label form an act.
- **Elements:** mechanics, enemies and tools, one column each. Click a cell to cycle *teach → test → twist → none*. The panel shows when each element is first taught and how many beats use it.
- **Intensity over time:** a step chart over play time with act bands and the breather zone. Hover or use the arrow keys to read a beat; click to select its row.
- **Pacing rules** you can change: what counts as a breather, the longest stretch allowed without one, how many new elements one beat may introduce, how long an element may go unused, and how many beats at one intensity count as flat.
- **Summary:** play time, average intensity (weighted by time), share of time in breathers, time per act and per beat type.
- **Editing:** undo/redo for everything, including New / Sample / Open; typing in a field is one step.
- **Files:** autosaves in the browser; **Save** / **Open** use `.cadence.json` files, and **Export CSV** gives the chart as a spreadsheet.

## Built with

React 18 and TypeScript, with Zustand for state, plain SVG for the chart, and Vite and Vitest for building and testing. The model (timeline, acts, pacing checks, CSV export, edits) is plain TypeScript with no UI dependencies.

## Running it

Requires Node.js 20 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the model and pacing checks
npm run build      # production build in dist/
```

Click **Sample** to load *Lantern*, a three-act platformer that teaches, tests and twists six elements without breaking any rule. Try raising "Tower base" to intensity 4 to see a stretch without a breather flagged.

## How the checks work

- **Teach → test → twist:** an element's first appearance should be *teach*; a *twist* should come after at least one *test*. An element taught once and never seen again is flagged, as is one that never appears.
- **Forgetting:** the gap between two appearances is measured from the end of one beat to the start of the next one that uses it.
- **Breathers:** consecutive beats above the breather intensity form a stretch; stretches longer than the limit are flagged, including at the very start or end.
- **Flat intensity:** that many consecutive beats at exactly the same intensity.
- **Average intensity** is weighted by minutes, so a long calm section counts for more than a short fight.

## Keyboard

| Key | Action |
|---|---|
| Ctrl+Z, Ctrl+Y (or Ctrl+Shift+Z) | Undo, redo (outside text fields) |
| ← / → / Home / End on the chart | Select the previous / next / first / last beat |
| Enter or Space on a cell | Cycle teach → test → twist → none |

## File format

A project is JSON with `elements`, `beats` (each with `uses`: element id → `teach` / `test` / `twist`) and `settings`; see [`src/model/types.ts`](src/model/types.ts). Plans to import levels from Blockout and quests from Questline are in [ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE)
