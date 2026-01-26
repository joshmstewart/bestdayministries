import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface WheelSegment {
  label: string;
  type: "coins" | "sticker_pack";
  amount: number;
  color: string;
  probability: number;
}

interface SpinningWheelProps {
  segments: WheelSegment[];
  onSpinEnd: (segment: WheelSegment) => void;
  spinning: boolean;
  onSpinStart: () => void;
  disabled?: boolean;
  size?: number;
}

export function SpinningWheel({
  segments,
  onSpinEnd,
  spinning,
  onSpinStart,
  disabled = false,
  size = 300,
}: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Select a segment based on probability
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
    if (isAnimating || disabled) return;

    // Select the winning segment first
    const winningSegment = selectSegment();
    const winningIndex = segments.indexOf(winningSegment);

    // Calculate segment angle
    const segmentAngle = 360 / segments.length;
    
    // Calculate target angle - we want the segment to land at the top (pointer position)
    const baseSpins = 5; // Number of full rotations for effect
    const targetSegmentAngle = winningIndex * segmentAngle;
    
    // Offset by half a segment to center it under the pointer
    const offset = segmentAngle / 2;
    
    // Calculate final rotation (clockwise)
    const finalRotation = rotation + (baseSpins * 360) + (360 - targetSegmentAngle) - offset + (Math.random() * 20 - 10);

    // Enable animation state first
    setIsAnimating(true);
    
    // Use requestAnimationFrame to ensure the transition is set before rotation changes
    // This prevents React from batching both state updates into one render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRotation(finalRotation);
      });
    });

    // End animation after spin completes
    setTimeout(() => {
      setIsAnimating(false);
      onSpinEnd(winningSegment);
    }, 4000);
  };

  // Trigger spin when spinning prop becomes true
  useEffect(() => {
    if (spinning && !isAnimating) {
      spin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;

  // Generate wheel segments as SVG paths
  const generateSegments = () => {
    const segmentAngle = 360 / segments.length;
    
    return segments.map((segment, index) => {
      const startAngle = index * segmentAngle - 90; // Start from top
      const endAngle = startAngle + segmentAngle;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArcFlag = segmentAngle > 180 ? 1 : 0;
      
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      // Calculate text position (middle of segment arc)
      const textAngle = startAngle + segmentAngle / 2;
      const textRad = (textAngle * Math.PI) / 180;
      const textRadius = radius * 0.65;
      const textX = centerX + textRadius * Math.cos(textRad);
      const textY = centerY + textRadius * Math.sin(textRad);
      
      return (
        <g key={index}>
          <path
            d={pathData}
            fill={segment.color}
            stroke="#fff"
            strokeWidth="2"
          />
          <text
            x={textX}
            y={textY}
            fill="#fff"
            fontSize={size / 22}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
            style={{ 
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
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
      {/* Pointer at top */}
      <div 
        className="absolute z-10 w-0 h-0"
        style={{
          top: -8,
          left: "50%",
          transform: "translateX(-50%)",
          borderLeft: "15px solid transparent",
          borderRight: "15px solid transparent",
          borderTop: "25px solid hsl(var(--primary))",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
        }}
      />
      
      {/* Wheel container */}
      <div
        ref={wheelRef}
        className={cn(
          "relative rounded-full shadow-2xl",
          isAnimating && "cursor-not-allowed"
        )}
        style={{
          width: size,
          height: size,
          transform: `rotate(${rotation}deg)`,
          transition: isAnimating ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rounded-full"
        >
          {/* Outer ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius - 2}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
          />
          {generateSegments()}
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={size / 10}
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
          />
          <text
            x={centerX}
            y={centerY}
            fill="hsl(var(--foreground))"
            fontSize={size / 15}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            🎯
          </text>
        </svg>
      </div>
    </div>
  );
}
