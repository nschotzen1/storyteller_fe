# StorytellerArenaConsole

`StorytellerArenaConsole` is a cinematic playtable UI for the storyteller loop:
generate entity cards, draw into a private spread, place cards into a shared hex arena,
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

## Multiplayer testing

1. Set `Players` to 2-4.
2. Enter a unique `playerId` per player tab.
3. Generate entities and storytellers for each tab.
4. Place cards into the arena and switch tabs to confirm visibility rules.

## Debug tools

- Toggle the rune icon to show slot outlines and visibility mode.
- Open the debug drawer to inspect arena JSON.

## Slot calibration mode

1. Enable Debug.
2. Toggle **Calibrate**.
3. Click-drag on the arena to create slots.
4. Use **Copy JSON** to export the slot map to the clipboard and paste into
   `src/components/storyteller/arenaMaps/arenaMap.petalHex.v1.json`.

## Asset note

`public/arenas/petal_hex_v1.png` is a placeholder copied from an existing texture.
Replace it with your cinematic arena mockup PNG for production.
