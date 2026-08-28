# Fantasy Draft Command Center

Standalone manual draft assistant for a 12-team fantasy football snake draft. No browser extension or ESPN integration is required.

## League profile
- 12 teams
- Full PPR
- 6-point passing TDs
- Starters: QB, 2 RB, 2 WR, TE, FLEX, D/ST, K
- Bench: 6
- IR: 2
- No keepers
- 15 draft rounds

## How it works
1. Open `index.html` in a browser.
2. Set your draft slot (1-12).
3. Every time a player is selected in the real draft, find that player on the page.
4. Click **Other** if another team selected him, or **Mine** if you selected him.
5. The player is removed from the available board immediately.
6. The Top 5 recommendations, roster needs, pick count, next-pick distance, and make-it-back estimates recalculate automatically.

## Features
- Searchable available-player board
- Position filters
- Other / Mine selection buttons
- Automatic snake-draft pick tracking
- Top 5 roster-aware recommendations
- Full-PPR and 6-point passing-TD weighting
- Positional scarcity and roster-need adjustments
- Make-it-back estimate for your next selection
- Live roster summary
- Recent draft history
- Undo and Reset Draft
- Draft state saved locally in the browser

## Files used by the standalone page
- `index.html`
- `styles.css`
- `app.js`
- `players.js`
- `engine.js`

The older extension files can remain in the repository for reference, but they are not required to run the standalone page.
