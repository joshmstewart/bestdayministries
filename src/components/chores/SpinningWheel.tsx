import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import defaultCoinImage from "@/assets/joycoin.png";

export interface WheelSegment {
  label: string;
  type: "coins" | "sticker_pack";
  amount: number;
  color: string;
  probability: number;
}

// Enhanced gradient definitions for wheel segments with 3D depth
const SEGMENT_GRADIENTS: Record<string, { start: string; mid: string; end: string }> = {
  // Coin gradients (warm tones) - enhanced with mid-tone for depth
  "#FFD700": { start: "hsl(48 100% 70%)", mid: "hsl(43 95% 55%)", end: "hsl(36 90% 40%)" },
  "#FFA500": { start: "hsl(38 100% 70%)", mid: "hsl(33 100% 55%)", end: "hsl(24 85% 38%)" },
  "#FF8C00": { start: "hsl(35 100% 65%)", mid: "hsl(30 100% 50%)", end: "hsl(20 90% 35%)" },
  "#DAA520": { start: "hsl(48 80% 65%)", mid: "hsl(43 74% 50%)", end: "hsl(38 80% 35%)" },
  // Sticker pack gradients (purple/lilac tones) - enhanced with richer colors
  "#9370DB": { start: "hsl(275 70% 78%)", mid: "hsl(270 60% 62%)", end: "hsl(280 55% 45%)" },
  "#8A2BE2": { start: "hsl(276 85% 72%)", mid: "hsl(271 80% 55%)", end: "hsl(281 85% 40%)" },
  "#DDA0DD": { start: "hsl(305 55% 85%)", mid: "hsl(300 47% 70%)", end: "hsl(290 50% 55%)" },
  "#BA55D3": { start: "hsl(293 70% 75%)", mid: "hsl(288 60% 58%)", end: "hsl(298 70% 42%)" },
  "#E6E6FA": { start: "hsl(245 75% 92%)", mid: "hsl(240 67% 82%)", end: "hsl(260 60% 68%)" },
  "#9932CC": { start: "hsl(285 80% 70%)", mid: "hsl(280 75% 52%)", end: "hsl(290 80% 38%)" },
};

