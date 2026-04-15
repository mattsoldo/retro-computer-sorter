import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialState, spawnObject, tick, moveLeft, moveRight,
  setFastDrop, getUnlockedBinsSorted,
} from '../game/gameEngine';
import type { GameState, RetroObject } from '../game/types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, OBJECT_SIZE,
  FALL_AREA_HEIGHT, BIN_DEFINITIONS, CATEGORY_COLORS,
} from '../game/constants';
import { formatSpec } from '../game/placeValue';
import {
  playCorrect, playWrong, playCombo, playLevelUp, playGameOver, playUnlock, unlockAudio,
} from '../game/audio';

interface Props {
  onGameOver: (score: number) => void;
  onQuit: () => void;
}

// ────────────────────── Canvas drawing helpers ──────────────────────

interface Star { x: number; y: number; s: number; }

function generateStars(n: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      s: Math.random() < 0.8 ? 1 : 2,
    });
  }
  return stars;
}

function drawBackground(ctx: CanvasRenderingContext2D, stars: Star[]) {
  ctx.fillStyle = '#07071a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // starfield
  ctx.fillStyle = '#ffffff';
  for (const s of stars) {
    ctx.globalAlpha = s.s === 2 ? 0.8 : 0.4;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

function drawColumns(
  ctx: CanvasRenderingContext2D,
  unlockedCount: number,
  activeColumn: number,
) {
  const colWidth = CANVAS_WIDTH / unlockedCount;
  for (let i = 0; i < unlockedCount; i++) {
    if (i === activeColumn) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(i * colWidth, 0, colWidth, FALL_AREA_HEIGHT);
    }
    if (i > 0) {
      ctx.strokeStyle = '#1a1a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * colWidth, 0);
      ctx.lineTo(i * colWidth, FALL_AREA_HEIGHT);
      ctx.stroke();
    }
  }
}

function drawLandingZone(
  ctx: CanvasRenderingContext2D,
  bins: { placeValue: string }[],
) {
  const colWidth = CANVAS_WIDTH / bins.length;
  for (let i = 0; i < bins.length; i++) {
    const pv = bins[i].placeValue as keyof typeof BIN_DEFINITIONS;
    const def = BIN_DEFINITIONS[pv];
    ctx.fillStyle = def.textColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(i * colWidth + 2, FALL_AREA_HEIGHT - 3, colWidth - 4, 3);
    ctx.globalAlpha = 1;
  }
}

function drawCategoryIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, category: RetroObject['category'],
) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  const s = 28;
  switch (category) {
    case 'computer': {
      // small beige box with screen
      ctx.fillRect(cx - s/2, cy - s/2, s, s * 0.66);
      ctx.strokeRect(cx - s/2, cy - s/2, s, s * 0.66);
      ctx.fillStyle = '#33ff88';
      ctx.fillRect(cx - s/2 + 4, cy - s/2 + 4, s - 8, s * 0.66 - 8);
      // stand/base
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(cx - s/3, cy + s * 0.18, s * 0.66, 4);
      break;
    }
    case 'monitor': {
      ctx.fillRect(cx - s/2, cy - s/2, s, s * 0.78);
      ctx.strokeRect(cx - s/2, cy - s/2, s, s * 0.78);
      ctx.fillStyle = '#88eeff';
      ctx.fillRect(cx - s/2 + 3, cy - s/2 + 3, s - 6, s * 0.78 - 6);
      break;
    }
    case 'cartridge': {
      // Notched rectangle
      ctx.beginPath();
      ctx.moveTo(cx - s/2, cy - s/2);
      ctx.lineTo(cx + s/2, cy - s/2);
      ctx.lineTo(cx + s/2, cy + s/2);
      ctx.lineTo(cx - s/2, cy + s/2);
      ctx.lineTo(cx - s/2, cy + s/3);
      ctx.lineTo(cx - s/2 + 6, cy + s/3);
      ctx.lineTo(cx - s/2 + 6, cy + s/6);
      ctx.lineTo(cx - s/2, cy + s/6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(cx - s/4, cy - s/3, s/2, s/4);
      break;
    }
    case 'chip': {
      ctx.fillRect(cx - s/2, cy - s/2, s, s);
      ctx.strokeRect(cx - s/2, cy - s/2, s, s);
      ctx.fillStyle = '#222';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(cx - s/2 - 3, cy - s/2 + 4 + i * 5, 3, 2);
        ctx.fillRect(cx + s/2, cy - s/2 + 4 + i * 5, 3, 2);
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
      break;
    }
    case 'arcade': {
      // cabinet silhouette
      ctx.beginPath();
      ctx.moveTo(cx - s/2, cy + s/2);
      ctx.lineTo(cx - s/2, cy - s/3);
      ctx.lineTo(cx - s/3, cy - s/2);
      ctx.lineTo(cx + s/3, cy - s/2);
      ctx.lineTo(cx + s/2, cy - s/3);
      ctx.lineTo(cx + s/2, cy + s/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff66cc';
      ctx.fillRect(cx - s/3 + 1, cy - s/3 + 2, s - (s*2/3) - 2, s/3);
      break;
    }
  }
}

function drawFallingObject(
  ctx: CanvasRenderingContext2D,
  colWidth: number,
  colIndex: number,
  y: number,
  obj: RetroObject,
) {
  const cx = colIndex * colWidth + colWidth / 2;
  const x = cx - OBJECT_SIZE / 2;

  const color = CATEGORY_COLORS[obj.category] ?? '#cccccc';

  // Block body
  const r = 8;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + OBJECT_SIZE - r, y);
  ctx.arcTo(x + OBJECT_SIZE, y, x + OBJECT_SIZE, y + r, r);
  ctx.lineTo(x + OBJECT_SIZE, y + OBJECT_SIZE - r);
  ctx.arcTo(x + OBJECT_SIZE, y + OBJECT_SIZE, x + OBJECT_SIZE - r, y + OBJECT_SIZE, r);
  ctx.lineTo(x + r, y + OBJECT_SIZE);
  ctx.arcTo(x, y + OBJECT_SIZE, x, y + OBJECT_SIZE - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 3, y + 3, OBJECT_SIZE - 6, 4);

  // Icon
  drawCategoryIcon(ctx, cx, y + OBJECT_SIZE / 2 - 6, obj.category);

  // Name below (truncated if needed)
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const name = obj.name.length > 14 ? obj.name.slice(0, 13) + '…' : obj.name;
  ctx.fillText(name, cx, y + OBJECT_SIZE - 14);
}

