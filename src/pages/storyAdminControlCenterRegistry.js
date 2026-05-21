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
  }
];
