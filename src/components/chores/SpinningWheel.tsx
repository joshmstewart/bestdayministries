import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface WheelSegment {
  label: string;
  type: "coins" | "sticker_pack";
  amount: number;
  color: string;
  probability: number;
}

// Gradient definitions for wheel segments
const SEGMENT_GRADIENTS: Record<string, { start: string; end: string }> = {
  // Coin gradients (warm tones)
  "#FFD700": { start: "hsl(46 95% 60%)", end: "hsl(36 95% 45%)" }, // Gold
  "#FFA500": { start: "hsl(33 100% 60%)", end: "hsl(24 85% 45%)" }, // Orange
  "#FF8C00": { start: "hsl(30 100% 55%)", end: "hsl(20 90% 40%)" }, // Dark Orange
  "#DAA520": { start: "hsl(43 74% 55%)", end: "hsl(38 80% 40%)" }, // Goldenrod
  // Sticker pack gradients (purple/lilac tones)
  "#9370DB": { start: "hsl(270 60% 70%)", end: "hsl(280 60% 50%)" }, // Medium Purple
  "#8A2BE2": { start: "hsl(271 80% 60%)", end: "hsl(281 85% 45%)" }, // Blue Violet
  "#DDA0DD": { start: "hsl(300 47% 80%)", end: "hsl(290 50% 60%)" }, // Plum/Lilac
  "#BA55D3": { start: "hsl(288 60% 65%)", end: "hsl(298 70% 45%)" }, // Medium Orchid
  "#E6E6FA": { start: "hsl(240 67% 94%)", end: "hsl(260 60% 75%)" }, // Lavender
  "#9932CC": { start: "hsl(280 75% 60%)", end: "hsl(290 80% 40%)" }, // Dark Orchid
};

// Fallback gradient generator based on base color
const getGradientForColor = (baseColor: string): { start: string; end: string } => {
  if (SEGMENT_GRADIENTS[baseColor]) {
    return SEGMENT_GRADIENTS[baseColor];
  }
  // Default gradient - make it slightly lighter and darker
  return { start: baseColor, end: baseColor };
};

// Create a click/tick sound using Web Audio API
const createTickSound = (audioContext: AudioContext, volume: number = 0.3) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800 + Math.random() * 200;
  oscillator.type = "square";
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.05);
};

// Cubic bezier easing function
const cubicBezier = (t: number): number => {
  const p1x = 0.17, p1y = 0.67, p2x = 0.12, p2y = 0.99;
  
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  
  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  
  let guessT = t;
  for (let i = 0; i < 4; i++) {
    const currentX = sampleCurveX(guessT) - t;
    if (Math.abs(currentX) < 0.001) break;
    const derivative = (3 * ax * guessT + 2 * bx) * guessT + cx;
    if (Math.abs(derivative) < 0.000001) break;
    guessT -= currentX / derivative;
  }
  
  return sampleCurveY(guessT);
};

interface SpinningWheelProps {
  segments: WheelSegment[];
  onSpinEnd: (segment: WheelSegment) => void;
  spinning: boolean;
  onSpinStart: () => void;
  disabled?: boolean;
  size?: number;
  clickSoundUrl?: string;
  clickSoundVolume?: number;
}

