# Fantasy Draft Command Center

Chrome/Edge companion extension for a 12-team ESPN fantasy football snake draft.

## League profile
- 12 teams
- Full PPR
- 6-point passing TDs
- Starters: QB, 2 RB, 2 WR, TE, FLEX, D/ST, K
- Bench: 6
- IR: 2
- No keepers
- 15 draft rounds

## Core modes
1. **ESPN Auto-Sync**: observes the ESPN draft room and attempts to detect newly drafted players.
2. **Rapid Mode**: type a player name, press Enter to mark drafted by another team, or use the Mine button for your pick.
3. **Bulk Catch-Up**: paste multiple player names to process missed selections quickly.
4. **Decision Engine**: ranks remaining players based on base rank, roster construction, positional scarcity, league scoring, and time until your next pick.
5. **Will He Make It Back?**: heuristic return-to-next-pick estimate based on rank and picks until your next turn.

## Install locally
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this repository folder.
5. Open your ESPN fantasy football draft room.
6. Click the extension icon and set your draft slot.

## Important note about ESPN Auto-Sync
ESPN can change its draft-room HTML at any time. The extension intentionally uses multiple text and DOM heuristics rather than one fragile selector. Rapid Mode and Bulk Catch-Up are always available as fallbacks.

## Development
This is a Manifest V3 extension with no build step and no external dependencies.
