import React, { useRef, useEffect, useMemo } from 'react';

/* ═══════════════════════════════════════════════════
   House Silhouette SVG Paths
   ═══════════════════════════════════════════════════ */

const Bungalow = () => (
  <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M10 90 L100 10 L190 90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
    <path d="M140 40 L140 15 L155 15 L155 55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M147 12 Q150 5 147 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />
    <path d="M25 90 L25 148 L175 148 L175 90" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M85 148 L85 105 L115 105 L115 148" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.45" />
    <circle cx="108" cy="128" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M38 100 L38 130 L68 130 L68 100 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M53 100 L53 130" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path d="M38 115 L68 115" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path d="M132 100 L132 130 L162 130 L162 100 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M147 100 L147 130" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path d="M132 115 L162 115" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path d="M15 148 L185 148" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    <path d="M30 148 Q40 135 50 148" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
    <path d="M150 148 Q160 135 170 148" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
  </svg>
);

const Apartment = () => (
  <svg viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M15 15 L15 190 L145 190 L145 15 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M10 15 L150 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    <path d="M80 15 L80 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    <path d="M72 4 L88 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    {[30, 65, 100].map((x, i) => (
      <g key={i}>
        <path d={`M${x} 30 L${x} 60 L${x + 25} 60 L${x + 25} 30 Z`} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.4" />
        <path d={`M${x + 12.5} 30 L${x + 12.5} 60`} stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
        <path d={`M${x} 45 L${x + 25} 45`} stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      </g>
    ))}
    {[30, 65, 100].map((x, i) => (
      <g key={i + 3}>
        <path d={`M${x} 75 L${x} 105 L${x + 25} 105 L${x + 25} 75 Z`} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.4" />
        <path d={`M${x + 12.5} 75 L${x + 12.5} 105`} stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
        <path d={`M${x} 90 L${x + 25} 90`} stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      </g>
    ))}
    {[30, 65, 100].map((x, i) => (
      <g key={i + 6}>
        <path d={`M${x} 120 L${x} 150 L${x + 25} 150 L${x + 25} 120 Z`} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.4" />
        <path d={`M${x + 12.5} 120 L${x + 12.5} 150`} stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
        <path d={`M${x} 135 L${x + 25} 135`} stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      </g>
    ))}
    <path d="M60 190 L60 158 L100 158 L100 190" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.45" />
    <path d="M5 190 L155 190" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
  </svg>
);

const ModernHouse = () => (
  <svg viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M10 50 L10 140 L170 140 L170 50" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M5 50 L175 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    <path d="M50 50 L50 20 L130 20 L130 50" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.45" />
    <path d="M45 20 L135 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    <path d="M85 65 L85 125 L155 125 L155 65 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M120 65 L120 125" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path d="M85 95 L155 95" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path d="M20 70 L20 100 L45 100 L45 70 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M32.5 70 L32.5 100" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    <path d="M20 140 L20 110 L50 110 L50 140" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.45" />
    <path d="M60 28 L60 46 L110 46 L110 28 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M85 28 L85 46" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    <path d="M60 37 L110 37" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    <path d="M5 140 L175 140" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
  </svg>
);

const Townhouse = () => (
  <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M10 40 L10 148 L75 148 L75 40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.45" />
    <path d="M10 40 L42.5 10 L75 40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M25 148 L25 100 L48 100 L48 148" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M55 45 L55 75 L70 75 L70 45 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M18 48 L18 72 L33 72 L33 48 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M85 40 L85 148 L150 148 L150 40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.45" />
    <path d="M85 40 L117.5 10 L150 40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M100 148 L100 100 L123 100 L123 148" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M130 45 L130 75 L145 75 L145 45 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M93 48 L93 72 L108 72 L108 48 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M160 40 L160 148 L225 148 L225 40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.45" />
    <path d="M160 40 L192.5 10 L225 40" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M175 148 L175 100 L198 100 L198 148" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M205 45 L205 75 L220 75 L220 45 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M168 48 L168 72 L183 72 L183 48 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M5 148 L230 148" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
  </svg>
);

