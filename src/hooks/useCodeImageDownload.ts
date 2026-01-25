import { useCallback } from "react";
import { getPictureById, PICTURE_PASSWORD_IMAGES } from "@/lib/picturePasswordImages";

export function useCodeImageDownload() {
  // Download picture password as image
  const downloadPictureCode = useCallback(async (sequence: string[], userName?: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cardSize = 120;
    const gap = 20;
    const padding = 40;
    const titleHeight = 60;
    const labelHeight = 30;
    
    canvas.width = padding * 2 + cardSize * 4 + gap * 3;
    canvas.height = padding * 2 + titleHeight + cardSize + labelHeight;

    // Background
    ctx.fillStyle = "#FFF8F0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = "#8B4513";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    const title = userName ? `${userName}'s Picture Code` : "My Picture Code";
    ctx.fillText(title, canvas.width / 2, padding + 30);

    // Draw each picture card
    for (let i = 0; i < sequence.length; i++) {
      const picture = getPictureById(sequence[i]);
      if (!picture) continue;

      const x = padding + i * (cardSize + gap);
      const y = padding + titleHeight;

      // Card background
      ctx.fillStyle = "#FEF3E2";
      ctx.strokeStyle = "#E87800";
      ctx.lineWidth = 3;
      roundRect(ctx, x, y, cardSize, cardSize, 16);
      ctx.fill();
      ctx.stroke();

      // Number badge
      ctx.fillStyle = "#E87800";
      ctx.beginPath();
      ctx.arc(x + cardSize - 10, y + 10, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + cardSize - 10, y + 10);

      // Icon emoji/text (use name as fallback since we can't render Lucide icons to canvas easily)
      ctx.fillStyle = getColorFromTailwind(picture.color);
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(getEmojiForPicture(picture.id), x + cardSize / 2, y + cardSize / 2);

      // Label
      ctx.fillStyle = "#666666";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(picture.name, x + cardSize / 2, y + cardSize + 8);
    }

    // Download
    const link = document.createElement("a");
    link.download = "picture-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // Download friend code as image
  const downloadFriendCode = useCallback((friendCode: string, userName?: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 60;
    const emojiSize = 80;
    
    canvas.width = 400;
    canvas.height = 200;

    // Background
    ctx.fillStyle = "#FFF8F0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = "#E87800";
    ctx.lineWidth = 4;
    roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 20);
    ctx.stroke();

    // Title
    ctx.fillStyle = "#8B4513";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    const title = userName ? `${userName}'s Friend Code` : "My Friend Code";
    ctx.fillText(title, canvas.width / 2, 50);

    // Emojis
    ctx.font = `${emojiSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(friendCode, canvas.width / 2, 115);

    // Subtitle
    ctx.fillStyle = "#888888";
    ctx.font = "14px sans-serif";
    ctx.fillText("Share with your guardian to link accounts", canvas.width / 2, 170);

    // Download
    const link = document.createElement("a");
    link.download = "friend-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return { downloadPictureCode, downloadFriendCode };
}

// Helper to draw rounded rectangle
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Map picture IDs to emojis for canvas rendering
function getEmojiForPicture(id: string): string {
  const emojiMap: Record<string, string> = {
    dog: "🐕",
    cat: "🐱",
    bird: "🐦",
    fish: "🐟",
    bug: "🐛",
    rabbit: "🐰",
    apple: "🍎",
    pizza: "🍕",
    icecream: "🍦",
    cake: "🎂",
    cookie: "🍪",
    banana: "🍌",
    sun: "☀️",
    moon: "🌙",
    star: "⭐",
    tree: "🌳",
    flower: "🌸",
    cloud: "☁️",
    house: "🏠",
    car: "🚗",
    ball: "⚽",
    heart: "❤️",
    music: "🎵",
    book: "📖",
  };
  return emojiMap[id] || "❓";
}

// Convert Tailwind color class to hex
function getColorFromTailwind(colorClass: string): string {
  const colorMap: Record<string, string> = {
    "text-amber-600": "#D97706",
    "text-orange-500": "#F97316",
    "text-sky-500": "#0EA5E9",
    "text-blue-500": "#3B82F6",
    "text-purple-500": "#A855F7",
    "text-pink-400": "#F472B6",
    "text-pink-500": "#EC4899",
    "text-red-500": "#EF4444",
    "text-red-600": "#DC2626",
    "text-yellow-500": "#EAB308",
    "text-yellow-400": "#FACC15",
    "text-indigo-400": "#818CF8",
    "text-green-600": "#16A34A",
    "text-slate-600": "#475569",
    "text-blue-600": "#2563EB",
    "text-sky-400": "#38BDF8",
  };
  return colorMap[colorClass] || "#666666";
}
