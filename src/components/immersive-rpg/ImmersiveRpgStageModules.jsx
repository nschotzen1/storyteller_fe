import React from 'react';
import './ImmersiveRpgStageModules.css';

const normalizeApiBaseUrl = (baseUrl = '') => {
  const trimmed = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

export const resolveStageAssetUrl = (apiBaseUrl = '', imageUrl = '') => {
  const normalizedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  if (!normalizedImageUrl) return '';
  if (/^(https?:)?\/\//i.test(normalizedImageUrl) || normalizedImageUrl.startsWith('data:')) {
    return normalizedImageUrl;
  }
  const safeBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  if (!safeBaseUrl) {
    return normalizedImageUrl;
  }
  if (normalizedImageUrl.startsWith('/')) {
    return `${safeBaseUrl}${normalizedImageUrl}`;
  }
  return `${safeBaseUrl}/${normalizedImageUrl}`;
};

function IllustrationModule({ module, apiBaseUrl }) {
  const imageSrc = resolveStageAssetUrl(apiBaseUrl, module.imageUrl);

  return (
    <figure className={`immersiveRpgStageModule immersiveRpgStageModule--illustration immersiveRpgStageModule--${module.variant || 'landscape'}`}>
      <div className="immersiveRpgStageModule__photo">
        {imageSrc ? (
          <img src={imageSrc} alt={module.altText || module.title || 'Scene illustration'} loading="lazy" />
        ) : (
          <div className="immersiveRpgStageModule__placeholder" aria-hidden="true" />
        )}
      </div>
      <figcaption className="immersiveRpgStageModule__captionBlock">
        {module.title ? <strong>{module.title}</strong> : null}
        {module.caption ? <span>{module.caption}</span> : null}
      </figcaption>
    </figure>
  );
}

function EvidenceNoteModule({ module }) {
  return (
    <article className="immersiveRpgStageModule immersiveRpgStageModule--note">
      {module.title ? <h4>{module.title}</h4> : null}
      {module.body ? <p>{module.body}</p> : null}
      {module.caption ? <span>{module.caption}</span> : null}
    </article>
  );
}

function QuotePanelModule({ module }) {
  return (
    <article className="immersiveRpgStageModule immersiveRpgStageModule--quote">
      {module.title ? <span className="immersiveRpgStageModule__quoteLabel">{module.title}</span> : null}
      {module.body ? <blockquote>{module.body}</blockquote> : null}
      {module.caption ? <footer>{module.caption}</footer> : null}
    </article>
  );
}

function FallbackModule({ module }) {
  return (
    <article className="immersiveRpgStageModule immersiveRpgStageModule--fallback">
      {module.title ? <h4>{module.title}</h4> : null}
      {module.body ? <p>{module.body}</p> : null}
      {module.caption ? <span>{module.caption}</span> : null}
    </article>
  );
}

const MODULE_RENDERERS = {
  illustration: IllustrationModule,
  evidence_note: EvidenceNoteModule,
  quote_panel: QuotePanelModule
};

export default function ImmersiveRpgStageModules({
  apiBaseUrl = '',
  stageLayout = 'focus-left',
  stageModules = []
}) {
  const safeModules = Array.isArray(stageModules) ? stageModules.slice(0, 4) : [];
  const effectiveStageLayout = safeModules.length <= 1 ? 'stacked' : (stageLayout || 'focus-left');

  if (!safeModules.length) {
    return (
      <div className="immersiveRpgStageModules immersiveRpgStageModules--empty">
        <article className="immersiveRpgStageModule immersiveRpgStageModule--fallback">
          <h4>Scene collage awaiting direction</h4>
          <p>The GM has not populated visual modules for this beat yet.</p>
        </article>
      </div>
    );
  }

  return (
    <div className={`immersiveRpgStageModules immersiveRpgStageModules--${effectiveStageLayout}`}>
      {safeModules.map((module, index) => {
        const Renderer = MODULE_RENDERERS[module?.type] || FallbackModule;
        return (
          <div
            key={module?.moduleId || module?.module_id || `${module?.type || 'module'}-${index}`}
            className={[
              'immersiveRpgStageModules__slot',
              module?.emphasis === 'primary' ? 'is-primary' : 'is-secondary'
            ].join(' ')}
            style={{ '--stage-rotation': `${Number(module?.rotateDeg || 0)}deg` }}
            data-tone={module?.tone || ''}
          >
            <Renderer module={module || {}} apiBaseUrl={apiBaseUrl} />
          </div>
        );
      })}
    </div>
  );
}