// ────────────────────── GameScreen component ──────────────────────

export default function GameScreen({ onGameOver, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>(generateStars(90));
  const gameStateRef = useRef<GameState>(createInitialState());
  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);
  const recentIdsRef = useRef<string[]>([]);
  const keysRef = useRef({ left: false, right: false, down: false });
  const frameCountRef = useRef(0);
  const lastMoveFrameRef = useRef<{ left: number; right: number }>({ left: -999, right: -999 });
  const prevCorrectRef = useRef(0);
  const prevUnlockedCountRef = useRef(
    getUnlockedBinsSorted(gameStateRef.current).length,
  );
  const prevLevelRef = useRef(1);
  const [overlayText, setOverlayText] = useState<{ text: string; kind: 'correct' | 'wrong'; id: number } | null>(null);
  const [factoid, setFactoid] = useState<{ text: string; id: number } | null>(null);

  // Spawn initial object
  useEffect(() => {
    if (!gameStateRef.current.currentObject) {
      gameStateRef.current = spawnObject(gameStateRef.current, recentIdsRef.current);
      setDisplayState({ ...gameStateRef.current });
    }
  }, []);

  // Keyboard input — move immediately on keydown, then key-repeat via rAF while held
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft') {
        // Move immediately if not already held (avoids browser auto-repeat double-move)
        if (!keysRef.current.left) {
          gameStateRef.current = moveLeft(gameStateRef.current);
          lastMoveFrameRef.current.left = frameCountRef.current;
          setDisplayState({ ...gameStateRef.current });
        }
        keysRef.current.left = true;
      }
      if (e.key === 'ArrowRight') {
        if (!keysRef.current.right) {
          gameStateRef.current = moveRight(gameStateRef.current);
          lastMoveFrameRef.current.right = frameCountRef.current;
          setDisplayState({ ...gameStateRef.current });
        }
        keysRef.current.right = true;
      }
      if (e.key === 'ArrowDown') {
        if (!keysRef.current.down) {
          keysRef.current.down = true;
          gameStateRef.current = setFastDrop(gameStateRef.current, true);
        }
      }
      if (e.key === 'Escape') onQuit();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  keysRef.current.left = false;
      if (e.key === 'ArrowRight') keysRef.current.right = false;
      if (e.key === 'ArrowDown') {
        keysRef.current.down = false;
        gameStateRef.current = setFastDrop(gameStateRef.current, false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onQuit]);

  // Main rAF loop
  useEffect(() => {
    let raf = 0;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const delta = ts - lastTs;
      lastTs = ts;
      frameCountRef.current += 1;

      // Handle key repeat movement
      const f = frameCountRef.current;
      const REPEAT = 7;
      if (keysRef.current.left && f - lastMoveFrameRef.current.left >= REPEAT) {
        gameStateRef.current = moveLeft(gameStateRef.current);
        lastMoveFrameRef.current.left = f;
      }
      if (keysRef.current.right && f - lastMoveFrameRef.current.right >= REPEAT) {
        gameStateRef.current = moveRight(gameStateRef.current);
        lastMoveFrameRef.current.right = f;
      }

      // Physics
      const prev = gameStateRef.current;
      gameStateRef.current = tick(prev, delta);
      const next = gameStateRef.current;

      // Landing detection — prev had currentObject, next does not
      if (prev.currentObject && !next.currentObject) {
        // Track recent ids (keep last 3)
        const justLandedId = prev.currentObject.object.id;
        recentIdsRef.current = [justLandedId, ...recentIdsRef.current].slice(0, 3);

        if (next.lastDropResult === 'correct') {
          playCorrect();
          if (next.combo >= 2) playCombo(next.combo);
          const num = formatSpec(prev.currentObject.object.spec);
          const digit = num.charAt(0);
          setOverlayText({
            text: `CORRECT! ${num} starts with ${digit}`,
            kind: 'correct',
            id: Date.now(),
          });
          setFactoid({ text: prev.currentObject.object.factoid, id: Date.now() });
        } else {
          playWrong();
          setOverlayText({ text: 'TRY AGAIN!', kind: 'wrong', id: Date.now() });
        }
      }

      // Unlock detection
      const unlockedNow = getUnlockedBinsSorted(next).length;
      if (unlockedNow > prevUnlockedCountRef.current) {
        playUnlock();
        setOverlayText({
          text: 'NEW BIN UNLOCKED!',
          kind: 'correct',
          id: Date.now(),
        });
        prevUnlockedCountRef.current = unlockedNow;
      }

      // Level up detection
      if (next.level > prevLevelRef.current) {
        playLevelUp();
        prevLevelRef.current = next.level;
      }

      prevCorrectRef.current = next.totalCorrect;

      // Game over
      if (next.status === 'gameOver' && prev.status !== 'gameOver') {
        playGameOver();
        setTimeout(() => onGameOver(next.score), 1400);
      }

      // Spawn next object if needed (small delay for flash)
      if (!next.currentObject && next.status === 'playing' && next.lastDropTimer <= 30) {
        gameStateRef.current = spawnObject(next, recentIdsRef.current);
      }

      // Render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawBackground(ctx, starsRef.current);
          const sortedBins = getUnlockedBinsSorted(gameStateRef.current);
          const obj = gameStateRef.current.currentObject;
          drawColumns(ctx, sortedBins.length, obj?.column ?? 0);
          drawLandingZone(ctx, sortedBins);
          if (obj) {
            const colWidth = CANVAS_WIDTH / sortedBins.length;
            drawFallingObject(ctx, colWidth, obj.column, obj.y, obj.object);
          }
        }
      }

      // Sync React state for HUD — throttle to reduce re-renders
      if (f % 4 === 0 || prev.status !== next.status) {
        setDisplayState({ ...gameStateRef.current });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onGameOver]);

  // Auto-clear overlay
  useEffect(() => {
    if (!overlayText) return;
    const t = setTimeout(() => setOverlayText(null), 900);
    return () => clearTimeout(t);
  }, [overlayText]);

  // Auto-clear factoid
  useEffect(() => {
    if (!factoid) return;
    const t = setTimeout(() => setFactoid(null), 2600);
    return () => clearTimeout(t);
  }, [factoid]);

  const handleUnlock = useCallback(() => unlockAudio(), []);

  const currentObj = displayState.currentObject?.object;
  const heartsFilled = '♥'.repeat(Math.max(0, displayState.lives));
  const heartsEmpty  = '♡'.repeat(Math.max(0, 3 - displayState.lives));

  // Largest place value on the left, matching positional notation and the canvas column order
  const allBinsInOrder = useMemo(() => {
    const ORDER: (keyof typeof BIN_DEFINITIONS)[] = [
      'millions','hundred-thousands','ten-thousands','thousands','hundreds','tens','ones',
    ];
    return ORDER.map(pv => {
      return displayState.bins.find(b => b.placeValue === pv)!;
    });
  }, [displayState.bins]);

  // Which sorted (unlocked) index is currently targeted?
  const sortedUnlocked = useMemo(() => getUnlockedBinsSorted(displayState), [displayState]);
  const targetPlaceValue = displayState.currentObject
    ? sortedUnlocked[displayState.currentObject.column]?.placeValue
    : null;

  return (
    <div className="game-screen" onPointerDown={handleUnlock}>
      <div className="hud">
        <div className="hud-item">
          <span className="hud-label">SCORE</span>
          <span className="hud-value">{displayState.score.toLocaleString()}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">LIVES</span>
          <span className="hud-value lives">{heartsFilled}{heartsEmpty}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">LEVEL</span>
          <span className="hud-value">{displayState.level}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">COMBO</span>
          <span className="hud-value combo">
            {displayState.combo >= 2 ? `x${displayState.combo}!` : '—'}
          </span>
        </div>
      </div>

      <div className="spec-panel" aria-live="polite">
        <div className="spec-panel-info">
          <div className="spec-instruction">SORT THIS NUMBER INTO THE RIGHT PLACE VALUE BIN</div>
          <div className="spec-number">
            {currentObj ? formatSpec(currentObj.spec) : '...'}
          </div>
          <div className="spec-label">
            {currentObj ? `${currentObj.specLabel} — ${currentObj.name} (${currentObj.year})` : ''}
          </div>
        </div>
        {currentObj?.imageUrl && (
          <img
            key={currentObj.id}
            src={currentObj.imageUrl}
            alt={currentObj.name}
            className="spec-device-img"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>

      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          aria-label="Game play area"
        />
        {overlayText && (
          <div key={`ov-${overlayText.id}`} className={`canvas-overlay ${overlayText.kind}`}>
            {overlayText.text}
          </div>
        )}
        {factoid && (
          <div key={`fct-${factoid.id}`} className="factoid-overlay">
            {factoid.text}
          </div>
        )}
      </div>

      <div className="bins">
        {allBinsInOrder.map(b => {
          const def = BIN_DEFINITIONS[b.placeValue];
          const isTarget = b.placeValue === targetPlaceValue;
          const flash = b.flashTimer && b.flashTimer > 0
            ? (b.lastResult === 'correct' ? 'flash-correct' : 'flash-wrong')
            : '';
          const locked = !b.unlocked;
          return (
            <div
              key={b.placeValue}
              className={`bin ${locked ? 'locked' : ''} ${flash} ${isTarget ? 'active-target' : ''}`}
              style={!locked ? {
                background: def.color,
                color: def.textColor,
                borderColor: def.textColor,
              } : undefined}
              aria-label={`${b.label} bin ${locked ? '(locked)' : ''}`}
            >
              <div className="bin-short">
                {locked ? '🔒' : b.shortLabel}
              </div>
              <div className="bin-range">{locked ? '???' : b.range}</div>
              <div className="bin-count">{locked ? '' : `x${b.count}`}</div>
            </div>
          );
        })}
      </div>

      <div className="quit-row">
        <span>← → to steer · ↓ fast drop · ESC to quit</span>
        <button
          onClick={onQuit}
          style={{ fontFamily: 'VT323, monospace', fontSize: '1rem', color: '#888' }}
        >
          QUIT
        </button>
      </div>
    </div>
  );
}
