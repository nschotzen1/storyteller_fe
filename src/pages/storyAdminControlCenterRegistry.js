export const STORY_ADMIN_CONTROL_COMPONENTS = [
  {
    key: 'typewriter',
    label: 'Typewriter',
    description: 'Core writing routes for continuation, storyteller slot generation, storyteller interruption, and textual key verification.',
    flowDescription: 'The typewriter loop starts with continuation, can unlock storyteller slot assets, can be interrupted by a storyteller entrance, and now verifies any textual key before insertion.',
    searchTerms: ['ghostwriter', 'continuation', 'writer', 'xerofag', 'typewriter key', 'storyteller key'],
    routes: [
      {
        key: 'story_continuation_route',
        label: 'Story continuation',
        method: 'POST',
        path: '/api/send_typewriter_text',
        summary: 'Continues the live fragment saved under the active typewriter session.',
        flowGroup: 'Core loop',
        flowSummary: 'Main continuation request after the player types into the active page.',
        runtimeKeys: ['story_continuation'],
        directPromptKeys: ['story_continuation'],
        contractBindings: []
      },
      {
        key: 'storyteller_slot_generation_route',
        label: 'Storyteller slot generation',
        method: 'POST',
        path: '/api/shouldCreateStorytellerKey',
        summary: 'Unlocks storyteller slot assets, generates a storyteller persona, and returns current textual keys for the typewriter session.',
        flowGroup: 'Assets',
        flowSummary: 'Threshold-driven storyteller slot generator that creates the key art and hydrates the keyboard state.',
        runtimeKeys: ['storyteller_creation', 'illustration_creation'],
        directPromptKeys: ['storyteller_key_creation'],
        contractBindings: [
          {
            routeKey: 'text_to_storyteller',
            promptKey: 'storyteller_creation',
            label: 'Storyteller persona contract'
          }
        ]
      },
      {
        key: 'xerofag_inspection_route',
        label: 'Xerofag inspection',
        method: 'POST',
        path: '/api/shouldAllowXerofag',
        summary: 'Judges whether the Xerofag proper noun can be appended to the active narrative.',
        flowGroup: 'Guards',
        flowSummary: 'A gating check that decides whether the special Xerofag insertion is allowed.',
        runtimeKeys: ['xerofag_inspection'],
        directPromptKeys: ['xerofag_inspection'],
        contractBindings: []
      },
      {
        key: 'typewriter_key_verification_route',
        label: 'Textual key verification',
        method: 'POST',
        path: '/api/typewriter/keys/shouldAllow',
        summary: 'Judges whether a saved textual typewriter key such as Xerofag or a storyteller-created entity key can append its text to the active narrative.',
        flowGroup: 'Guards',
        flowSummary: 'Shared LLM gate for every pressable textual key on the typewriter keyboard.',
        runtimeKeys: ['typewriter_key_verification'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'typewriter_key_verification',
            promptKey: 'typewriter_key_verification',
            label: 'Textual key verification contract'
          }
        ]
      },
      {
        key: 'storyteller_intervention_route',
        label: 'Storyteller intervention',
        method: 'POST',
        path: '/api/send_storyteller_typewriter_text',
        summary: 'Injects a storyteller into the typewriter flow, persists the intervention entity, and returns a new pressable textual key.',
        flowGroup: 'Interruptions',
        flowSummary: 'Structured storyteller entrance that overlays the same writing session and surfaces a new saved text key.',
        runtimeKeys: ['storyteller_intervention'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'storyteller_typewriter_intervention',
            promptKey: 'storyteller_intervention',
            label: 'Structured continuation contract'
          }
        ]
      }
    ]
  },
  {
    key: 'memory_spread',
    label: 'Memory Spread',
    description: 'Generates memories, memory card images, entities, storytellers, and relationship evaluation from a saved fragment.',
    flowDescription: 'This flow starts by extracting memories from a fragment, then branches into card art, entity/storyteller generation, and later judgment passes.',
    searchTerms: ['memory', 'entities', 'storyteller', 'spread', 'image', 'card'],
    routes: [
      {
        key: 'memory_generation_route',
        label: 'Memory generation',
        method: 'POST',
        path: '/api/fragmentToMemories',
        summary: 'Builds memory JSON plus the card art prompts that follow it.',
        flowGroup: 'Extraction',
        flowSummary: 'Primary extraction step that turns the saved fragment into memory records and card-art prompts.',
        runtimeKeys: ['memory_creation', 'texture_creation'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'fragment_to_memories',
            promptKey: 'memory_creation',
            label: 'Memory extraction contract'
          }
        ]
      },
      {
        key: 'memory_card_front_route',
        label: 'Memory card front image',
        method: 'POST',
        path: '/api/memories/:memoryId/textToImage/front',
        summary: 'Generates or regenerates the front image for one persisted memory card.',
        flowGroup: 'Card art',
        flowSummary: 'Illustration pass for the front side of each persisted memory card.',
        runtimeKeys: ['texture_creation'],
        directPromptKeys: ['memory_card_front'],
        contractBindings: []
      },
      {
        key: 'memory_card_back_route',
        label: 'Memory card back image',
        method: 'POST',
        path: '/api/memories/:memoryId/textToImage/back',
        summary: 'Generates or regenerates the back image for one persisted memory card.',
        flowGroup: 'Card art',
        flowSummary: 'Texture pass for the reverse side of each persisted memory card.',
        runtimeKeys: ['texture_creation'],
        directPromptKeys: ['memory_card_back'],
        contractBindings: []
      },
      {
        key: 'entity_generation_route',
        label: 'Entity generation',
        method: 'POST',
        path: '/api/textToEntity',
        summary: 'Extracts entities from the saved fragment and generates entity card art.',
        flowGroup: 'Follow-on generation',
        flowSummary: 'Secondary extraction route that spins entities and their supporting card art out of the same fragment.',
        runtimeKeys: ['entity_creation', 'texture_creation'],
        directPromptKeys: ['entity_creation', 'entity_card_front', 'texture_creation'],
        contractBindings: []
      },
      {
        key: 'storyteller_generation_route',
        label: 'Storyteller generation',
        method: 'POST',
        path: '/api/textToStoryteller',
        summary: 'Generates storyteller personas, key images, and illustration prompts from the same fragment.',
        flowGroup: 'Follow-on generation',
        flowSummary: 'Persona and illustration route that grows storyteller characters from the fragment context.',
        runtimeKeys: ['storyteller_creation', 'illustration_creation'],
        directPromptKeys: ['storyteller_key_creation', 'illustration_creation'],
        contractBindings: [
          {
            routeKey: 'text_to_storyteller',
            promptKey: 'storyteller_creation',
            label: 'Storyteller persona contract'
          }
        ]
      },
      {
        key: 'relationship_evaluation_route',
        label: 'Relationship evaluation',
        method: 'POST',
        path: '/api/arena/relationships/propose',
        summary: 'Judges and scores relationship proposals in the arena flow.',
        flowGroup: 'Judgment',
        flowSummary: 'Evaluation pass that scores or rejects relationship proposals after content already exists.',
        runtimeKeys: ['relationship_evaluation'],
        directPromptKeys: ['relationship_evaluation'],
        contractBindings: []
      }
    ]
  },
  {
    key: 'messenger',
    label: 'Messenger',
    description: 'Structured chat route used by the messenger component.',
    flowDescription: 'Messenger is a single-turn chat orchestration route that owns scene-state and reply generation together.',
    searchTerms: ['chat', 'phone', 'messages'],
    routes: [
      {
        key: 'messenger_chat_route',
        label: 'Messenger chat',
        method: 'POST',
        path: '/api/messenger/chat',
        summary: 'Produces structured message replies and scene state.',
        flowGroup: 'Conversation',
        flowSummary: 'Single structured turn that produces the next reply and updates messenger scene state.',
        runtimeKeys: ['messenger_chat'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'messenger_chat',
            promptKey: 'messenger_chat',
            label: 'Messenger response contract'
          }
        ]
      }
    ]
  },
  {
    key: 'immersive_rpg',
    label: 'Immersive RPG',
    description: 'Structured GM route used by the immersive RPG notebook flow.',
    flowDescription: 'The RPG notebook uses one GM orchestration route that returns narration, stage layout, notebook state, and rolls together.',
    searchTerms: ['gm', 'rpg', 'notebook'],
    routes: [
      {
        key: 'immersive_rpg_turn_route',
        label: 'Immersive RPG GM',
        method: 'POST',
        path: '/api/immersive-rpg/chat',
        summary: 'Returns GM narration plus notebook and roll state.',
        flowGroup: 'Turn orchestration',
        flowSummary: 'Single GM turn response that advances narration, notebook state, rolls, and stage modules together.',
        runtimeKeys: ['immersive_rpg_gm'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'immersive_rpg_turn',
            promptKey: 'immersive_rpg_gm',
            label: 'RPG GM response contract'
          }
        ]
      }
    ]
  },
  {
    key: 'quest',
    label: 'Quest',
    description: 'Structured branch-generation route used by the quest adventure flow.',
    flowDescription: 'Quest advances by expanding the current scene into child screens and runtime updates from one structured branch-generation route.',
    searchTerms: ['quest', 'adventure', 'branch', 'scene'],
    routes: [
      {
        key: 'quest_advance_route',
        label: 'Quest advance',
        method: 'POST',
        path: '/api/quest/advance',
        summary: 'Generates persistent child quest screens and GM surface updates from player prompts.',
        flowGroup: 'Scene growth',
        flowSummary: 'Branch-generation call that grows the scene tree and updates GM-facing runtime state.',
        runtimeKeys: ['quest_generation'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'quest_advance',
            promptKey: 'quest_generation',
            label: 'Quest advance contract'
          }
        ]
      }
    ]
  },
  {
    key: 'well',
    label: 'Well',
    description: 'Shared config editor for the resurfacing parchment scene used by the quest well and Rose Court prologue.',
    flowDescription: 'The well component uses a dedicated shared scene editor instead of route-by-route prompt controls.',
    searchTerms: ['well', 'fragments', 'parchment', 'falcon', 'rose court'],
    customPanelKey: 'well_scene_config',
    routes: []
  },
  {
    key: 'storyteller_arena',
    label: 'Storyteller Arena',
    description: 'Mission generation and supporting storyteller routes used in the arena console.',
    flowDescription: 'Arena mission setup starts with a mission-generation response that can pull in entity support as part of the same route.',
    searchTerms: ['arena', 'mission', 'judge'],
    routes: [
      {
        key: 'storyteller_mission_route',
        label: 'Storyteller mission',
        method: 'POST',
        path: '/api/sendStorytellerToEntity',
        summary: 'Generates storyteller missions and related sub-entities.',
        flowGroup: 'Mission loop',
        flowSummary: 'Mission-generation route that creates the storyteller brief and any supporting entities together.',
        runtimeKeys: ['storyteller_mission', 'entity_creation'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'storyteller_mission',
            promptKey: 'storyteller_mission',
            label: 'Mission response contract'
          }
        ]
      }
    ]
  }
];