/* ─── Additional House Variants ─── */

const Cottage = () => (
  <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M5 100 L100 5 L195 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.55" />
    <path d="M30 100 L30 142 L170 142 L170 100" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.45" />
    <circle cx="100" cy="55" r="12" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.35" />
    <path d="M65 142 L65 108 L90 108 L90 142" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M120 108 L120 142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
    <path d="M15 142 L185 142" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    <path d="M20 142 Q30 130 40 142 Q50 130 60 142" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.25" />
    <path d="M140 142 Q150 130 160 142 Q170 130 180 142" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.25" />
  </svg>
);

const Mansion = () => (
  <svg viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M5 140 L5 50 L130 5 L255 50 L255 140" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="none" opacity="0.5" />
    <path d="M130 5 L130 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    <path d="M115 20 L145 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    <path d="M45 140 L45 85 L90 85 L90 140" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M170 140 L170 85 L215 85 L215 140" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.4" />
    <path d="M100 40 L100 70 L160 70 L160 40 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" opacity="0.35" />
    <path d="M130 40 L130 70" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    <path d="M100 55 L160 55" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    <path d="M10 140 L105 140" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
    <path d="M155 140 L250 140" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
    <path d="M0 140 L260 140" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
    <path d="M130 140 L130 120 L140 120 L140 140" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.4" />
  </svg>
);

const Tree = () => (
  <svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M30 95 L30 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
    <path d="M30 60 Q15 55 10 40 Q5 25 15 20 Q20 10 30 15 Q40 10 45 20 Q55 25 50 40 Q45 55 30 60" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3" />
  </svg>
);

/* ─── House Shape Selector ─── */

const HOUSE_VARIANTS = ['bungalow', 'apartment', 'modern', 'townhouse', 'cottage', 'mansion'] as const;
type HouseVariant = typeof HOUSE_VARIANTS[number];

const HouseShapes: Record<string, React.FC> = {
  bungalow: Bungalow,
  apartment: Apartment,
  modern: ModernHouse,
  townhouse: Townhouse,
  cottage: Cottage,
  mansion: Mansion,
};

const HouseShape = React.memo<{ variant: string }>(({ variant }) => {
  const Comp = HouseShapes[variant] || Bungalow;
  return <Comp />;
});

/* ═══════════════════════════════════════════════════
   Particle System Engine — Ref-based (no React re-renders)
   ═══════════════════════════════════════════════════ */

const HOUSE_VARIANT_KEYS = Object.keys(HouseShapes);

interface DriftHouse {
  variant: string;
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  phase: number;
  amplitude: number;
  color: string;
  el: HTMLDivElement | null;
}

function createRandomHouse(): DriftHouse {
  return {
    variant: HOUSE_VARIANT_KEYS[Math.floor(Math.random() * HOUSE_VARIANT_KEYS.length)],
    x: Math.random() * 110 - 5,
    y: 5 + Math.random() * 85,
    size: 40 + Math.random() * 160,
    speed: 20 + Math.random() * 60, // px/s
    rotation: (Math.random() - 0.5) * 6,
    phase: Math.random() * Math.PI * 2,
    amplitude: 4 + Math.random() * 8,
    color: ['#1E6B4A', '#0A4D2E', '#065F46', '#2D8B57', '#34D399'][Math.floor(Math.random() * 5)],
    el: null,
  };
}

function randomizeHouse(h: DriftHouse): DriftHouse {
  h.variant = HOUSE_VARIANT_KEYS[Math.floor(Math.random() * HOUSE_VARIANT_KEYS.length)];
  h.y = 5 + Math.random() * 85;
  h.size = 40 + Math.random() * 160;
  h.speed = 20 + Math.random() * 60;
  h.rotation = (Math.random() - 0.5) * 6;
  h.phase = Math.random() * Math.PI * 2;
  h.amplitude = 4 + Math.random() * 8;
  h.color = ['#1E6B4A', '#0A4D2E', '#065F46', '#2D8B57', '#34D399'][Math.floor(Math.random() * 5)];
  return h;
}

