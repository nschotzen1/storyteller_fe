# StorytellerApiWorkbench

`StorytellerApiWorkbench` is a standalone UI console for exercising the storyteller backend routes.
It centralizes requests, shows raw JSON responses, and renders up to 8 entity cards with front/back
flips and selection states.

## Location

- Component: `src/components/storyteller/StorytellerApiWorkbench.jsx`
- Styles: `src/components/storyteller/StorytellerApiWorkbench.css`

## Usage

Render the component directly in `src/App.jsx`:

```jsx
import StorytellerApiWorkbench from './components/storyteller/StorytellerApiWorkbench';

function App() {
  return <StorytellerApiWorkbench />;
}
```

The UI defaults the API base URL to `http://localhost:5001` and a demo session ID.
Change the inputs at the top of the page if you need a different host or session.

## Supported Routes

All routes are called against the configured API base URL.

### POST `/api/textToEntity`

Generates entities and optional card prompts.
The workbench lets you toggle `includeCards`, `includeFront`, `includeBack`, and `debug`.
Responses are shown in the panel and cards are rendered (max 8).
Card image URLs are resolved against the base URL so `/assets/...` works locally.

### POST `/api/textToStoryteller`

Generates storyteller personas from a fragment.
The workbench exposes the `count`, `generateKeyImages`, and `debug` inputs, and always sets `mockImage` to `true`.

### GET `/api/storytellers?sessionId=...`

Lists storytellers for the current session.
The panel shows the raw response and lets you pick an ID for detail lookup.

### GET `/api/storytellers/:id?sessionId=...`

Fetches a storyteller detail and mission history.
The workbench uses the selected storyteller ID input.

### GET `/api/entities?sessionId=...&mainEntityId=...&isSubEntity=...`

Lists entities for a session with optional filters.
Filters are available in the Entity Listing panel.

### POST `/api/entities/:id/refresh`

Generates new sub-entities for the selected entity.
The workbench includes a note field and the `debug` toggle.

### POST `/api/sendStorytellerToEntity`

Dispatches a mission using `entityId`, `storytellerId`, `storytellingPoints`, `message`, and `duration`.
The mission form defaults can be overridden in the panel.

## Card Controls

- Select: toggles a selection state for a card.
- Flip: toggles front/back.
- Entity ID: displayed on both faces to copy into mission requests.

## Operator Notes

### Spread layout

Use the "Layout" toggle in the card header to switch between Grid and Spread.
When Spread is active, select a tarot preset (Arc, Crescent, Horseshoe, Cross) from the dropdown.

### Storyteller voices

After generating or loading storytellers, a "Storyteller Voices" bar appears above the cards.
Click a voice to apply its theme tint and accent to the card spread and buttons.
