export const BASIC_SCENE_TEMPLATE = 'basic_scene';
export const ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID = 'rose_court_opening_sequence';

export const SCENE_TEMPLATE_REGISTRY = Object.freeze([
  {
    id: BASIC_SCENE_TEMPLATE,
    label: 'Basic Scene',
    description: 'The default scene shell with text, image, directions, and optional attached components.'
  }
]);

export const SCENE_COMPONENT_REGISTRY = Object.freeze([
  {
    id: 'messenger',
    label: 'Messenger',
    description: 'Lets the scene open the handset or chat interface.',
    slots: [
      {
        id: 'action_button',
        label: 'Action button',
        description: 'Renders a button on this screen that opens a messenger scene.',
        fields: [
          {
            key: 'sceneId',
            label: 'Messenger Scene ID',
            type: 'text',
            placeholder: 'rose_court_clerk_location'
          },
          {
            key: 'label',
            label: 'Button Label',
            type: 'text',
            placeholder: 'Answer the handset near the wall'
          }
        ]
      },
      {
        id: 'auto_open',
        label: 'Auto open',
        description: 'Opens the messenger automatically when this screen becomes active.',
        fields: [
          {
            key: 'sceneId',
            label: 'Messenger Scene ID',
            type: 'text',
            placeholder: 'rose_court_clerk_transport'
          }
        ]
      }
    ]
  },
  {
    id: 'location_mural_materializer',
    label: 'Location mural materializer',
    description: 'Runs a scene-side materialization effect tied to this screen.',
    slots: [
      {
        id: 'screen_effect',
        label: 'Screen effect',
        description: 'Runs while this screen is active once its trigger conditions are met.',
        fields: [
          {
            key: 'trigger',
            label: 'Trigger',
            type: 'select',
            options: [
              { value: 'after_messenger_complete', label: 'After messenger scene completes' }
            ]
          },
          {
            key: 'messengerSceneId',
            label: 'Messenger Scene ID',
            type: 'text',
            placeholder: 'rose_court_clerk_location'
          }
        ]
      }
    ]
  },
  {
    id: ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID,
    label: 'Rose Court opening sequence',
    description: 'Runs the cinematic Rose Court intro before the bound screen becomes interactive.',
    slots: [
      {
        id: 'scene_intro',
        label: 'Scene intro',
        description: 'Plays the opener once when this screen first becomes active.',
        fields: []
      }
    ]
  },
  {
    id: 'well_sequence',
    label: 'Well sequence',
    description: 'Replaces the standard illustration area with the dedicated well interaction.',
    slots: [
      {
        id: 'screen_media',
        label: 'Replace screen media',
        description: 'Uses the special component in the screen media area.',
        fields: []
      }
    ]
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    description: 'Opens the existing typewriter interface from this scene.',
    slots: [
      {
        id: 'action_button',
        label: 'Action button',
        description: 'Renders a button on this screen that opens the typewriter in a full overlay.',
        fields: [
          {
            key: 'label',
            label: 'Button Label',
            type: 'text',
            placeholder: 'Open the typewriter'
          },
          {
            key: 'sessionId',
            label: 'Typewriter Session ID',
            type: 'text',
            placeholder: 'defaults to the scene session'
          },
          {
            key: 'initialFragment',
            label: 'Initial Fragment',
            type: 'text',
            placeholder: 'Optional line to seed when the typewriter opens'
          }
        ]
      }
    ]
  }
]);

export const SCENE_COMPONENT_REGISTRY_BY_ID = Object.freeze(
  Object.fromEntries(SCENE_COMPONENT_REGISTRY.map((entry) => [entry.id, entry]))
);

export function normalizeSceneTemplate(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || BASIC_SCENE_TEMPLATE;
}

export function normalizeSceneComponentId(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 64);
}

export function normalizeSceneComponents(value = []) {
  const entries = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return [...new Set(entries.map((entry) => normalizeSceneComponentId(entry)).filter(Boolean))];
}

export function getSceneComponentDefinition(componentId = '') {
  return SCENE_COMPONENT_REGISTRY_BY_ID[normalizeSceneComponentId(componentId)] || null;
}

export function getSceneTemplateDefinition(templateId = '') {
  return SCENE_TEMPLATE_REGISTRY.find((entry) => entry.id === normalizeSceneTemplate(templateId)) || null;
}

export function getSceneComponentSlotDefinition(componentId = '', slotId = '') {
  const definition = getSceneComponentDefinition(componentId);
  if (!definition) return null;
  return (Array.isArray(definition.slots) ? definition.slots : []).find((slot) => slot.id === String(slotId || '').trim()) || null;
}

function normalizeBindingValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return '';
}

function normalizeBindingProps(componentId = '', slotId = '', props = {}) {
  const slotDefinition = getSceneComponentSlotDefinition(componentId, slotId);
  const source = props && typeof props === 'object' && !Array.isArray(props) ? props : {};
  const nextProps = {};
  if (!slotDefinition) return nextProps;

  (Array.isArray(slotDefinition.fields) ? slotDefinition.fields : []).forEach((field) => {
    const value = normalizeBindingValue(source[field.key]);
    if ((value === '' || value === null || value === undefined) && field.type === 'select') {
      const firstOption = Array.isArray(field.options) ? field.options[0] : null;
      if (firstOption?.value !== undefined) {
        nextProps[field.key] = firstOption.value;
      }
      return;
    }
    if (value === '' || value === null || value === undefined) return;
    nextProps[field.key] = value;
  });

  return nextProps;
}

export function normalizeScreenComponentBinding(binding = {}) {
  const source = binding && typeof binding === 'object' && !Array.isArray(binding) ? binding : {};
  const componentId = normalizeSceneComponentId(source.componentId);
  const definition = getSceneComponentDefinition(componentId);
  if (!definition) return null;

  const allowedSlots = Array.isArray(definition.slots) ? definition.slots.map((slot) => slot.id) : [];
  const rawSlot = String(source.slot || '').trim();
  const slot = allowedSlots.includes(rawSlot) ? rawSlot : (allowedSlots[0] || '');
  if (!slot) return null;

  const normalizedId = typeof source.id === 'string' ? source.id.trim() : '';
  const nextBinding = {
    componentId,
    slot,
    props: normalizeBindingProps(componentId, slot, source.props)
  };

  if (normalizedId) {
    nextBinding.id = normalizedId;
  }

  return nextBinding;
}

export function normalizeScreenComponentBindings(bindings = []) {
  const entries = Array.isArray(bindings) ? bindings : [];
  return entries
    .map((binding) => normalizeScreenComponentBinding(binding))
    .filter(Boolean);
}

export function getAttachedSceneComponentDefinitions(sceneComponents = []) {
  return normalizeSceneComponents(sceneComponents)
    .map((componentId) => getSceneComponentDefinition(componentId))
    .filter(Boolean);
}

export function getScreenComponentBindings(screen = {}, sceneComponents = []) {
  const allowedComponentIds = new Set(normalizeSceneComponents(sceneComponents));
  return normalizeScreenComponentBindings(screen?.componentBindings || [])
    .filter((binding) => allowedComponentIds.has(binding.componentId));
}
