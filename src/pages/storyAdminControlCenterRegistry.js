export const STORY_ADMIN_CONTROL_COMPONENTS = [
  {
    key: 'typewriter',
    label: 'Typewriter',
    description: 'Core writing routes for continuation, Xerofag insertion, and storyteller interruption.',
    searchTerms: ['ghostwriter', 'continuation', 'writer', 'xerofag'],
    routes: [
      {
        key: 'story_continuation_route',
        label: 'Story continuation',
        method: 'POST',
        path: '/api/send_typewriter_text',
        summary: 'Continues the live fragment saved under the active typewriter session.',
        runtimeKeys: ['story_continuation'],
        directPromptKeys: ['story_continuation'],
        contractBindings: []
      },
      {
        key: 'xerofag_inspection_route',
        label: 'Xerofag inspection',
        method: 'POST',
        path: '/api/shouldAllowXerofag',
        summary: 'Judges whether the Xerofag proper noun can be appended to the active narrative.',
        runtimeKeys: ['xerofag_inspection'],
        directPromptKeys: ['xerofag_inspection'],
        contractBindings: []
      },
      {
        key: 'storyteller_intervention_route',
        label: 'Storyteller intervention',
        method: 'POST',
        path: '/api/send_storyteller_typewriter_text',
        summary: 'Injects a storyteller entity into the typewriter flow.',
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
    searchTerms: ['memory', 'entities', 'storyteller', 'spread', 'image', 'card'],
    routes: [
      {
        key: 'memory_generation_route',
        label: 'Memory generation',
        method: 'POST',
        path: '/api/fragmentToMemories',
        summary: 'Builds memory JSON plus the card art prompts that follow it.',
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
    searchTerms: ['chat', 'phone', 'messages'],
    routes: [
      {
        key: 'messenger_chat_route',
        label: 'Messenger chat',
        method: 'POST',
        path: '/api/messenger/chat',
        summary: 'Produces structured message replies and scene state.',
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
    searchTerms: ['gm', 'rpg', 'notebook'],
    routes: [
      {
        key: 'immersive_rpg_turn_route',
        label: 'Immersive RPG GM',
        method: 'POST',
        path: '/api/immersive-rpg/chat',
        summary: 'Returns GM narration plus notebook and roll state.',
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
    searchTerms: ['quest', 'adventure', 'branch', 'scene'],
    routes: [
      {
        key: 'quest_advance_route',
        label: 'Quest advance',
        method: 'POST',
        path: '/api/quest/advance',
        summary: 'Generates persistent child quest screens and GM surface updates from player prompts.',
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
    searchTerms: ['well', 'fragments', 'parchment', 'falcon', 'rose court'],
    customPanelKey: 'well_scene_config',
    routes: []
  },
  {
    key: 'storyteller_arena',
    label: 'Storyteller Arena',
    description: 'Mission generation and supporting storyteller routes used in the arena console.',
    searchTerms: ['arena', 'mission', 'judge'],
    routes: [
      {
        key: 'storyteller_mission_route',
        label: 'Storyteller mission',
        method: 'POST',
        path: '/api/sendStorytellerToEntity',
        summary: 'Generates storyteller missions and related sub-entities.',
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
