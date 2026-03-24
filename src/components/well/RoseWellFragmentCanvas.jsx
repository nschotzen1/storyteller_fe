import React, { useEffect, useRef } from 'react';

const FONT_STACK = "'Palatino Linotype', Baskerville, 'Book Antiqua', serif";
const MAX_SPRITE_WIDTH = 560;
const IMAGE_CACHE = new Map();

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + ((end - start) * amount);
const smoothstep = (edge0, edge1, value) => {
  const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return amount * amount * (3 - (2 * amount));
};

const parsePercent = (value, fallback = 50) => {
  const numeric = Number.parseFloat(`${value || ''}`);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const parseRotate = (value, fallback = 0) => {
  const numeric = Number.parseFloat(`${value || ''}`);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const remToPx = (value, rootFontPx = 16, fallback = 18) => {
  const numeric = Number.parseFloat(`${value || ''}`);
  return Number.isFinite(numeric) ? numeric * rootFontPx : fallback * rootFontPx;
};

const getNowMs = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

const getRootFontPx = () => {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return 16;
  const computed = window.getComputedStyle(document.documentElement);
  const numeric = Number.parseFloat(computed.fontSize || '16');
  return Number.isFinite(numeric) ? numeric : 16;
};

const parseInset = (value = '18% 18% 20% 18%') => {
  const parts = `${value || ''}`.trim().split(/\s+/).filter(Boolean);
  const [top, right = top, bottom = top, left = right] = parts;
  return {
    top: clamp(parsePercent(top, 18) / 100, 0, 0.45),
    right: clamp(parsePercent(right, 18) / 100, 0, 0.45),
    bottom: clamp(parsePercent(bottom, 20) / 100, 0, 0.45),
    left: clamp(parsePercent(left, 18) / 100, 0, 0.45)
  };
};

const wrapText = (ctx, text, maxWidth, maxLines = 3) => {
  const words = `${text || ''}`.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = words[index];
    if (lines.length === maxLines - 1) {
      break;
    }
  }

  const consumedWordCount = lines.join(' ').split(/\s+/).filter(Boolean).length;
  const remainingWords = words.slice(consumedWordCount);
  if (remainingWords.length) {
    const finalLineWords = lines.length < maxLines - 1 ? remainingWords : remainingWords;
    const finalLine = finalLineWords.join(' ');
    if (finalLine) {
      lines.push(finalLine);
    }
  } else if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
};

const fitTextLayout = (ctx, text, boxWidth, boxHeight) => {
  const maxFontSize = Math.min(44, Math.max(18, boxHeight * 0.42));
  for (let fontSize = maxFontSize; fontSize >= 17; fontSize -= 1) {
    ctx.font = `italic 600 ${fontSize}px ${FONT_STACK}`;
    const lines = wrapText(ctx, text, boxWidth, 3);
    const lineHeight = fontSize * 1.12;
    const longestLine = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    if (longestLine <= boxWidth && (lines.length * lineHeight) <= boxHeight) {
      return { fontSize, lines, lineHeight };
    }
  }

  const fallbackSize = 17;
  ctx.font = `italic 600 ${fallbackSize}px ${FONT_STACK}`;
  return {
    fontSize: fallbackSize,
    lines: wrapText(ctx, text, boxWidth, 3),
    lineHeight: fallbackSize * 1.12
  };
};

const getToneOverlay = (tone = 'soft') => {
  switch (tone) {
    case 'dusty':
      return {
        tint: 'rgba(86, 54, 27, 0.16)',
        edge: 'rgba(38, 22, 12, 0.24)'
      };
    case 'faded':
      return {
        tint: 'rgba(58, 43, 28, 0.12)',
        edge: 'rgba(28, 19, 12, 0.2)'
      };
    case 'stained':
      return {
        tint: 'rgba(74, 42, 17, 0.22)',
        edge: 'rgba(34, 18, 10, 0.28)'
      };
    default:
      return {
        tint: 'rgba(58, 41, 25, 0.08)',
        edge: 'rgba(26, 18, 10, 0.14)'
      };
  }
};

const ensureImage = (src) => {
  if (!src || typeof Image === 'undefined') return null;
  const existing = IMAGE_CACHE.get(src);
  if (existing) return existing;

  const image = new Image();
  const record = {
    image,
    loaded: false,
    failed: false
  };
  image.onload = () => {
    record.loaded = true;
  };
  image.onerror = () => {
    record.failed = true;
  };
  image.src = src;
  IMAGE_CACHE.set(src, record);
  return record;
};

const createFragmentSprite = (fragment, image) => {
  if (typeof document === 'undefined' || !image) return null;
  const naturalWidth = image.naturalWidth || 900;
  const naturalHeight = image.naturalHeight || 400;
  const ratio = naturalWidth / Math.max(1, naturalHeight);
  const width = Math.min(MAX_SPRITE_WIDTH, naturalWidth);
  const height = Math.round(width / Math.max(0.8, ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const tone = getToneOverlay(fragment.tone);
  const tintGradient = ctx.createLinearGradient(0, 0, 0, height);
  tintGradient.addColorStop(0, 'rgba(255, 244, 220, 0.04)');
  tintGradient.addColorStop(0.54, tone.tint);
  tintGradient.addColorStop(1, tone.edge);
  ctx.fillStyle = tintGradient;
  ctx.fillRect(0, 0, width, height);

  const inset = parseInset(fragment.textInset);
  const boxX = width * inset.left;
  const boxY = height * inset.top;
  const boxWidth = width * (1 - inset.left - inset.right);
  const boxHeight = height * (1 - inset.top - inset.bottom);
  const layout = fitTextLayout(ctx, fragment.text, boxWidth, boxHeight);
  const startY = boxY + ((boxHeight - (layout.lines.length * layout.lineHeight)) / 2) + (layout.lineHeight / 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 600 ${layout.fontSize}px ${FONT_STACK}`;

  layout.lines.forEach((line, index) => {
    const x = boxX + (boxWidth / 2);
    const y = startY + (index * layout.lineHeight);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(242, 188, 92, 0.5)';
    ctx.shadowColor = 'rgba(255, 196, 96, 0.82)';
    ctx.shadowBlur = 20;
    ctx.fillText(line, x, y);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(84, 49, 20, 0.58)';
    ctx.shadowColor = 'rgba(28, 15, 7, 0.44)';
    ctx.shadowBlur = 1.8;
    ctx.fillText(line, x, y + 0.9);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 220, 142, 0.98)';
    ctx.fillText(line, x, y);
  });

  const edgeFade = ctx.createLinearGradient(0, 0, width, height);
  edgeFade.addColorStop(0, 'rgba(0, 0, 0, 0.06)');
  edgeFade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  edgeFade.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = edgeFade;
  ctx.fillRect(0, 0, width, height);

  return canvas;
};

const drawWaterCaustics = (ctx, now, width, height) => {
  const baseY = height * 0.76;
  const clipCenterX = width * 0.5;
  const clipCenterY = height * 0.79;
  const clipRadiusX = width * 0.34;
  const clipRadiusY = height * 0.14;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(clipCenterX, clipCenterY, clipRadiusX, clipRadiusY, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineCap = 'round';

  for (let index = 0; index < 6; index += 1) {
    const pathAmplitude = height * (0.009 + (index * 0.0018));
    const y = baseY + (index * height * 0.024);
    ctx.beginPath();
    for (let x = -40; x <= width + 40; x += 18) {
      const wave = Math.sin((x * 0.012) + (now * 0.0011) + index) * pathAmplitude;
      const ripple = Math.cos((x * 0.021) - (now * 0.0007) + (index * 0.6)) * (pathAmplitude * 0.36);
      const plotY = y + wave + ripple;
      if (x === -40) {
        ctx.moveTo(x, plotY);
      } else {
        ctx.lineTo(x, plotY);
      }
    }
    ctx.strokeStyle = `rgba(255, 215, 154, ${0.012 + (index * 0.005)})`;
    ctx.lineWidth = 1.2 + (index * 0.22);
    ctx.shadowColor = 'rgba(255, 214, 150, 0.08)';
    ctx.shadowBlur = 9;
    ctx.stroke();
  }

  const bloom = ctx.createRadialGradient(
    width * 0.5,
    height * 0.78,
    0,
    width * 0.5,
    height * 0.78,
    Math.min(width, height) * 0.2
  );
  bloom.addColorStop(0, 'rgba(255, 216, 154, 0.12)');
  bloom.addColorStop(0.38, 'rgba(162, 104, 52, 0.05)');
  bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const drawDepthMist = (ctx, now, width, height) => {
  ctx.save();
  const mist = ctx.createRadialGradient(
    width * 0.5,
    height * 0.76,
    Math.min(width, height) * 0.04,
    width * 0.5,
    height * 0.76,
    Math.min(width, height) * 0.42
  );
  mist.addColorStop(0, `rgba(0, 0, 0, ${0.04 + (Math.sin(now * 0.001) * 0.01)})`);
  mist.addColorStop(0.45, 'rgba(6, 5, 6, 0.08)');
  mist.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const drawReflection = (ctx, x, y, width, height, alpha) => {
  ctx.save();
  ctx.translate(x, y + (height * 0.46));
  ctx.scale(1, 0.28);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.42);
  glow.addColorStop(0, `rgba(255, 223, 178, ${alpha * 0.42})`);
  glow.addColorStop(0.5, `rgba(95, 58, 31, ${alpha * 0.18})`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.42, height * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawDistortedFragment = (ctx, sprite, drawWidth, drawHeight, timeMs, distortion, fragment) => {
  const stripHeight = Math.max(3, Math.round(sprite.height / 44));
  ctx.beginPath();
  ctx.rect((-drawWidth / 2) - 18, (-drawHeight / 2) - 18, drawWidth + 36, drawHeight + 36);
  ctx.clip();

  for (let sourceY = 0; sourceY < sprite.height; sourceY += stripHeight) {
    const sourceHeight = Math.min(stripHeight, sprite.height - sourceY);
    const normalizedY = sourceY / sprite.height;
    const localY = (-drawHeight / 2) + (normalizedY * drawHeight);
    const targetHeight = (sourceHeight / sprite.height) * drawHeight;
    const waveA = Math.sin((timeMs * 0.0032) + (sourceY * 0.064) + fragment.waveSeed) * distortion;
    const waveB = Math.cos((timeMs * 0.0015) + (sourceY * 0.12) + fragment.rippleSeed) * distortion * 0.36;
    const drift = Math.sin((timeMs * 0.0009) + (normalizedY * 7.8) + fragment.sinkSeed) * distortion * 0.18;
    ctx.drawImage(
      sprite,
      0,
      sourceY,
      sprite.width,
      sourceHeight,
      (-drawWidth / 2) + waveA + waveB,
      localY + drift,
      drawWidth,
      targetHeight + 1
    );
  }
};

const drawFragment = (ctx, fragment, now, width, height, rootFontPx, fragmentLeftShift, fragmentTopShift, sprite) => {
  if (!sprite) return;
  const age = now - (fragment.bornAt || 0);
  if (age < 0 || age > fragment.lifetimeMs) return;

  const progress = clamp(age / Math.max(1, fragment.lifetimeMs));
  const emerge = smoothstep(0.05, 0.3, progress);
  const readableIn = smoothstep(fragment.readWindowStart, fragment.readWindowStart + 0.12, progress);
  const readableOut = 1 - smoothstep(fragment.readWindowEnd, fragment.readWindowEnd + 0.12, progress);
  const readable = clamp(readableIn * readableOut);
  const sink = smoothstep(0.8, 1, progress);
  const hover = 1 - smoothstep(0.68, 0.88, progress);
  const sway = Math.sin((now * 0.00042) + fragment.waveSeed) * 5.2 + Math.cos((now * 0.00028) + fragment.rippleSeed) * 1.9;
  const baseX = width * ((parsePercent(fragment.left, 50) + fragmentLeftShift) / 100);
  const baseY = height * ((parsePercent(fragment.top, 64) + fragmentTopShift) / 100);
  const riseDistance = height * (0.17 + (fragment.surfaceBias * 0.018));
  const sinkDistance = height * (0.05 + (fragment.sinkDepth * 0.02));
  const x = baseX + (sway * (0.38 + (readable * 0.34))) + (fragment.crossDrift * (0.38 + (emerge * 0.34)));
  const y = baseY + ((1 - emerge) * riseDistance) - (hover * height * 0.013) + (sink * sinkDistance) + (Math.sin((now * 0.00054) + fragment.waveSeed) * 2.8);
  const baseWidth = remToPx(fragment.width, rootFontPx);
  const drawWidth = baseWidth * (0.72 + (emerge * 0.26) + (readable * 0.08) - (sink * 0.06));
  const drawHeight = drawWidth * (sprite.height / Math.max(1, sprite.width));
  const alpha = clamp((emerge * 0.96) * (1 - (sink * 0.62)) * (0.56 + (readable * 0.5)));
  const blur = lerp(3.4, 0.2, readable) + (sink * 1.8);
  const distortion = lerp(6.8, 1.2, readable) + (sink * 2.8);
  const rotation = (parseRotate(fragment.rotate, 0) * (Math.PI / 180)) + (Math.sin((now * 0.00024) + fragment.waveSeed) * 0.018);

  drawReflection(ctx, x, y, drawWidth, drawHeight, alpha);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  if ('filter' in ctx) {
    ctx.filter = `blur(${blur.toFixed(2)}px)`;
  }

  drawDistortedFragment(ctx, sprite, drawWidth, drawHeight, now, distortion, fragment);

  if ('filter' in ctx) {
    ctx.filter = 'none';
  }

  const centerGlow = ctx.createRadialGradient(0, 0, drawWidth * 0.08, 0, 0, drawWidth * 0.52);
  centerGlow.addColorStop(0, `rgba(247, 200, 104, ${readable * 0.18})`);
  centerGlow.addColorStop(0.45, `rgba(196, 128, 48, ${readable * 0.1})`);
  centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect((-drawWidth / 2) - 20, (-drawHeight / 2) - 20, drawWidth + 40, drawHeight + 40);

  ctx.restore();
};

function RoseWellFragmentCanvas({
  fragments = [],
  fragmentLeftShift = 0,
  fragmentTopShift = 0
}) {
  const canvasRef = useRef(null);
  const spriteCacheRef = useRef(new Map());
  const rafRef = useRef(null);
  const fragmentsRef = useRef(fragments);

  useEffect(() => {
    fragmentsRef.current = fragments;
    const activeIds = new Set(fragments.map((fragment) => fragment.id));
    Array.from(spriteCacheRef.current.keys()).forEach((key) => {
      if (!activeIds.has(key)) {
        spriteCacheRef.current.delete(key);
      }
    });
    fragments.forEach((fragment) => {
      ensureImage(fragment.paperImage);
    });
  }, [fragments]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return undefined;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) {
      return undefined;
    }

    let context = null;
    try {
      context = canvas.getContext('2d');
    } catch (error) {
      context = null;
    }
    if (!context) return undefined;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (timestamp) => {
      resizeCanvas();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);
      drawDepthMist(context, timestamp, width, height);
      drawWaterCaustics(context, timestamp, width, height);

      const rootFontPx = getRootFontPx();
      const sortedFragments = [...fragmentsRef.current].sort((left, right) =>
        parsePercent(left.top, 60) - parsePercent(right.top, 60)
      );

      sortedFragments.forEach((fragment) => {
        const cachedSprite = spriteCacheRef.current.get(fragment.id);
        let sprite = cachedSprite || null;
        if (!sprite) {
          const record = ensureImage(fragment.paperImage);
          if (record?.loaded) {
            sprite = createFragmentSprite(fragment, record.image);
            if (sprite) {
              spriteCacheRef.current.set(fragment.id, sprite);
            }
          }
        }
        drawFragment(
          context,
          fragment,
          timestamp,
          width,
          height,
          rootFontPx,
          fragmentLeftShift,
          fragmentTopShift,
          sprite
        );
      });

      rafRef.current = window.requestAnimationFrame(drawFrame);
    };

    rafRef.current = window.requestAnimationFrame(drawFrame);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [fragmentLeftShift, fragmentTopShift]);

  return <canvas ref={canvasRef} className="roseWellScene__canvasLayer" aria-hidden="true" />;
}

export default RoseWellFragmentCanvas;
