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
  speakSpec,
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
  drawCategoryIcon(ctx, cx, y + 18, obj.category);

  // Main sortable number
  ctx.fillStyle = '#000';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const value = formatSpec(obj.spec);
  const compactValue = value.length > 8 ? `${Math.round(obj.spec / 1000)}K` : value;
  ctx.fillText(compactValue, cx, y + 44);

  // Name below (truncated if needed)
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const name = obj.name.length > 14 ? obj.name.slice(0, 13) + '…' : obj.name;
  ctx.fillText(name, cx, y + OBJECT_SIZE - 12);
}

// ────────────────────── GameScreen component ──────────────────────

interface CardItem {
  obj: RetroObject;
  factoidText: string | null;
}

export default function GameScreen({ onGameOver, onQuit }: Props) {
  const [displayState, setDisplayState] = useState<GameState>(() => createInitialState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>(generateStars(90));
  const gameStateRef = useRef<GameState>(displayState);
  const recentIdsRef = useRef<string[]>([]);
  const keysRef = useRef({ left: false, right: false, down: false });
  const frameCountRef = useRef(0);
  const lastMoveFrameRef = useRef<{ left: number; right: number }>({ left: -999, right: -999 });
  const prevUnlockedCountRef = useRef(
    getUnlockedBinsSorted(displayState).length,
  );
  const prevLevelRef = useRef(1);
  const [overlayText, setOverlayText] = useState<{ text: string; kind: 'correct' | 'wrong'; id: number } | null>(null);
  const [cardItem, setCardItem] = useState<CardItem | null>(null);
  const [levelUpText, setLevelUpText] = useState<{ level: number; id: number } | null>(null);

  // Spawn initial object
  useEffect(() => {
    if (!gameStateRef.current.currentObject) {
      gameStateRef.current = spawnObject(gameStateRef.current, recentIdsRef.current);
      const obj = gameStateRef.current.currentObject?.object;
      if (obj) {
        setCardItem({ obj, factoidText: null });
        speakSpec(obj.spec, obj.name, obj.speech);
      }
      setDisplayState({ ...gameStateRef.current });
    }
  }, []);

  // Keyboard input — move immediately on keydown, then key-repeat via rAF while held
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Skip spawn delay: any arrow key during the inter-object pause triggers immediate spawn
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
        if (!gameStateRef.current.currentObject && gameStateRef.current.lastDropTimer > 0) {
          gameStateRef.current = { ...gameStateRef.current, lastDropTimer: 0 };
        }
      }

      if (e.key === 'ArrowLeft') {
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
        const landedObj = prev.currentObject.object;
        // Track recent ids (keep last 3)
        recentIdsRef.current = [landedObj.id, ...recentIdsRef.current].slice(0, 3);

        if (next.lastDropResult === 'correct') {
          playCorrect();
          if (next.combo >= 2) playCombo(next.combo);
          const num = formatSpec(landedObj.spec);
          const placeValue = landedObj.placeValue.toUpperCase();
          setOverlayText({
            text: `CORRECT! ${num} → ${placeValue}`,
            kind: 'correct',
            id: Date.now(),
          });
          // Show factoid on the item card
          setCardItem({ obj: landedObj, factoidText: landedObj.factoid });
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
        setLevelUpText({ level: next.level, id: Date.now() });
        prevLevelRef.current = next.level;
      }

      // Game over
      if (next.status === 'gameOver' && prev.status !== 'gameOver') {
        playGameOver();
        setTimeout(() => onGameOver(next.score), 1200);
      }

      // Spawn next object if needed (small delay for flash)
      if (!next.currentObject && next.status === 'playing' && next.lastDropTimer <= 30) {
        gameStateRef.current = spawnObject(next, recentIdsRef.current);
        const newObj = gameStateRef.current.currentObject?.object;
        if (newObj) {
          setCardItem({ obj: newObj, factoidText: null });
          speakSpec(newObj.spec, newObj.name, newObj.speech);
        }
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

  // Auto-clear level-up banner
  useEffect(() => {
    if (!levelUpText) return;
    const t = setTimeout(() => setLevelUpText(null), 2200);
    return () => clearTimeout(t);
  }, [levelUpText]);

  const handleUnlock = useCallback(() => unlockAudio(), []);

  const heartsFilled = '♥'.repeat(Math.max(0, displayState.lives));
  const heartsEmpty  = '♡'.repeat(Math.max(0, 3 - displayState.lives));

  // Unlocked bins in display order (millions → ones), used for the bin row
  const sortedUnlocked = useMemo(() => getUnlockedBinsSorted(displayState), [displayState]);

  // Target place value for active-target highlight
  const targetPlaceValue = displayState.currentObject
    ? sortedUnlocked[displayState.currentObject.column]?.placeValue
    : null;

  return (
    <div className="game-screen" onPointerDown={handleUnlock}>

      {/* ── Left: item card ── */}
      <div className="item-card" aria-live="polite">
        {cardItem ? (
          <>
            <div className="card-instruction">SORT THIS NUMBER</div>
            <div className="card-spec-number">{formatSpec(cardItem.obj.spec)}</div>
            <div className="card-spec-label">{cardItem.obj.specLabel}</div>
            {cardItem.obj.imageUrl && (
              <img
                key={cardItem.obj.id}
                src={cardItem.obj.imageUrl}
                alt={cardItem.obj.name}
                className="card-img"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="card-device-name">{cardItem.obj.name} ({cardItem.obj.year})</div>
            {cardItem.factoidText && (
              <div className="card-factoid">{cardItem.factoidText}</div>
            )}
          </>
        ) : (
          <div className="card-waiting">LOADING...</div>
        )}
      </div>

      {/* ── Right: game main area ── */}
      <div className="game-main" style={{ position: 'relative' }}>
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
        </div>

        {/* Bin row — only unlocked bins, displayed as a positional number */}
        <div className="bins">
          {sortedUnlocked.map((b, idx) => {
            const def = BIN_DEFINITIONS[b.placeValue];
            const isTarget = b.placeValue === targetPlaceValue;
            const flash = b.flashTimer && b.flashTimer > 0
              ? (b.lastResult === 'correct' ? 'flash-correct' : 'flash-wrong')
              : '';
            // Show comma after 'thousands' and 'millions' bins (if there are more bins to the right)
            const showComma = (b.placeValue === 'thousands' || b.placeValue === 'millions')
              && idx < sortedUnlocked.length - 1;
            return (
              <div
                key={b.placeValue}
                className={`bin ${flash} ${isTarget ? 'active-target' : ''} ${showComma ? 'bin-after-comma' : ''}`}
                style={{
                  background: def.color,
                  color: def.textColor,
                  borderColor: def.textColor,
                }}
                aria-label={`${b.label} bin, count ${b.count}`}
              >
                <div className="bin-digit">{b.count}</div>
                <div className="bin-place-label">{def.placeLabel}</div>
                <div className="bin-short">{b.label}</div>
              </div>
            );
          })}
        </div>

        <div className="quit-row">
          <span>← → steer · ↓ fast drop · any key skips pause · ESC quit</span>
          <button
            onClick={onQuit}
            style={{ fontFamily: 'VT323, monospace', fontSize: '1rem', color: '#888' }}
          >
            QUIT
          </button>
        </div>

        {/* Level-up overlay — covers game-main while animating out */}
        {levelUpText && (
          <div key={`lvl-${levelUpText.id}`} className="level-up-overlay">
            <div className="level-up-inner">
              <div className="level-up-label">LEVEL UP</div>
              <div className="level-up-number">{levelUpText.level}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
