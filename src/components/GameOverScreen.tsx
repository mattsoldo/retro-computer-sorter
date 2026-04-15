import { useEffect, useMemo, useRef, useState } from 'react';
import type { BinState, SortedItemRecord } from '../game/types';
import { BIN_DEFINITIONS } from '../game/constants';
import { speakText } from '../game/audio';
import { loadHighScores, saveHighScore, isHighScore } from '../game/highScores';
import type { HighScoreEntry } from '../game/types';

// ── Number-to-words helpers ──────────────────────────────────────────────────
const ONES_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const TEENS_WORDS = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS_WORDS  = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function threeDigitsToWords(n: number): string {
  if (n <= 0) return '';
  const h    = Math.floor(n / 100);
  const rest = n % 100;
  let result = '';
  if (h > 0) result = ONES_WORDS[h] + ' hundred';
  if (rest > 0) {
    if (result) result += ' ';
    if (rest < 10)       result += ONES_WORDS[rest];
    else if (rest < 20)  result += TEENS_WORDS[rest - 10];
    else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      result += TENS_WORDS[t];
      if (o > 0) result += '-' + ONES_WORDS[o];
    }
  }
  return result;
}

type AnnounceSegment = { groupId: string; label: string; positions: Set<number> };

/** Build announcement segments for n. Each segment has digit positions (0 = ones). */
function buildAnnounceSegments(n: number): AnnounceSegment[] {
  if (n === 0) return [{ groupId: 'ones', label: 'zero', positions: new Set([0]) }];

  const segs: AnnounceSegment[] = [];
  const millionsPart   = Math.floor(n / 1_000_000);
  const thousandsPart  = Math.floor((n % 1_000_000) / 1_000);
  const hundredsDigit  = Math.floor((n % 1_000) / 100);
  const tensDigit      = Math.floor((n % 100) / 10);
  const onesDigit      = n % 10;

  if (millionsPart > 0) {
    segs.push({ groupId: 'millions', label: ONES_WORDS[millionsPart] + ' million', positions: new Set([6]) });
  }

  if (thousandsPart > 0) {
    const ts = String(thousandsPart);
    const pos = new Set<number>();
    for (let i = 0; i < ts.length; i++) pos.add(3 + ts.length - 1 - i);
    segs.push({ groupId: 'thousands', label: threeDigitsToWords(thousandsPart) + ' thousand', positions: pos });
  }

  if (hundredsDigit > 0) {
    segs.push({ groupId: 'hundreds', label: ONES_WORDS[hundredsDigit] + ' hundred', positions: new Set([2]) });
  }

  if (tensDigit === 1) {
    // treat as a teen (10–19)
    segs.push({ groupId: 'teens', label: TEENS_WORDS[onesDigit], positions: new Set([0, 1]) });
  } else {
    if (tensDigit > 0) {
      segs.push({ groupId: 'tens', label: TENS_WORDS[tensDigit], positions: new Set([1]) });
    }
    if (onesDigit > 0) {
      segs.push({ groupId: 'ones', label: ONES_WORDS[onesDigit], positions: new Set([0]) });
    }
  }

  return segs;
}

/** Map each character of n.toLocaleString() to a groupId (or null for commas). */
function buildCharGroupMap(n: number, segs: AnnounceSegment[]): (string | null)[] {
  const str = n.toLocaleString();
  const posToGroup = new Map<number, string>();
  for (const seg of segs) for (const p of seg.positions) posToGroup.set(p, seg.groupId);

  const totalDigits = str.replace(/,/g, '').length;
  let digitIdx = 0;
  return [...str].map(ch => {
    if (ch === ',') return null;
    const pos = totalDigits - 1 - digitIdx++;
    return posToGroup.get(pos) ?? 'inactive';
  });
}

// Place values for computing the final number
const PLACE_VALUES: Record<string, number> = {
  ones: 1,
  tens: 10,
  hundreds: 100,
  thousands: 1_000,
  'ten-thousands': 10_000,
  'hundred-thousands': 100_000,
  millions: 1_000_000,
};

// Display order: highest to lowest (mirrors the game bin order)
const BIN_ORDER = [
  'millions',
  'hundred-thousands',
  'ten-thousands',
  'thousands',
  'hundreds',
  'tens',
  'ones',
] as const;

