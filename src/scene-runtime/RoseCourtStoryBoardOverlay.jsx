import React, { useMemo } from 'react';
import {
  getRoseCourtBoardNodeMeta,
  ROSE_COURT_BOARD_DIMENSIONS
} from './roseCourtStoryBoardLayout';

const MAX_PREVIEW_CHOICES = 3;

const truncateText = (value = '', maxLength = 150) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const toChoicePreview = (screen = null) => {
  if (!Array.isArray(screen?.directions)) return [];
  return screen.directions
    .slice(0, MAX_PREVIEW_CHOICES)
    .map((direction) => String(direction?.label || direction?.direction || '').trim())
    .filter(Boolean);
};

const toNodeRecord = (screen = null, status = 'visited') => {
  if (!screen?.id) return null;
  const meta = getRoseCourtBoardNodeMeta(screen.id);
  return {
    id: screen.id,
    screen,
    status,
    excerpt: truncateText(
      screen.expectationSummary
      || screen.continuitySummary
      || screen.prompt
      || '',
      status === 'source' || status === 'destination' ? 160 : 110
    ),
    choices: toChoicePreview(screen),
    ...meta
  };
};

const dedupeNodes = (items = []) => {
  const seen = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
      return;
    }

    const previous = seen.get(item.id);
    const priority = ['destination', 'source', 'visited', 'hinted'];
    const previousRank = priority.indexOf(previous.status);
    const nextRank = priority.indexOf(item.status);
    if (nextRank !== -1 && (previousRank === -1 || nextRank < previousRank)) {
      seen.set(item.id, item);
    }
  });
  return Array.from(seen.values());
};

const getRoutePath = (sourceNode, destinationNode) => {
  if (!sourceNode || !destinationNode) return '';
  const midX = (sourceNode.x + destinationNode.x) / 2;
  const midY = Math.min(sourceNode.y, destinationNode.y) - 96;
  return `M ${sourceNode.x} ${sourceNode.y} Q ${midX} ${midY} ${destinationNode.x} ${destinationNode.y}`;
};

const getCameraSpec = (phase, sourceNode, destinationNode) => {
  if (!sourceNode) {
    return {
      zoom: 1,
      x: ROSE_COURT_BOARD_DIMENSIONS.width / 2,
      y: ROSE_COURT_BOARD_DIMENSIONS.height / 2,
      durationMs: 450
    };
  }

  const midX = destinationNode ? (sourceNode.x + destinationNode.x) / 2 : sourceNode.x;
  const midY = destinationNode ? ((sourceNode.y + destinationNode.y) / 2) - 54 : sourceNode.y;

  if (phase === 'locking') {
    return { zoom: 1.54, x: sourceNode.x, y: sourceNode.y, durationMs: 260 };
  }
  if (phase === 'reveal') {
    return { zoom: 0.66, x: sourceNode.x, y: sourceNode.y, durationMs: 920 };
  }
  if (phase === 'travel') {
    return { zoom: 0.72, x: midX, y: midY, durationMs: 980 };
  }
  if (phase === 'arrive') {
    return {
      zoom: 1.54,
      x: destinationNode?.x || sourceNode.x,
      y: destinationNode?.y || sourceNode.y,
      durationMs: 820
    };
  }
  return {
    zoom: 1.58,
    x: destinationNode?.x || sourceNode.x,
    y: destinationNode?.y || sourceNode.y,
    durationMs: 520
  };
};

function RoseCourtStoryBoardOverlay({
  phase = 'reveal',
  sourceScreen = null,
  destinationScreen = null,
  visitedScreens = [],
  hintedScreens = [],
  selectedDirectionLabel = '',
  requestPending = false
}) {
  const sourceNode = useMemo(() => toNodeRecord(sourceScreen, 'source'), [sourceScreen]);
  const destinationNode = useMemo(() => toNodeRecord(destinationScreen, 'destination'), [destinationScreen]);

  const nodes = useMemo(() => dedupeNodes([
    ...visitedScreens.map((screen) => toNodeRecord(screen, 'visited')),
    ...hintedScreens.map((screen) => toNodeRecord(screen, 'hinted')),
    sourceNode,
    destinationNode
  ].filter(Boolean)), [destinationNode, hintedScreens, sourceNode, visitedScreens]);

  const camera = useMemo(
    () => getCameraSpec(phase, sourceNode, destinationNode),
    [destinationNode, phase, sourceNode]
  );

  const routePath = useMemo(
    () => getRoutePath(sourceNode, destinationNode),
    [destinationNode, sourceNode]
  );

  const cameraTransform = `translate(calc(50vw - ${camera.x * camera.zoom}px), calc(50vh - ${camera.y * camera.zoom}px)) scale(${camera.zoom})`;

  return (
    <div className={`roseBoard roseBoard--${phase}`} aria-hidden="true">
      <div
        className="roseBoard__camera"
        style={{
          transform: cameraTransform,
          transitionDuration: `${camera.durationMs}ms`
        }}
      >
        <div
          className="roseBoard__surface"
          style={{
            width: `${ROSE_COURT_BOARD_DIMENSIONS.width}px`,
            height: `${ROSE_COURT_BOARD_DIMENSIONS.height}px`
          }}
        >
          <div className="roseBoard__grain" />
          <svg
            className="roseBoard__routes"
            viewBox={`0 0 ${ROSE_COURT_BOARD_DIMENSIONS.width} ${ROSE_COURT_BOARD_DIMENSIONS.height}`}
            preserveAspectRatio="none"
          >
            {routePath ? <path className="roseBoard__routeBase" d={routePath} /> : null}
            {routePath ? <path className="roseBoard__routeActive" d={routePath} /> : null}
          </svg>

          {nodes.map((node) => (
            <article
              key={node.id}
              className={`roseBoard__card roseBoard__card--${node.status}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: `translate(-50%, -50%) rotate(${node.rotation}deg)`
              }}
            >
              <span className="roseBoard__pin" aria-hidden="true" />
              {node.screen?.imageUrl ? (
                <div className="roseBoard__imageWrap">
                  <img src={node.screen.imageUrl} alt="" />
                </div>
              ) : null}
              <div className="roseBoard__cardBody">
                <p className="roseBoard__zone">{node.zone}</p>
                <h2>{node.screen?.title || 'Story page'}</h2>
                {node.excerpt ? <p className="roseBoard__excerpt">{node.excerpt}</p> : null}
                {node.choices.length > 0 ? (
                  <ul className="roseBoard__choices">
                    {node.choices.map((choice) => (
                      <li key={choice}>{choice}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="roseBoard__caption">
        <p className="roseBoard__eyebrow">Story board adventure</p>
        <p className="roseBoard__title">
          {selectedDirectionLabel || 'Tracing the next page'}
        </p>
        <p className="roseBoard__status">
          {requestPending
            ? 'The route is being committed to the archive.'
            : 'The page has become one trace among many.'}
        </p>
      </div>
    </div>
  );
}

export default RoseCourtStoryBoardOverlay;
