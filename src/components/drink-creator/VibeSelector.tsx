import { cn } from "@/lib/utils";

interface Vibe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  atmosphereHint: string;
}

export const VIBES: Vibe[] = [
  { id: "christmas", name: "Cozy Christmas", emoji: "🎄", description: "Warm holiday magic", atmosphereHint: "cozy Christmas atmosphere with twinkling lights, pine branches, red and green accents, snow falling gently, fireplace warmth, holiday magic" },
  { id: "spooky", name: "Spooky Night", emoji: "🎃", description: "Eerie & mysterious", atmosphereHint: "spooky Halloween atmosphere with misty graveyard, glowing jack-o-lanterns, bare twisted trees, orange and purple lights, mysterious fog" },
  { id: "beach", name: "Beach Paradise", emoji: "🏖️", description: "Tropical vacation vibes", atmosphereHint: "tropical beach paradise with palm trees, turquoise waves, golden sand, seashells, sunset over ocean, coconut and tropical flowers" },
  { id: "ancient-greece", name: "Ancient Greece", emoji: "🏛️", description: "Mythological elegance", atmosphereHint: "ancient Greek temple setting with marble columns, olive branches, Mediterranean blue sky, golden laurel wreaths, toga draped statues" },
  { id: "cyberpunk", name: "Cyberpunk City", emoji: "🌃", description: "Neon-lit future", atmosphereHint: "cyberpunk cityscape with neon signs, rain-slicked streets, holographic advertisements, purple and cyan lighting, futuristic aesthetic" },
  { id: "enchanted-forest", name: "Enchanted Forest", emoji: "🧚", description: "Magical woodland", atmosphereHint: "enchanted fairy forest with glowing mushrooms, fireflies, moss-covered trees, magical sparkles, soft ethereal light filtering through leaves" },
  { id: "space", name: "Cosmic Journey", emoji: "🚀", description: "Among the stars", atmosphereHint: "outer space setting with galaxies, nebulae, stars, planets, cosmic dust, deep purple and blue cosmic colors, astronaut vibes" },
  { id: "underwater", name: "Deep Ocean", emoji: "🐙", description: "Mysterious depths", atmosphereHint: "deep ocean underwater scene with bioluminescent creatures, coral reefs, bubbles, rays of light from above, mysterious sea life" },
  { id: "steampunk", name: "Steampunk Era", emoji: "⚙️", description: "Victorian machinery", atmosphereHint: "steampunk Victorian setting with brass gears, copper pipes, steam, vintage clocks, leather and metal, sepia tones with metallic accents" },
  { id: "japanese-zen", name: "Japanese Zen", emoji: "🎋", description: "Peaceful tranquility", atmosphereHint: "serene Japanese zen garden with cherry blossoms, bamboo, koi pond, stone lanterns, minimalist aesthetic, soft pink and green" },
  { id: "wild-west", name: "Wild West", emoji: "🤠", description: "Dusty frontier", atmosphereHint: "Wild West desert setting with cacti, wooden saloon, sunset over mesas, cowboy aesthetic, warm dusty browns and oranges" },
  { id: "disco", name: "Disco Fever", emoji: "🪩", description: "Groovy 70s party", atmosphereHint: "1970s disco dance floor with mirror ball, colorful spotlights, funky patterns, purple and gold, Saturday Night Fever vibes" },
  { id: "aurora", name: "Northern Lights", emoji: "🌌", description: "Arctic wonder", atmosphereHint: "Arctic landscape with aurora borealis dancing in sky, snow-covered mountains, frozen lake, green and purple lights, starry night" },
  { id: "art-deco", name: "Art Deco Glam", emoji: "💎", description: "1920s elegance", atmosphereHint: "luxurious 1920s Art Deco setting with gold and black geometric patterns, champagne, jazz age glamour, Gatsby-style opulence" },
  { id: "rainforest", name: "Jungle Adventure", emoji: "🦜", description: "Lush wilderness", atmosphereHint: "dense tropical rainforest with exotic birds, hanging vines, large leaves, waterfall mist, vibrant green with pops of bright colors" },
  { id: "medieval", name: "Medieval Feast", emoji: "🏰", description: "Castle grandeur", atmosphereHint: "medieval castle great hall with stone walls, candlelight, royal banners, wooden tables, goblets, knights and renaissance feeling" },
  { id: "vaporwave", name: "Vaporwave Dream", emoji: "🌴", description: "Retro aesthetic", atmosphereHint: "vaporwave aesthetic with pink and cyan gradients, Greek statues, palm trees, sunset grids, 80s nostalgia, glitchy digital vibes" },
  { id: "autumn-harvest", name: "Autumn Harvest", emoji: "🍂", description: "Cozy fall feels", atmosphereHint: "rustic autumn harvest scene with pumpkins, fallen leaves, hay bales, warm amber and orange tones, cozy sweater weather" },
  { id: "cotton-candy", name: "Cotton Candy", emoji: "🍭", description: "Sweet & dreamy", atmosphereHint: "whimsical candy land with cotton candy clouds, pastel pink and blue, carnival lights, sweet treats, playful and cute aesthetic" },
  { id: "noir", name: "Film Noir", emoji: "🎬", description: "Moody detective", atmosphereHint: "1940s film noir detective scene with dramatic shadows, venetian blinds, fedora hats, cigarette smoke, black and white with subtle amber" },
  { id: "botanical", name: "Botanical Garden", emoji: "🌿", description: "Plant lover's dream", atmosphereHint: "lush botanical greenhouse with exotic plants, terracotta pots, natural light through glass ceiling, ferns, monstera leaves, earthy greens" },
  { id: "abstract", name: "Abstract Art", emoji: "🎨", description: "Bold & colorful", atmosphereHint: "abstract expressionist art style with bold brushstrokes, dripping paint, vibrant clashing colors, Kandinsky meets Pollock energy" },
  { id: "cartoon", name: "Cartoon World", emoji: "🎭", description: "Animated fun", atmosphereHint: "colorful cartoon world with exaggerated proportions, bold outlines, playful shapes, Pixar-meets-anime style, fun and whimsical" },
  { id: "gothic", name: "Gothic Romance", emoji: "🦇", description: "Dark elegance", atmosphereHint: "gothic Victorian romance with candlelit cathedral, roses, velvet drapes, stained glass, dark purple and crimson, romantic darkness" },
];

interface VibeSelectorProps {
  selected: string | null;
  onSelect: (vibeId: string | null) => void;
}

export const VibeSelector = ({ selected, onSelect }: VibeSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-4">
        Optional: Choose a vibe to set the atmosphere, or skip to let AI surprise you!
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {VIBES.map((vibe) => (
          <button
            key={vibe.id}
            onClick={() => onSelect(selected === vibe.id ? null : vibe.id)}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
              "hover:scale-[1.02] hover:shadow-md",
              selected === vibe.id
                ? "border-primary bg-primary/10 shadow-lg"
                : "border-border/50 bg-card hover:border-primary/50"
            )}
          >
            <div className="text-2xl mb-1">{vibe.emoji}</div>
            <div className="font-medium text-sm leading-tight">{vibe.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{vibe.description}</div>
            
            {selected === vibe.id && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
      
      {selected && (
        <button
          onClick={() => onSelect(null)}
          className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
        >
          Clear selection (let AI decide)
        </button>
      )}
    </div>
  );
};
