import { useEffect, useRef, useState } from 'react';
import type { BinState, PlaceValueBin } from '../game/types';
import { BIN_DEFINITIONS } from '../game/constants';
import { speakLuckyNumber } from '../game/audio';

interface Props {
  score: number;
  bins: BinState[];
  onContinue: () => void;
}

// Place-value multipliers for computing the lucky number
const PLACE_VALUE_MULTIPLIERS: Record<PlaceValueBin, number> = {
  ones:               1,
  tens:               10,
  hundreds:           100,
  thousands:          1_000,
  'ten-thousands':    10_000,
  'hundred-thousands':100_000,
  millions:           1_000_000,
};

// Display order for credits: small → large (ones first, millions last — builds to a climax)
const CREDIT_ORDER: PlaceValueBin[] = [
  'ones', 'tens', 'hundreds', 'thousands',
  'ten-thousands', 'hundred-thousands', 'millions',
];

function computeLuckyNumber(bins: BinState[]): number {
  return bins.reduce((sum, b) => sum + b.count * PLACE_VALUE_MULTIPLIERS[b.placeValue], 0);
}

export default function CreditsScreen({ score, bins, onContinue }: Props) {
  const luckyNumber = computeLuckyNumber(bins);
  const contentRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'reveal' | 'scroll'>('reveal');
  const [scrollDuration, setScrollDuration] = useState(30);

  // Speak the lucky number immediately on mount
  useEffect(() => {
    speakLuckyNumber(luckyNumber);
  }, [luckyNumber]);

  // After 3.5 s reveal phase, kick off the credits scroll
  useEffect(() => {
    const t = setTimeout(() => {
      if (contentRef.current) {
        // Speed: ~55 px/s — short lists finish fast, long lists take longer
        const height = contentRef.current.scrollHeight + window.innerHeight;
        setScrollDuration(Math.max(12, height / 55));
      }
      setPhase('scroll');
    }, 3500);
    return () => clearTimeout(t);
  }, []);

  // Any key or click → advance immediately
  useEffect(() => {
    const advance = () => onContinue();
    window.addEventListener('keydown', advance);
    return () => window.removeEventListener('keydown', advance);
  }, [onContinue]);

  // Bins that have at least one correctly sorted item, in credit display order
  const activeBins = CREDIT_ORDER
    .map(pv => bins.find(b => b.placeValue === pv))
    .filter((b): b is BinState => !!b && b.sortedItems.length > 0);

  const totalSorted = bins.reduce((n, b) => n + b.sortedItems.length, 0);

  return (
    <div className="credits-screen" onClick={onContinue}>

      {/* ── Reveal phase: lucky number shown centre-screen ── */}
      {phase === 'reveal' && (
        <div className="credits-reveal">
          <div className="credits-reveal-label">YOUR LUCKY NUMBER</div>
          <div className="credits-reveal-number">{luckyNumber.toLocaleString()}</div>
          <div className="credits-reveal-sub">
            formed by sorting {totalSorted} item{totalSorted !== 1 ? 's' : ''} across {activeBins.length} bin{activeBins.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Scroll phase: movie-credits roll ── */}
      {phase === 'scroll' && (
        <div className="credits-viewport">
          <div
            ref={contentRef}
            className="credits-roll"
            style={{ animationDuration: `${scrollDuration}s` }}
            onAnimationEnd={onContinue}
          >
            {/* Opening title card */}
            <div className="credits-title-card">
              <div className="credits-title-heading">YOUR LUCKY SORTING NUMBER</div>
              <div className="credits-title-number">{luckyNumber.toLocaleString()}</div>
              <div className="credits-title-score">
                Final Score: <span>{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="credits-divider">✦ ✦ ✦</div>
            <div className="credits-section-intro">ITEMS SORTED BY PLACE VALUE</div>
            <div className="credits-divider">· · ·</div>

            {/* One section per active bin */}
            {activeBins.map(b => {
              const def = BIN_DEFINITIONS[b.placeValue];
              return (
                <div key={b.placeValue} className="credits-bin-group">
                  <div
                    className="credits-bin-header"
                    style={{ color: def.textColor, textShadow: `0 0 10px ${def.textColor}` }}
                  >
                    {def.label.toUpperCase()}
                    <span className="credits-bin-range"> ({def.range})</span>
                  </div>
                  <div className="credits-items">
                    {b.sortedItems.map((item, i) => (
                      <div key={`${item.id}-${i}`} className="credits-item">
                        <span className="credits-item-name">{item.name}</span>
                        <span className="credits-item-year">({item.year})</span>
                        <span className="credits-item-spec">{item.specLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Empty-game fallback */}
            {activeBins.length === 0 && (
              <div className="credits-empty">No items sorted this run.</div>
            )}

            <div className="credits-divider">✦ ✦ ✦</div>
            <div className="credits-fin">— THANKS FOR PLAYING —</div>
            <div className="credits-spacer" />
          </div>
        </div>
      )}

      {/* Skip hint */}
      <div className="credits-skip">PRESS ANY KEY TO CONTINUE</div>
    </div>
  );
}