export function SpinningWheel({
  segments,
  onSpinEnd,
  spinning,
  onSpinStart,
  disabled = false,
  size = 300,
  clickSoundUrl,
  clickSoundVolume = 0.3,
}: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);

  const getAudioFromPool = useCallback(() => {
    if (!clickSoundUrl) return null;
    
    let audio = audioPoolRef.current.find(a => a.paused || a.ended);
    
    if (!audio) {
      audio = new Audio(clickSoundUrl);
      audio.volume = clickSoundVolume;
      audioPoolRef.current.push(audio);
    }
    
    return audio;
  }, [clickSoundUrl, clickSoundVolume]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSpinSounds = useCallback(() => {
    const duration = 4000;
    const startTime = Date.now();
    let lastTickTime = 0;
    
    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        if (tickIntervalRef.current) {
          cancelAnimationFrame(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        return;
      }
      
      const progress = elapsed / duration;
      const easedProgress = cubicBezier(progress);
      const velocity = 1 - easedProgress;
      
      const minInterval = 30;
      const maxInterval = 300;
      const interval = minInterval + (maxInterval - minInterval) * (1 - velocity);
      
      if (elapsed - lastTickTime >= interval) {
        if (clickSoundUrl) {
          const audio = getAudioFromPool();
          if (audio) {
            audio.currentTime = 0;
            audio.volume = clickSoundVolume * (0.5 + velocity * 0.5);
            audio.play().catch(() => {});
          }
        } else {
          const audioContext = getAudioContext();
          createTickSound(audioContext, 0.15 + velocity * 0.2);
        }
        lastTickTime = elapsed;
      }
      
      tickIntervalRef.current = requestAnimationFrame(tick);
    };
    
    tickIntervalRef.current = requestAnimationFrame(tick);
  }, [clickSoundUrl, clickSoundVolume, getAudioFromPool, getAudioContext]);

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) {
        cancelAnimationFrame(tickIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const selectSegment = (): WheelSegment => {
    const random = Math.random();
    let cumulative = 0;
    for (const segment of segments) {
      cumulative += segment.probability;
      if (random <= cumulative) {
        return segment;
      }
    }
    return segments[segments.length - 1];
  };

  const spin = () => {
    if (isAnimating) return;

    const winningSegment = selectSegment();
    const winningIndex = segments.indexOf(winningSegment);

    const segmentAngle = 360 / segments.length;
    const baseSpins = 5;
    const targetSegmentAngle = winningIndex * segmentAngle;
    const offset = segmentAngle / 2;
    const finalRotation = rotation + (baseSpins * 360) + (360 - targetSegmentAngle) - offset + (Math.random() * 20 - 10);

    setIsAnimating(true);
    playSpinSounds();
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRotation(finalRotation);
      });
    });

    setTimeout(() => {
      setIsAnimating(false);
      onSpinEnd(winningSegment);
    }, 4000);
  };

  useEffect(() => {
    if (spinning && !isAnimating) {
      spin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;

  const generateSegments = () => {
    const segmentAngle = 360 / segments.length;
    
    return segments.map((segment, index) => {
      const startAngle = index * segmentAngle - 90;
      const endAngle = startAngle + segmentAngle;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArcFlag = segmentAngle > 180 ? 1 : 0;
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      // Calculate text position
      const textAngle = startAngle + segmentAngle / 2;
      const textRad = (textAngle * Math.PI) / 180;
      const textRadius = radius * 0.65;
      const textX = centerX + textRadius * Math.cos(textRad);
      const textY = centerY + textRadius * Math.sin(textRad);

      // Gradient calculation
      const midAngle = startAngle + segmentAngle / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const gradientId = `segment-gradient-${index}`;
      
      // Calculate gradient direction (from center outward)
      const gradX1 = 50;
      const gradY1 = 50;
      const gradX2 = 50 + 50 * Math.cos(midRad);
      const gradY2 = 50 + 50 * Math.sin(midRad);

      const gradient = getGradientForColor(segment.color);
      
      return (
        <g key={index}>
          <defs>
            <linearGradient
              id={gradientId}
              x1={`${gradX1}%`}
              y1={`${gradY1}%`}
              x2={`${gradX2}%`}
              y2={`${gradY2}%`}
            >
              <stop offset="0%" stopColor={gradient.start} />
              <stop offset="100%" stopColor={gradient.end} />
            </linearGradient>
          </defs>
          <path
            d={pathData}
            fill={`url(#${gradientId})`}
            stroke="hsl(0 0% 100% / 0.9)"
            strokeWidth="3"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
            }}
          />
          <text
            x={textX}
            y={textY}
            fill="#fff"
            fontSize={size / 20}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
            style={{ 
              textShadow: "1px 1px 3px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)",
              pointerEvents: "none"
            }}
          >
            {segment.label}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Decorative outer glow ring */}
      <div 
        className="absolute rounded-full animate-pulse"
        style={{
          width: size + 24,
          height: size + 24,
          top: -12,
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, hsl(46 95% 55% / 0.3) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      
      {/* Pointer at top */}
      <div 
        className="absolute z-10"
        style={{
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <svg width="36" height="32" viewBox="0 0 36 32">
          <defs>
            <linearGradient id="pointer-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="hsl(24 85% 60%)" />
              <stop offset="100%" stopColor="hsl(24 95% 45%)" />
            </linearGradient>
            <filter id="pointer-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          <polygon 
            points="18,30 4,0 32,0" 
            fill="url(#pointer-gradient)"
            stroke="hsl(0 0% 100%)"
            strokeWidth="2"
            filter="url(#pointer-shadow)"
          />
        </svg>
      </div>
      
      {/* Wheel container with decorative border */}
      <div
        className="relative rounded-full"
        style={{
          width: size + 12,
          height: size + 12,
          padding: 6,
          background: "linear-gradient(135deg, hsl(46 95% 60%) 0%, hsl(24 85% 50%) 50%, hsl(46 95% 55%) 100%)",
          boxShadow: "0 8px 32px hsl(24 85% 40% / 0.4), inset 0 2px 4px hsl(0 0% 100% / 0.3)",
        }}
      >
        <div
          ref={wheelRef}
          className={cn(
            "relative rounded-full overflow-hidden",
            isAnimating && "cursor-not-allowed"
          )}
          style={{
            width: size,
            height: size,
            transform: `rotate(${rotation}deg)`,
            transition: isAnimating ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.1)",
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rounded-full"
          >
            {generateSegments()}
            {/* Center circle with gradient */}
            <defs>
              <radialGradient id="center-gradient" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="hsl(0 0% 100%)" />
                <stop offset="100%" stopColor="hsl(46 35% 96%)" />
              </radialGradient>
              <linearGradient id="center-border" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(46 95% 60%)" />
                <stop offset="100%" stopColor="hsl(24 85% 50%)" />
              </linearGradient>
            </defs>
            <circle
              cx={centerX}
              cy={centerY}
              r={size / 8}
              fill="url(#center-gradient)"
              stroke="url(#center-border)"
              strokeWidth="4"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
            />
            <text
              x={centerX}
              y={centerY}
              fontSize={size / 12}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              🎁
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
