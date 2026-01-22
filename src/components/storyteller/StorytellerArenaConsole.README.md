# StorytellerArenaConsole

`StorytellerArenaConsole` is a cinematic playtable UI for the storyteller loop:
generate entity cards from a fragment, draw into a private spread, place cards into a shared hex arena,
and persist arena state per session.

## Location

- Component: `src/components/storyteller/StorytellerArenaConsole.jsx`
- Styles: `src/components/storyteller/StorytellerArenaConsole.css`
- Arena map: `src/components/storyteller/arenaMaps/arenaMap.petalHex.v1.json`
- Spreads: `src/components/storyteller/spreads.v1.json`
- Background: `public/arenas/petal_hex_v1.png`

## Usage

Render the component directly in `src/App.jsx`:

```jsx
import StorytellerArenaConsole from './components/storyteller/StorytellerArenaConsole';

function App() {
  return <StorytellerArenaConsole />;
}
```

The UI defaults the API base URL to `http://localhost:5001` and a demo session ID.
Update the top bar fields to match your backend.

## Core flow

1. Log in (or enter a player ID in the Operator panel).
2. Enter a fragment narrative and click **Generate Entities** to create cards in your deck.
3. Click **Draw to Spread** to fill open spread slots from your deck.
4. Select cards in your spread, then **Place to Edge** or **Place to Center**.
5. Use **Save Arena** to persist and **Load Arena** to restore.

## Multiplayer + visibility

- Each player sees only their deck and spread.
- Shared arena center is always visible to all players.
- Other players' edge slots render as back-only or sealed placeholders.
- Use **Sync Session** to pull the latest player list and arena state for your session.

## Options and controls

- **Player Level**: unlocks higher spreads.
- **Spread selector**: chooses the active spread layout.
- **Edge Reveal** (debug): switch other players' edges between back-only and sealed.
- **Slot Overlay** (debug): show slot outlines and IDs.
- **Calibrate** (debug): capture slot rectangles and copy JSON to the clipboard.

## API behavior

- All requests include `mock_api_calls: true` by default for mocked responses.
- Requests use `sessionId` and `playerId` for session scoping.
- Cards resolve their image URLs relative to the API base URL.

## Multiplayer testing

1. Set `Players` to 2-4.
2. Enter a unique `playerId` per player tab.
3. Generate entities and storytellers for each tab.
4. Place cards into the arena and switch tabs to confirm visibility rules.

## Debug tools

- Toggle the **DBG** icon to open the debug panel.
- **Slot Overlay** shows slot outlines and IDs.
- **Edge Reveal** switches other players between back-only or sealed.
- **Show JSON** opens the arena payload drawer.

## Slot calibration mode

1. Enable Debug.
2. Toggle **Calibrate**.
3. Click-drag on the arena to create slots.
4. Use **Copy JSON** to export the slot map to the clipboard and paste into
   `src/components/storyteller/arenaMaps/arenaMap.petalHex.v1.json`.

## Asset note

`public/arenas/petal_hex_v1.png` is a placeholder copied from an existing texture.
Replace it with your cinematic arena mockup PNG for production.
