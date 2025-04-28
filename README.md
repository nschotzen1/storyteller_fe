# Storyteller: A Cinematic Text-Based RPG Engine

**Storyteller** is an experimental interactive narrative engine blending real-time chat storytelling, cinematic scene transitions, dice-based RPG mechanics (inspired by Year Zero and Call of Cthulhu), and player-driven interactions.

It focuses on *moment-to-moment atmosphere*, *risk through dice mechanics*, and *visual immersion* while remaining lightweight, readable, and highly expandable.

---

## 📦 Major Components Overview

| File | Description |
|:-----|:------------|
| `App.jsx` | Master flow controller: manages intro animation, chat scene (MysteryMessenger), iris transition, and narrative RPG scenes. |
| `MysteryMessenger.jsx` | Story messaging scene: receives typewriter invite, allows player input and system reply. |
| `CurtainIntro.jsx` / `CurtainOutro.jsx` | Animated curtain lifting/dropping transitions: movie-like pacing shifts between scenes. |
| `NarrativeScene.jsx` | Narration scene: dynamic top-left text typing, player interaction input, and GM notebook rolls. |
| `GMNotebook.jsx` | RPG dice module: roll, push, send dice rolls, auto-submit, manage backend communication. |
| `PlayerInput.jsx` | Retro terminal-style input bar: blinking cursor, immersive typing effect. |
| `index.css` | TailwindCSS base + custom cinematic CSS animations (iris, vignette, heartbeat cursors, sketchy buttons). |


---

## 🧠 Narrative Flow Structure

```mermaid
flowchart TD
    A[Start App] --> B[CurtainIntro lifts]
    B --> C[MysteryMessenger: Receive Typewriter Invite]
    C --> D[CurtainOutro drops]
    D --> E[NarrativeScene begins]
    E --> F[GM rolls occur (optional)]
    F --> G[Player replies via PlayerInput]
    G --> (Next Story Progression)
```
dice payload:
```{
  "check": "Observation + Wits",
  "dice": "6d6",
  "results": [2, 5, 3, 1, 4, 2],
  "pushedResults": [6, 6],
  "finalSuccess": true,
  "wasPushed": true,
  "rolledAt": "2025-04-27T22:00:00Z",
  "pushedAt": "2025-04-27T22:00:10Z"
}```


mportant Visual & Style Features

Feature	Description
.letterbox	Cinematic black bars at top and bottom (movie frame feel).
.vignette	Radial edge darkening for subtle immersion.
.chat-grain	Retro film grain overlay during chat and narration phases.
.iris-mask, .iris-circle	Iris opening/closing transition animation like classic cinema.
.tooltip-btn	Sketchy small buttons (🎲 ✊ 📨) for dice actions: subtle, minimal UI.
.typing-dot, .blinking-cursor	Retro terminal heartbeat text animations.

Api routes:
Route | Purpose
POST /api/sendMessage | Accepts a player message from Messenger phase, responds with system message.
POST /api/submitRoll | Accepts completed dice roll result from GMNotebook after rolling/pushing.


✨ Gameplay & Engine Philosophy
🎥 Cinematic Pacing: Scenes unfold moment-to-moment like a movie.

🎲 Real Player Risk: Dice rolls are real, visible, and meaningful. Push rolls amplify narrative stakes.

🕰️ Tension via Time: AutoSend after rolls creates pressure (not endless stalling).

🖋️ Minimal UI: Retro buttons, sketchy textures, fading animations: no intrusive interfaces.

🧠 Narrative-First: Gameplay systems emerge naturally from storytelling needs (not mechanics-first).



This engine focuses on building emotion through pace, risk through dice, and atmosphere through visuals.
It is designed for maximum immersion while remaining minimal and expandable for full RPG systems.