// Fallback gradient generator based on base color
const getGradientForColor = (baseColor: string): { start: string; mid: string; end: string } => {
  if (SEGMENT_GRADIENTS[baseColor]) {
    return SEGMENT_GRADIENTS[baseColor];
  }
  // Default gradient - make it slightly lighter and darker
  return { start: baseColor, mid: baseColor, end: baseColor };
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
  const [coinImageUrl, setCoinImageUrl] = useState<string>(defaultCoinImage);
  const [packCoverUrl, setPackCoverUrl] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch custom coin image and featured pack cover
  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Fetch custom coin image
        const { data: coinData } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "custom_coin_image")
          .maybeSingle();
        
        const settingValue = coinData?.setting_value as { url?: string } | null;
        if (settingValue?.url) {
          setCoinImageUrl(settingValue.url);
        }

        // Fetch featured collection's pack cover
        const { data: featuredCollection } = await supabase
          .from('sticker_collections')
          .select('pack_image_url')
          .eq('is_active', true)
          .eq('is_featured', true)
          .maybeSingle();

        if (featuredCollection?.pack_image_url) {
          setPackCoverUrl(featuredCollection.pack_image_url);
        }
      } catch (error) {
        console.error("Failed to load wheel images:", error);
      }
    };
    fetchImages();
  }, []);

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

  // Cleanup on unmount - clear all timers and audio context
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) {
        cancelAnimationFrame(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Build exactly 16 slices with STRICT alternation: coin, pack, coin, pack...
  // This is purely visual - probabilities still control what you actually win.
  // Custom coin layout: 3×10, 3×20, 1×30, 1×50 with 30 and 50 opposite each other
  const expandedSlices = (() => {
    const TARGET_SLICES = 16;
    const sliceAngle = 360 / TARGET_SLICES;

    // Split configured segments into coins and packs
    const coinSource = segments.filter(s => s.type === 'coins');
    const packSource = segments.filter(s => s.type === 'sticker_pack');

    // If we don't have both types, fall back to simple repeat
    if (coinSource.length === 0 || packSource.length === 0) {
      const arranged: WheelSegment[] = [];
      for (let i = 0; i < TARGET_SLICES; i++) {
        arranged.push(segments[i % segments.length]);
      }
      const spreadSlices = arranged.map((segment, i) => ({
        segment,
        startAngle: i * sliceAngle,
        segmentAngle: sliceAngle
      }));
      return { slices: spreadSlices, sliceAngle, totalSlices: TARGET_SLICES };
    }

    // Find specific coin segments by amount, or create visual-only segments if missing
    const baseCoin = coinSource[0];
    const coin10 = coinSource.find(s => s.amount === 10) || { ...baseCoin, amount: 10, label: "10 Coins" };
    const coin20 = coinSource.find(s => s.amount === 20) || { ...baseCoin, amount: 20, label: "20 Coins", color: "#FFA500" };
    const coin30 = coinSource.find(s => s.amount === 30) || { ...baseCoin, amount: 30, label: "30 Coins", color: "#FF8C00" };
    const coin50 = coinSource.find(s => s.amount === 50) || { ...baseCoin, amount: 50, label: "50 Coins", color: "#DAA520" };

    // 8 coin slots at even indices (0,2,4,6,8,10,12,14)
    // Layout: 3×10, 3×20, 1×30, 1×50 spread out maximally
    // 30 at slot index 2 (visual position 4), 50 at slot index 6 (visual position 12) = 180° apart
    // Clockwise from top: 20, pack, 10, pack, 30, pack, 20, pack, 10, pack, 20, pack, 50, pack, 10, pack
    const coinLayout = [coin20, coin10, coin30, coin20, coin10, coin20, coin50, coin10];

    // 8 pack slots at odd indices - cycle through available packs
    const packLayout = Array.from({ length: 8 }, (_, i) => packSource[i % packSource.length]);

    // Build the 16-slice array alternating coin/pack
    const arranged: WheelSegment[] = [];
    for (let i = 0; i < TARGET_SLICES; i++) {
      if (i % 2 === 0) {
        // Even slot → coin from our custom layout
        arranged.push(coinLayout[i / 2]);
      } else {
        // Odd slot → pack
        arranged.push(packLayout[(i - 1) / 2]);
      }
    }

    // Dev sanity log
    console.log("[SpinningWheel] Final 16-slice layout:", arranged.map(s => `${s.type}:${s.amount}`));

    const spreadSlices = arranged.map((segment, i) => ({
      segment,
      startAngle: i * sliceAngle,
      segmentAngle: sliceAngle
    }));

    return { slices: spreadSlices, sliceAngle, totalSlices: TARGET_SLICES };
  })();

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
    
    // Find matching slices - compare by type and amount since visual segments may be synthesized
    const matchingSlices = expandedSlices.slices
      .map((slice, index) => ({ slice, index }))
      .filter(({ slice }) => 
        slice.segment.type === winningSegment.type && 
        slice.segment.amount === winningSegment.amount
      );
    
    // Fallback: if no exact match, find any slice of the same type
    const fallbackSlices = matchingSlices.length > 0 
      ? matchingSlices 
      : expandedSlices.slices
          .map((slice, index) => ({ slice, index }))
          .filter(({ slice }) => slice.segment.type === winningSegment.type);
    
    // Ultimate fallback: just pick any slice
    const slicesToUse = fallbackSlices.length > 0 ? fallbackSlices : expandedSlices.slices.map((slice, index) => ({ slice, index }));
    
    const randomSlice = slicesToUse[Math.floor(Math.random() * slicesToUse.length)];
    const { sliceAngle } = expandedSlices;

    const baseSpins = 5;
    const targetAngle = randomSlice.slice.startAngle + sliceAngle / 2;
    const wobbleRange = sliceAngle * 0.3;
    const randomOffset = (Math.random() - 0.5) * wobbleRange;
    const finalRotation = rotation + (baseSpins * 360) + (360 - targetAngle) + randomOffset;

    setIsAnimating(true);
    playSpinSounds();
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRotation(finalRotation);
      });
    });

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    spinTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      spinTimeoutRef.current = null;
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
  const innerRadius = size / 6.5; // For center hub

  const generateSegments = () => {
    const { slices, sliceAngle } = expandedSlices;
    
    return slices.map((slice, index) => {
      const { segment, startAngle: rawStartAngle } = slice;
      
      // Offset by -90 so first segment starts at top
      const startAngle = rawStartAngle - 90;
      const endAngle = startAngle + sliceAngle;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Outer arc points
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      // Inner arc points (for the donut shape)
      const ix1 = centerX + innerRadius * Math.cos(startRad);
      const iy1 = centerY + innerRadius * Math.sin(startRad);
      const ix2 = centerX + innerRadius * Math.cos(endRad);
      const iy2 = centerY + innerRadius * Math.sin(endRad);
      
      const largeArcFlag = sliceAngle > 180 ? 1 : 0;
      
      // Create donut slice path
      const pathData = `
        M ${ix1} ${iy1}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${ix2} ${iy2}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
        Z
      `;
      
      // Calculate text/icon position - in the middle of the donut
      const textAngle = startAngle + sliceAngle / 2;
      const textRad = (textAngle * Math.PI) / 180;
      const textRadius = (radius + innerRadius) / 2;
      const textX = centerX + textRadius * Math.cos(textRad);
      const textY = centerY + textRadius * Math.sin(textRad);

      // Gradient calculation
      const midAngle = startAngle + sliceAngle / 2;
      const midRad = (midAngle * Math.PI) / 180;
      const gradientId = `segment-gradient-${index}`;
      const highlightId = `segment-highlight-${index}`;
      
      // Calculate gradient direction (from center outward)
      const gradX1 = 50;
      const gradY1 = 50;
      const gradX2 = 50 + 50 * Math.cos(midRad);
      const gradY2 = 50 + 50 * Math.sin(midRad);

      const gradient = getGradientForColor(segment.color);
      
      // Calculate icon/number size - different for coins vs packs
      const availableSpace = radius - innerRadius;
      const isPackSegment = segment.type === 'sticker_pack';
      
      // Pack images are larger and positioned toward outer edge
      const packIconSize = Math.min(availableSpace * 0.55, 36);
      // Coins smaller and also toward outer edge
      const coinIconSize = Math.min(availableSpace * 0.22, 16);
      const fontSize = Math.min(availableSpace * 0.28, 16);
      
      // Position both packs and coins closer to outer edge
      const outerLabelRadius = radius - availableSpace * 0.35;
      const outerTextX = centerX + outerLabelRadius * Math.cos(textRad);
      const outerTextY = centerY + outerLabelRadius * Math.sin(textRad);
      
      // Calculate rotation for labels to face outward
      const labelRotation = textAngle + 90;
      
      return (
        <g key={index}>
          <defs>
            <linearGradient id={`segment-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient.start} />
              <stop offset="50%" stopColor={gradient.mid} />
              <stop offset="100%" stopColor={gradient.end} />
            </linearGradient>
            <linearGradient id={`segment-highlight-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
            </linearGradient>
          </defs>
          
          {/* Main slice with gradient */}
          <path
            d={pathData}
            fill={`url(#segment-gradient-${index})`}
            stroke="hsl(36 70% 35%)"
            strokeWidth="1.5"
          />
          
          {/* Highlight overlay for 3D effect */}
          <path
            d={pathData}
            fill={`url(#segment-highlight-${index})`}
            style={{ pointerEvents: "none" }}
          />
          
          {/* Inner edge highlight */}
          <path
            d={`M ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${ix2} ${iy2}`}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            style={{ pointerEvents: "none" }}
          />
          
          {/* Text/Icon group */}
          <g transform={`rotate(${labelRotation}, ${outerTextX}, ${outerTextY})`}>
            {/* For coins: show number and coin icon */}
            {!isPackSegment && (
              <>
                <text
                  x={outerTextX}
                  y={outerTextY - fontSize * 0.7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(0 0% 100%)"
                  fontSize={fontSize}
                  fontWeight="bold"
                  style={{ 
                    pointerEvents: "none",
                    textShadow: "0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)"
                  }}
                >
                  {segment.amount}
                </text>
                <image
                  href={coinImageUrl}
                  x={outerTextX - coinIconSize * 0.5}
                  y={outerTextY + coinIconSize * 0.35}
                  width={coinIconSize}
                  height={coinIconSize}
                  preserveAspectRatio="xMidYMid slice"
                  style={{ 
                    pointerEvents: "none",
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))"
                  }}
                />
              </>
            )}
            {/* For packs: just show larger pack image */}
            {isPackSegment && packCoverUrl && (
              <image
                href={packCoverUrl}
                x={outerTextX - packIconSize * 0.5}
                y={outerTextY - packIconSize * 0.5}
                width={packIconSize}
                height={packIconSize}
                preserveAspectRatio="xMidYMid slice"
                style={{ 
                  pointerEvents: "none",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                  borderRadius: '4px'
                }}
              />
            )}
          </g>
        </g>
      );
    });
  };

  const handleClick = () => {
    if (!disabled && !isAnimating && !spinning) {
      onSpinStart();
    }
  };

  const isDisabled = disabled || isAnimating || spinning;

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Ambient glow effect */}
      <div 
        className="absolute rounded-full animate-pulse pointer-events-none"
        style={{
          width: size + 60,
          height: size + 60,
          top: -30,
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, hsl(46 95% 55% / 0.25) 0%, hsl(24 85% 50% / 0.15) 40%, transparent 70%)",
          filter: "blur(12px)",
        }}
      />
      
      {/* Pointer at top */}
      <div 
        className="absolute z-20 pointer-events-none"
        style={{
          top: -14,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <svg width="40" height="36" viewBox="0 0 40 36" className="pointer-events-none">
          <defs>
            <linearGradient id="pointer-gradient-main" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="hsl(46 95% 70%)" />
              <stop offset="50%" stopColor="hsl(36 90% 55%)" />
              <stop offset="100%" stopColor="hsl(24 85% 45%)" />
            </linearGradient>
            <linearGradient id="pointer-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(0 0% 100% / 0.6)" />
              <stop offset="100%" stopColor="hsl(0 0% 100% / 0)" />
            </linearGradient>
            <filter id="pointer-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.5" />
            </filter>
          </defs>
          {/* Main pointer */}
          <polygon 
            points="20,34 4,2 36,2" 
            fill="url(#pointer-gradient-main)"
            stroke="hsl(0 0% 100%)"
            strokeWidth="2.5"
            filter="url(#pointer-shadow)"
          />
          {/* Highlight */}
          <polygon 
            points="20,28 10,6 20,4" 
            fill="url(#pointer-highlight)"
          />
        </svg>
      </div>
      
      {/* Main wheel container with premium metallic rim */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label="Spin the reward wheel"
        className={cn(
          "relative rounded-full transition-transform border-none outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          !isDisabled && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
          isDisabled && "opacity-80 cursor-not-allowed"
        )}
        style={{
          width: size + 24,
          height: size + 24,
          padding: 0,
          background: "transparent",
        }}
      >
        {/* Outer metallic rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              linear-gradient(135deg, 
                hsl(46 90% 75%) 0%, 
                hsl(36 85% 55%) 25%, 
                hsl(24 80% 40%) 50%, 
                hsl(36 85% 55%) 75%, 
                hsl(46 90% 70%) 100%
              )
            `,
            boxShadow: `
              0 12px 40px hsl(24 80% 30% / 0.5),
              0 4px 12px hsl(24 80% 30% / 0.3),
              inset 0 2px 4px hsl(0 0% 100% / 0.4),
              inset 0 -2px 4px hsl(24 80% 20% / 0.3)
            `,
          }}
        />
        
        {/* Inner metallic ring (bevel effect) */}
        <div
          className="absolute rounded-full"
          style={{
            top: 6,
            left: 6,
            right: 6,
            bottom: 6,
            background: `
              linear-gradient(180deg, 
                hsl(24 70% 35%) 0%, 
                hsl(36 80% 50%) 50%, 
                hsl(24 70% 35%) 100%
              )
            `,
            boxShadow: `
              inset 0 3px 6px hsl(0 0% 100% / 0.3),
              inset 0 -3px 6px hsl(24 80% 20% / 0.4)
            `,
          }}
        />
        
        {/* Wheel surface */}
        <div
          ref={wheelRef}
          className="absolute rounded-full overflow-hidden"
          style={{
            top: 12,
            left: 12,
            width: size,
            height: size,
            transform: `rotate(${rotation}deg)`,
            transition: isAnimating ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.15)",
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rounded-full pointer-events-none"
          >
            <defs>
              {/* Premium center hub gradients */}
              <radialGradient id="center-hub-bg" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor="hsl(46 90% 85%)" />
                <stop offset="70%" stopColor="hsl(36 85% 60%)" />
                <stop offset="100%" stopColor="hsl(24 80% 45%)" />
              </radialGradient>
              <radialGradient id="center-hub-shine" cx="30%" cy="25%" r="50%">
                <stop offset="0%" stopColor="hsl(0 0% 100% / 0.7)" />
                <stop offset="100%" stopColor="hsl(0 0% 100% / 0)" />
              </radialGradient>
              <linearGradient id="center-hub-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(46 95% 75%)" />
                <stop offset="50%" stopColor="hsl(24 85% 45%)" />
                <stop offset="100%" stopColor="hsl(46 95% 70%)" />
              </linearGradient>
            </defs>
            
            {generateSegments()}
            
            {/* Center hub - outer ring */}
            <circle
              cx={centerX}
              cy={centerY}
              r={innerRadius + 4}
              fill="url(#center-hub-ring)"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
            />
            
            {/* Center hub - main circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={innerRadius}
              fill="url(#center-hub-bg)"
              stroke="hsl(24 80% 35%)"
              strokeWidth="2"
            />
            
            {/* Center hub - shine overlay */}
            <circle
              cx={centerX}
              cy={centerY}
              r={innerRadius - 2}
              fill="url(#center-hub-shine)"
            />
            
            {/* Center emoji */}
            <text
              x={centerX}
              y={centerY}
              fontSize={innerRadius * 0.9}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))" }}
            >
              🎁
            </text>
          </svg>
        </div>
      </button>
    </div>
  );
}
