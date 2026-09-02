# Fantasy Draft Command Center

Standalone manual draft assistant for a 12-team fantasy football snake draft. No browser extension or ESPN integration is required.

## League profile
- 12 teams
- Full PPR
- 6-point passing TDs
- Starters: QB, 2 RB, 2 WR, TE, FLEX, D/ST, K
- Bench: 6
- IR: 3
- No keepers
- 15 draft rounds
- Roster maximums: QB 4, RB 8, WR 8, TE 3, D/ST 3, K 3

## Scoring profile
### Passing
- 1 point per 25 passing yards
- 6 points per passing TD
- +1 for a 50+ yard TD pass
- -2 per interception thrown
- +1 for 300-399 passing yards
- +2 for 400+ passing yards

### Rushing
- 1 point per 10 rushing yards
- 6 points per rushing TD
- +1 for a 50+ yard rushing TD
- +1 for 100-199 rushing yards
- +2 for 200+ rushing yards

### Receiving
- 1 point per 10 receiving yards
- 1 point per reception
- 6 points per receiving TD
- +1 for a 50+ yard receiving TD
- +1 for 100-199 receiving yards
- +2 for 200+ receiving yards

### Kicking / miscellaneous
- PAT made: 1
- FG made 0-39 yards: 3
- FG made 40-49 yards: 3
- Missed FG 0-39 yards: -1
- Fumble recovered for TD: 6
- Fumble lost: -2

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