/* ═══════════════════════════════════════════════════
   Single House Silhouette (for explicit placement)
   ═══════════════════════════════════════════════════ */

function useParallaxHouse(parallaxFactor: number, phase: number, noDrift: boolean) {
  const innerRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());
  const factorRef = useRef(parallaxFactor);
  const phaseRef = useRef(phase);
  const noDriftRef = useRef(noDrift);
  factorRef.current = parallaxFactor;
  phaseRef.current = phase;
  noDriftRef.current = noDrift;

  useEffect(() => {
    startTime.current = Date.now();
    let rafId: number;
    const animate = () => {
      const el = innerRef.current;
      if (el) {
        if (noDriftRef.current) {
          el.style.transform = '';
        } else {
          const elapsed = (Date.now() - startTime.current) / 1000;
          const bob = Math.sin(elapsed * 0.42 + phaseRef.current) * 6;
          const parallax = window.scrollY * factorRef.current;
          el.style.transform = `translateY(${bob + parallax}px)`;
        }
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return innerRef;
}

/* ─── Background Decorations ─── */

interface HouseBgProps {
  variant?: string;
  opacity?: number;
  color?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center-right' | 'center-left';
  width?: string | number;
  blur?: boolean;
  noDrift?: boolean;
  parallaxFactor?: number;
  phase?: number;
}

const ParallaxFactors = [0.035, 0.07, 0.025, 0.055, 0.045] as const;
const Phases = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, Math.PI * 0.3] as const;

function getPositionStyle(position: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'top-left': { top: '0', left: '0' },
    'top-right': { top: '0', right: '0' },
    'bottom-left': { bottom: '0', left: '0' },
    'bottom-right': { bottom: '0', right: '0' },
    'center-right': { top: '50%', right: '0', transform: 'translateY(-50%)' },
    'center-left': { top: '50%', left: '0', transform: 'translateY(-50%)' },
  };
  return map[position] || { bottom: '0', right: '0' };
}

/** A single decorative house silhouette */
export const HouseSilhouette: React.FC<HouseBgProps> = ({
  variant = 'bungalow',
  opacity = 0.08,
  color = '#1E6B4A',
  position = 'bottom-right',
  width = 200,
  blur = false,
  noDrift = false,
  parallaxFactor = 0.03,
  phase = 0,
}) => {
  const innerRef = useParallaxHouse(parallaxFactor, phase, noDrift);
  const w = typeof width === 'number' ? `${width}px` : width;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', ...getPositionStyle(position), width: w, height: `calc(${w} * 0.8)`, pointerEvents: 'none', userSelect: 'none', zIndex: 0, opacity, color, filter: blur ? 'blur(3px)' : 'none' }}>
      <div ref={innerRef} style={{ width: '100%', height: '100%' }}>
        <HouseShape variant={variant} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   LIVE ANIMATED BACKGROUND — Ref-based Particle System
   ═══════════════════════════════════════════════════ */

export const HouseBackgrounds: React.FC<{
  opacity?: number;
  color?: string;
  blur?: boolean;
  noDrift?: boolean;
  density?: 'low' | 'medium' | 'high';
  sky?: boolean;
  ground?: boolean;
}> = ({ opacity = 0.06, color, blur = false, density = 'medium', sky = true, ground = true }) => {
  const houseCount = density === 'low' ? 6 : density === 'high' ? 16 : 10;

  // Create house data once (ref-based, no state)
  const housesRef = useRef<DriftHouse[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Lazy init houses
  if (housesRef.current.length === 0) {
    for (let i = 0; i < houseCount; i++) {
      housesRef.current.push(createRandomHouse());
    }
  }

  // Generate sky particles as stable data for CSS animation (no JS needed)
  const skyParticles = useMemo(() => {
    const arr: { x: number; y: number; size: number; delay: number; duration: number }[] = [];
    for (let i = 0; i < 50; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
      });
    }
    return arr;
  }, []);

  // Store house refs for direct DOM access
  const houseElRefs = useRef<(HTMLDivElement | null)[]>([]);      // Main animation loop — updates DOM directly, no state changes
  useEffect(() => {
    const houses = housesRef.current;
    lastTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const dt = Math.min(now - lastTimeRef.current, 50);
      lastTimeRef.current = now;

      for (let i = 0; i < houses.length; i++) {
        const h = houses[i];
        const el = houseElRefs.current[i];
        if (!el) continue;

        // Horizontal drift — speed adjusts inversely to size
        h.x += (h.speed * dt) / 1000 / (h.size / 100 + 0.5);

        if (h.x > 115) {
          h.x = -15;
          randomizeHouse(h);
          // Update inline style for the new randomized size/color
          el.style.width = `${h.size}px`;
          el.style.height = `${h.size * 0.8}px`;
          el.style.color = h.color;
        }

        // Only update horizontal position each frame (vertical float via CSS anim)
        el.style.transform = `translateX(${h.x}%) rotate(${h.rotation}deg)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Track house elements
  const setHouseEl = (i: number) => (el: HTMLDivElement | null) => {
    houseElRefs.current[i] = el;
  };

  const globalOpacity = opacity / 0.06;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Sky particles (CSS-only twinkling, no JS overhead) */}
      {sky && skyParticles.map((p, i) => (
        <div
          key={`sky-${i}`}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: color || '#1E6B4A',
            opacity: 0.2,
            animation: `pulse ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Drifting houses — ref-based DOM manipulation for position */}
      {housesRef.current.map((h, i) => (
        <div
          key={i}
          ref={setHouseEl(i)}
          style={{
            position: 'absolute',
            left: '0',
            top: `${h.y}%`,
            width: `${h.size}px`,
            height: `${h.size * 0.8}px`,
            opacity: Math.min(globalOpacity * 0.06, 0.12),
            color: color || h.color,
            filter: blur ? 'blur(2px)' : 'none',
            transform: `translateX(${h.x}%) rotate(${h.rotation}deg)`,
            willChange: 'transform, opacity',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              animation: `houseFloat${i % 3} ${5 + (i % 5) * 2}s ease-in-out infinite`,
              animationDelay: `${h.phase}s`,
            }}
          >
            <HouseShape variant={h.variant} />
          </div>
        </div>
      ))}

      {/* Ground trees */}
      {ground && (
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '18%',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
            padding: '0 5%',
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div
              key={`tree-${i}`}
              style={{
                width: `${20 + (i * 3) % 30}px`,
                height: `${50 + (i * 7) % 40}px`,
                opacity: 0.02 * globalOpacity,
                color: color || '#1E6B4A',
                transform: `scaleX(${i % 2 === 0 ? 1 : -1})`,
              }}
            >
              <Tree />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Smaller Decoration (for simple pages)
   ═══════════════════════════════════════════════════ */

export const HouseDecoration: React.FC<{
  variant?: string;
  opacity?: number;
  color?: string;
  blur?: boolean;
  width?: number;
  noDrift?: boolean;
}> = ({
  variant = 'bungalow',
  opacity = 0.07,
  color = '#1E6B4A',
  blur = false,
  width = 160,
  noDrift = false,
}) => (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
    <HouseSilhouette variant={variant} opacity={opacity} color={color} position="bottom-left" width={width} blur={blur} noDrift={noDrift} parallaxFactor={ParallaxFactors[0]} phase={Phases[0]} />
    <HouseSilhouette variant={variant === 'bungalow' ? 'apartment' : 'bungalow'} opacity={opacity * 0.7} color={color} position="top-right" width={width * 0.65} blur={blur} noDrift={noDrift} parallaxFactor={ParallaxFactors[3]} phase={Phases[3]} />
  </div>
);

export default HouseBackgrounds;
