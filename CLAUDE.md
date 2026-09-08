# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla Tetris: HTML5 Canvas + CSS3 + plain JS (ES6+). No dependencies, no bundler, no transpiler, no build step, no test suite. The entire project is four files:

- `index.html` — DOM structure, `<canvas id="board">`, side panel, pause/game-over overlay.
- `style.css` — dark/retro arcade theme.
- `game.js` (~300 lines) — all game logic: board matrix, piece rotation/collision/wall kicks, game loop (`requestAnimationFrame`), line clearing, scoring, ghost piece.

## Running it

No build step — edit and reload. Either open `index.html` directly, or serve it statically (needed for some browsers' module/canvas security restrictions):

```
python3 -m http.server 8000
```

There is no test suite; verify changes by playing the game in a browser.

## Gotcha: canvas size must stay in sync

`index.html`'s `<canvas id="board" width="300" height="600">` must equal `COLS * BLOCK` × `ROWS * BLOCK` from the constants at the top of `game.js`. If you change `COLS`, `ROWS`, or `BLOCK` in `game.js`, update the canvas `width`/`height` attributes in `index.html` to match — there is no dynamic sizing.

## Code style

- 2-space indentation, `'use strict'`, `const`/`let` only.
- camelCase for functions/variables, UPPER_SNAKE_CASE for constants (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`).
- Single quotes for strings; semicolons everywhere.
- Code identifiers are in English; comments (especially CSS section headers and the README) are in Spanish — follow that split when adding either.
