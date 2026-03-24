import {
  getSceneComponentDefinition,
  normalizeSceneComponents,
  ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID
} from './sceneComponentRegistry';

describe('sceneComponentRegistry', () => {
  it('registers the Rose Court opening sequence as a selectable scene component', () => {
    const definition = getSceneComponentDefinition(ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID);

    expect(definition).toEqual(
      expect.objectContaining({
        id: ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID,
        label: 'Rose Court opening sequence'
      })
    );
    expect(definition.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'scene_intro'
        })
      ])
    );
    expect(normalizeSceneComponents(['rose_court_opening_sequence', 'Rose Court Opening Sequence']))
      .toEqual([ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID]);
  });
});
