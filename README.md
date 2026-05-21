# Storyteller Typewriter Frontend

This branch is scoped to the typewriter/storyteller workspace only.

## Included Surface

| Area | Files |
|:--|:--|
| App shell | `src/App.jsx`, `src/App.css`, `src/main.jsx`, `src/index.css` |
| Typewriter runtime | `src/TypewriterFramework.jsx`, `src/TypeWriter.css`, `src/components/typewriter/*` |
| Orrery support | `src/OrreryComponent.jsx`, `src/components/orrery/*` |
| Typewriter admin | `src/pages/TypewriterAdminPage.jsx`, `src/pages/storyAdminControlCenterRegistry.js`, `src/api/typewriterAdmin.js` |
| Shared runtime helpers | `src/apiService.js`, `src/utils.js`, `src/TurnPageLever.jsx`, curtain transition components |

## Views

- `?view=typewriter` opens the playable typewriter.
- `?view=story-admin` opens the typewriter admin/control center.
- The legacy `?view=typewriter-admin` alias also opens Story Admin.

## Backend

The frontend expects the backend at `http://localhost:5001`. The component branch backend registers only:

- Typewriter runtime routes such as `/api/send_typewriter_text`, `/api/shouldCreateStorytellerKey`, `/api/send_storyteller_typewriter_text`, and `/api/typewriter/keys/shouldAllow`.
- Typewriter admin routes under `/api/admin/typewriter/*` and `/api/admin/llm-config/*`.

## Commands

```bash
npm install
npm run build
npx vitest run
```