function computeFinalNumber(bins: BinState[]): number {
  return bins.reduce((sum, b) => sum + b.count * (PLACE_VALUES[b.placeValue] ?? 0), 0);
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Props {
  score: number;
  bins: BinState[];
  sortedItems: SortedItemRecord[];
  onPlay: () => void;
  onBack: () => void;
}

type Phase = 'announce' | 'credits' | 'scores';

const CREDITS_SCROLL_SPEED = 1.2; // px per frame at 60fps

export default function GameOverScreen({ score, bins, sortedItems, onPlay, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('announce');

  // ── High scores state (used in scores phase) ──
  const finalNumber = useMemo(() => computeFinalNumber(bins), [bins]);
  const qualifies = useMemo(() => score > 0 && isHighScore(score), [score]);

  // ── Digit-by-digit announce state ──
  const announceSegments = useMemo(() => buildAnnounceSegments(finalNumber), [finalNumber]);
  const charGroupMap     = useMemo(() => buildCharGroupMap(finalNumber, announceSegments), [finalNumber, announceSegments]);
  const [announceStep, setAnnounceStep] = useState<number>(-1); // -1 = not started
  const [scores, setScores] = useState<HighScoreEntry[]>(() => loadHighScores());
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(!qualifies);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // ── Credits scroll refs ──
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scoresRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const skipRef = useRef(false); // set true to jump to end immediately

  // ── Phase 1a: kick off the announce sequence after a short pause ──
  useEffect(() => {
    if (phase !== 'announce') return;
    const t = setTimeout(() => setAnnounceStep(0), 700);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Phase 1b: speak the current segment; advance on completion ──
  useEffect(() => {
    if (phase !== 'announce' || announceStep < 0) return;

    // All segments done — pause, then move on
    if (announceStep >= announceSegments.length) {
      const t = setTimeout(() => setPhase('credits'), 800);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    const label = announceSegments[announceStep].label;
    const advance = () => { if (!cancelled) { cancelled = true; setAnnounceStep(s => s + 1); } };

    speakText(label, advance);

    // Fallback: advance after estimated speech duration in case onend never fires
    const estimatedMs = Math.max(1800, label.split(' ').length * 900);
    const fallback = setTimeout(advance, estimatedMs);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      window.speechSynthesis?.cancel();
    };
  }, [phase, announceStep, announceSegments]);

  // ── Keyboard handler: skip / advance ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (phase === 'announce') {
          // Advance to next segment; if at the end skip straight to credits
          setAnnounceStep(s => {
            const next = s + 1;
            return next; // useEffect will transition to credits when next >= segments.length
          });
        } else if (phase === 'credits') {
          skipRef.current = true; // triggers jump to end in the RAF loop
        } else if (phase === 'scores') {
          if (saved) onPlay();
        }
      }
      if (e.key === 'Escape') {
        if (phase === 'scores' && saved) onBack();
        else if (phase !== 'scores') setPhase('scores');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, saved, onPlay, onBack]);

  // ── Phase 2: run the credits scroll animation ──
  useEffect(() => {
    if (phase !== 'credits') return;

    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner) return;

    const containerH = viewport.clientHeight;
    let translateY = containerH; // start fully below viewport
    inner.style.transform = `translateY(${containerH}px)`;

    let running = true;

    const animate = () => {
      if (!running) return;

      // Skip key pressed — jump directly to showing scores
      if (skipRef.current) {
        skipRef.current = false;
        setPhase('scores');
        return;
      }

      const scoresEl = scoresRef.current;
      if (scoresEl) {
        // offsetTop is relative to the inner div (its offsetParent)
        const scoresTop = scoresEl.offsetTop;
        // Stop when the scores section top aligns with the viewport top
        if (translateY <= -scoresTop) {
          inner.style.transform = `translateY(${-scoresTop}px)`;
          running = false;
          setTimeout(() => setPhase('scores'), 400);
          return;
        }
      }

      translateY -= CREDITS_SCROLL_SPEED;
      inner.style.transform = `translateY(${translateY}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // ── Ensure scores section is visible whenever we enter scores phase ──
  // Covers: normal animation end, skip (Enter), and direct jump (Escape from announce)
  useEffect(() => {
    if (phase !== 'scores') return;
    const inner = innerRef.current;
    const scoresEl = scoresRef.current;
    if (!inner || !scoresEl) return;
    inner.style.transform = `translateY(${-scoresEl.offsetTop}px)`;
  }, [phase]);

  // ── Save high score ──
  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = (name || 'YOU').trim().toUpperCase().slice(0, 3) || 'YOU';
    const iso = new Date().toISOString().slice(0, 10);
    const entry = { name: trimmed, score, date: iso };
    const next = saveHighScore(entry);
    setScores(next);
    setHighlightedIndex(next.findIndex(s => s === entry));
    setSaved(true);
  }

  // ── Build grouped items for credits ──
  const sortedBinGroups = useMemo(() => {
    return BIN_ORDER
      .map(pv => {
        const bin = bins.find(b => b.placeValue === pv);
        if (!bin || !bin.unlocked) return null;
        const items = sortedItems.filter(r => r.bin === pv);
        return { bin, items };
      })
      .filter((g): g is { bin: BinState; items: SortedItemRecord[] } => g !== null && g.items.length > 0);
  }, [bins, sortedItems]);

  // ── Announce phase ──
  if (phase === 'announce') {
    const activeGroupId = (announceStep >= 0 && announceStep < announceSegments.length)
      ? announceSegments[announceStep].groupId
      : null;
    const currentLabel = activeGroupId ? announceSegments[announceStep].label : '';
    const numberStr = finalNumber.toLocaleString();

    return (
      <div className="gameover-announce-screen">
        <div className="gameover-banner">GAME OVER</div>
        <div className="gameover-number-label">Your sorting work created</div>

        <div className="announce-number-display">
          {[...numberStr].map((ch, i) => {
            const groupId = charGroupMap[i];
            if (groupId === null) {
              return (
                <span key={i} className={`announce-comma${activeGroupId !== null ? ' dim' : ''}`}>,</span>
              );
            }
            const isActive = groupId === activeGroupId;
            const isDim    = activeGroupId !== null && !isActive;
            return (
              <span
                key={i}
                className={`announce-digit${isActive ? ' active' : isDim ? ' dim' : ''}`}
              >
                {ch}
              </span>
            );
          })}
        </div>

        <div className="announce-current-label">{currentLabel || '\u00A0'}</div>

        <div className="gameover-score-line">
          Score: <span className="gameover-score-value">{score.toLocaleString()}</span>
        </div>
        <div className="gameover-hint">PRESS ENTER to skip ahead</div>
      </div>
    );
  }

  // ── Credits + Scores phases share the same viewport/inner structure ──
  return (
    <div className="gameover-credits-screen" ref={viewportRef}>
      <div className="credits-inner" ref={innerRef} style={{ position: 'relative' }}>

        {/* ── Sorted items, grouped by bin ── */}
        <div className="credits-title">ITEMS SORTED</div>
        <div className="credits-score-line">
          Final score: <span className="credits-score-value">{score.toLocaleString()}</span>
        </div>

        {sortedBinGroups.length === 0 ? (
          <div className="credits-no-items">No items sorted this game.</div>
        ) : (
          sortedBinGroups.map(({ bin, items }) => {
            const def = BIN_DEFINITIONS[bin.placeValue];
            return (
              <div key={bin.placeValue} className="credits-bin-group">
                <div
                  className="credits-bin-heading"
                  style={{ color: def.textColor, borderColor: def.textColor }}
                >
                  <span className="credits-bin-place">{def.placeLabel}</span>
                  <span className="credits-bin-name">{bin.label}</span>
                  <span className="credits-bin-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="credits-item-list">
                  {items.map((r, i) => (
                    <div key={`${r.object.id}-${i}`} className="credits-item-row">
                      <span className="credits-item-spec">{r.object.spec.toLocaleString()}</span>
                      <span className="credits-item-name">{r.object.name}</span>
                      <span className="credits-item-year">{r.object.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* ── The number formed by bin counts ── */}
        <div className="credits-number-section">
          <div className="credits-number-label">NUMBER CREATED</div>
          <div className="credits-final-number">{finalNumber.toLocaleString()}</div>
        </div>

        {/* ── High scores section — scrolls in at the end ── */}
        <div ref={scoresRef} className="credits-scores-section">
          <h1 className="scores-title">★ HIGH SCORES ★</h1>

          {score > 0 && (
            <div className="credits-your-score">
              Your score: <span style={{ color: 'var(--phosphor)' }}>{score.toLocaleString()}</span>
            </div>
          )}

          {qualifies && !saved && phase === 'scores' && (
            <form className="name-entry" onSubmit={handleSave}>
              <label>★ NEW HIGH SCORE — ENTER NAME ★</label>
              <input
                autoFocus
                maxLength={3}
                value={name}
                onChange={e => setName(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                placeholder="AAA"
              />
              <button type="submit" className="arcade-btn primary">SUBMIT</button>
            </form>
          )}

          <div className="score-table">
            {scores.map((s, i) => {
              const isPlayer = highlightedIndex === i;
              return (
                <div key={`${s.name}-${i}-${s.score}`} className={`score-row ${isPlayer ? 'highlight' : ''}`}>
                  <div className="rank">{String(i + 1).padStart(2, '0')}</div>
                  <div className="name">{s.name}</div>
                  <div className="score">{s.score.toLocaleString()}</div>
                  <div className="date">{formatDate(s.date)}</div>
                </div>
              );
            })}
          </div>

          {phase === 'scores' && (
            <div className="start-buttons" style={{ marginTop: 20 }}>
              <button className="arcade-btn primary" onClick={onPlay}>▶ PLAY AGAIN</button>
              <button className="arcade-btn" onClick={onBack}>MAIN MENU</button>
            </div>
          )}

          {phase === 'credits' && (
            <div className="credits-skip-hint">
              PRESS ENTER TO SKIP
            </div>
          )}
        </div>

        {/* Extra padding below scores so they fully enter view */}
        <div style={{ height: '40px' }} />
      </div>
    </div>
  );
}
