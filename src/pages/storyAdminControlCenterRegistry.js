export const STORY_ADMIN_CONTROL_COMPONENTS = [
  {
    key: 'typewriter',
    label: 'Typewriter',
    description: 'Core writing routes for continuation, storyteller slot generation, storyteller interruption, and textual key verification.',
    flowDescription: 'The typewriter loop starts with continuation, can unlock storyteller slot assets, can be interrupted by a storyteller entrance, and now verifies any textual key before insertion.',
    flowOverview: {
      summary: 'The typewriter is a live writing loop with one main continuation path, optional storyteller asset generation, and guard routes that decide whether special keys may enter the page.',
      mainPath: 'Story continuation -> Textual key verification when a saved text key is pressed',
      supportingPath: 'Storyteller slot generation prepares storyteller assets, and storyteller intervention injects a new entity plus its saved textual key.',
      outputs: ['Narrative fragment updates', 'Saved textual typewriter keys', 'Storyteller slot assets', 'Narrative entities']
    },
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
        roleLabel: 'Entry',
        triggerSummary: 'Player submits or continues the live page.',
        outputSummary: 'Returns the next fragment text for the active typewriter session.',
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
        roleLabel: 'Artifact',
        triggerSummary: 'A storyteller slot qualifies for generation during the live session.',
        outputSummary: 'Returns storyteller persona data, key art, and refreshed typewriter-key state.',
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
        roleLabel: 'Guard',
        triggerSummary: 'The player attempts to insert the legacy Xerofag proper noun.',
        outputSummary: 'Returns allow/deny guidance for the special Xerofag insertion.',
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
        roleLabel: 'Guard',
        triggerSummary: 'Any saved textual key is pressed on the keyboard.',
        outputSummary: 'Returns whether the key may append text, plus the resulting insertion payload.',
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
        roleLabel: 'Interrupt',
        triggerSummary: 'A storyteller enters the typewriter flow and takes over the continuation.',
        outputSummary: 'Returns continuation text, persisted entity data, and a new saved textual key.',
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
    description: 'Owns both the legacy memory-generation pipeline and the newer Seer Reading ritual built on top of saved fragments and sessions.',
    flowDescription: 'This flow can either extract memories directly from a fragment or open a Seer Reading that seeds cards, runs an orchestration turn loop, and seals claimed cards back into the spread.',
    flowOverview: {
      summary: 'Memory Spread now has two faces: the legacy extraction fan-out and the Seer Reading ritual loop that creates readings, advances turns, and claims cards.',
      mainPath: 'Seer reading create -> Seer turn orchestration -> Card claim / reading closure',
      supportingPath: 'Legacy memory generation still feeds memory art, entity/storyteller generation, and relationship evaluation from the same saved fragment.',
      outputs: ['Seer readings', 'Interpretive cards', 'Memories', 'Card art prompts and images', 'Entities', 'Storytellers', 'Relationship judgments']
    },
    searchTerms: ['memory', 'entities', 'storyteller', 'spread', 'image', 'card'],
    routes: [
      {
        key: 'seer_reading_create_route',
        label: 'Seer reading create',
        method: 'POST',
        path: '/api/seer/readings',
        summary: 'Seeds one blurred vision, opening cards, and the normalized reading payload for the Seer UI.',
        flowGroup: 'Seer ritual',
        flowSummary: 'Opening ritual call that resolves the fragment/session context and drafts the initial interpretive card spread.',
        roleLabel: 'Entry',
        triggerSummary: 'The player opens Seer Reading from Story Admin or the Seer view without an existing reading.',
        outputSummary: 'Returns the seeded vision, dynamic cards, and initial runtime envelope for the reading.',
        runtimeKeys: ['seer_reading_card_generation'],
        directPromptKeys: ['seer_reading_card_generation'],
        contractBindings: [
          {
            routeKey: 'seer_reading_card_generation',
            promptKey: 'seer_reading_card_generation',
            label: 'Opening card generation contract'
          }
        ]
      },
      {
        key: 'seer_reading_turn_route',
        label: 'Seer reading turn',
        method: 'POST',
        path: '/api/seer/readings/:readingId/turn',
        summary: 'Advances the Seer Reading by one dominant ritual consequence.',
        flowGroup: 'Seer ritual',
        flowSummary: 'Core orchestrator turn that chooses one meaningful change and returns the next reading state.',
        roleLabel: 'Entry',
        triggerSummary: 'The player answers the seer, focuses a card, or focuses a vision evidence node.',
        outputSummary: 'Returns spoken seer text, tool traces, state changes, and the next normalized reading payload.',
        runtimeKeys: ['seer_reading_orchestrator'],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'seer_reading_orchestrator',
            promptKey: 'seer_reading_orchestrator',
            label: 'Seer turn orchestration contract'
          }
        ]
      },
      {
        key: 'seer_reading_tool_registry_route',
        label: 'Seer tool registry',
        method: 'GET',
        path: 'internal://seer-reading/tools',
        summary: 'Read-only registry of the executable tools the Seer orchestrator may call.',
        flowGroup: 'Seer ritual',
        flowSummary: 'Reference surface for the actual runtime tool set behind the seer turn prompt.',
        roleLabel: 'Reference',
        triggerSummary: 'Used when debugging or editing the seer turn prompt and its tool vocabulary.',
        outputSummary: 'Shows the runtime tool ids, descriptions, and expected input keys.',
        runtimeKeys: [],
        directPromptKeys: [],
        contractBindings: [
          {
            routeKey: 'seer_reading_tool_registry',
            promptKey: '',
            label: 'Seer tool registry contract'
          }
        ]
      },
      {
        key: 'seer_reading_claim_route',
        label: 'Seer card claim',
        method: 'POST',
        path: '/api/seer/readings/:readingId/cards/:cardId/claim',
        summary: 'Seals a fully revealed card into the reading and advances focus.',
        flowGroup: 'Seer ritual',
        flowSummary: 'Claim step that turns a resolved card into a persistent reading artifact.',
        roleLabel: 'Artifact',
        triggerSummary: 'A revealed card becomes claimable and the player chooses to keep it.',
        outputSummary: 'Returns the updated reading with the card moved into claimed cards.',
        runtimeKeys: [],
        directPromptKeys: [],
        contractBindings: []
      },
      {
        key: 'seer_reading_close_route',
        label: 'Seer reading close',
        method: 'POST',
        path: '/api/seer/readings/:readingId/close',
        summary: 'Closes the reading and records closure metadata.',
        flowGroup: 'Seer ritual',
        flowSummary: 'Closure step that seals the reading state without running another interpretation turn.',
        roleLabel: 'Closure',
        triggerSummary: 'The player or system decides the reading should end.',
        outputSummary: 'Returns the final normalized reading payload in a closed state.',
        runtimeKeys: [],
        directPromptKeys: [],
        contractBindings: []
      },
      {
        key: 'memory_generation_route',
        label: 'Memory generation',
        method: 'POST',
        path: '/api/fragmentToMemories',
        summary: 'Builds memory JSON plus the card art prompts that follow it.',
        flowGroup: 'Extraction',
        flowSummary: 'Primary extraction step that turns the saved fragment into memory records and card-art prompts.',
        roleLabel: 'Entry',
        triggerSummary: 'A saved fragment is promoted into the memory-spread pipeline.',
        outputSummary: 'Returns memory records plus the prompt material that downstream image routes use.',
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
        roleLabel: 'Artifact',
        triggerSummary: 'A persisted memory needs a front-side illustration.',
        outputSummary: 'Returns one memory-card front image.',
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
        roleLabel: 'Artifact',
        triggerSummary: 'A persisted memory needs a reverse-side texture.',
        outputSummary: 'Returns one memory-card back image.',
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
        roleLabel: 'Branch',
        triggerSummary: 'The saved fragment is mined for stable world entities.',
        outputSummary: 'Returns entities plus the art prompts or images that represent them.',
        runtimeKeys: ['entity_creation', 'texture_creation'],
        directPromptKeys: ['entity_creation', 'entity_card_front', 'texture_creation'],
        contractBindings: [
          {
            routeKey: 'text_to_entity',
            promptKey: 'entity_creation',
            label: 'Entity extraction contract'
          }
        ]
      },
      {
        key: 'storyteller_generation_route',
        label: 'Storyteller generation',
        method: 'POST',
        path: '/api/textToStoryteller',
        summary: 'Generates storyteller personas, key images, and illustration prompts from the same fragment.',
        flowGroup: 'Follow-on generation',
        flowSummary: 'Persona and illustration route that grows storyteller characters from the fragment context.',
        roleLabel: 'Branch',
        triggerSummary: 'The saved fragment is mined for storyteller personas and motifs.',
        outputSummary: 'Returns storyteller persona data, key images, and illustration prompts.',
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
        roleLabel: 'Judgment',
        triggerSummary: 'A relationship proposal needs scoring or acceptance review.',
        outputSummary: 'Returns scored or filtered relationship proposals.',
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
    flowOverview: {
      summary: 'Messenger is a single structured conversation route rather than a chain of subroutes.',
      mainPath: 'Messenger chat -> scene state and reply payload',
      supportingPath: 'No side routes yet; this component stays intentionally centralized.',
      outputs: ['Structured chat replies', 'Scene-state updates', 'Messenger UI payloads']
    },
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
        roleLabel: 'Entry',
        triggerSummary: 'A player sends or advances a messenger conversation turn.',
        outputSummary: 'Returns the next messenger reply plus updated scene-state payload.',
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
    flowOverview: {
      summary: 'Immersive RPG is a single GM orchestration route that packages narration, notebook state, and stage rendering together.',
      mainPath: 'Immersive RPG GM turn -> narration, notebook, stage modules, and roll state',
      supportingPath: 'No separate route branches yet; the single turn route owns the whole loop.',
      outputs: ['GM narration', 'Notebook state', 'Stage layout and modules', 'Pending roll data']
    },
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
        roleLabel: 'Entry',
        triggerSummary: 'The player resolves or advances one immersive RPG turn.',
        outputSummary: 'Returns GM narration, notebook updates, stage modules, and roll state.',
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
    flowOverview: {
      summary: 'Quest uses one branch-generation route that expands the current scene into authored child screens and runtime-facing updates.',
      mainPath: 'Quest advance -> child screens plus GM/runtime updates',
      supportingPath: 'No separate side routes in this component yet; the single branch route owns scene growth.',
      outputs: ['Child quest screens', 'Scene-tree updates', 'GM-facing runtime patches']
    },
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
        roleLabel: 'Branch',
        triggerSummary: 'The player prompt should expand the current quest scene.',
        outputSummary: 'Returns child screens, scene-graph growth, and runtime-facing surface updates.',
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
    flowOverview: {
      summary: 'The well component is mostly configuration-driven rather than route-driven.',
      mainPath: 'Well scene config editor -> shared runtime config for all well scenes',
      supportingPath: 'No LLM route summaries here yet because the component is driven by one shared scene config surface.',
      outputs: ['Shared well-scene config', 'Prompt timing and copy settings', 'Reusable scene presentation state']
    },
    searchTerms: ['well', 'fragments', 'parchment', 'falcon', 'rose court'],
    customPanelKey: 'well_scene_config',
    routes: []
  },
  {
    key: 'storyteller_arena',
    label: 'Storyteller Arena',
    description: 'Mission generation and supporting storyteller routes used in the arena console.',
    flowDescription: 'Arena mission setup starts with a mission-generation response that can pull in entity support as part of the same route.',
    flowOverview: {
      summary: 'Storyteller Arena currently centers on one mission route that may bring along supporting entities in the same response.',
      mainPath: 'Storyteller mission -> mission brief plus supporting entities',
      supportingPath: 'Entity generation is bundled into the same route instead of split into a separate branch.',
      outputs: ['Storyteller missions', 'Supporting entities', 'Arena-ready mission payloads']
    },
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
        roleLabel: 'Entry',
        triggerSummary: 'The arena needs a new storyteller mission bundle.',
        outputSummary: 'Returns mission framing plus any supporting generated entities.',
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
