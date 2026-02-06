/**
 * Character Name Translator
 * 
 * Translates copyrighted character names into generic visual descriptions
 * that capture the character's essence without using trademarked names.
 * 
 * The AI can generate characters that LOOK like the originals using
 * visual descriptions, but cannot use trademarked names directly.
 */

interface CharacterTranslation {
  patterns: RegExp[];
  visualDescription: string;
  characterType?: 'superhero' | 'human' | 'animal' | 'monster';
}

const CHARACTER_TRANSLATIONS: CharacterTranslation[] = [
  // Marvel Characters
  {
    patterns: [/spider[-\s]?man/i, /spiderman/i, /peter parker/i],
    visualDescription: "a superhero in a red and blue full-body suit with black web patterns covering the entire body including a full-face mask that completely covers the head and face with large white angular eye lenses, no visible hair or skin, and a small black spider emblem on the chest",
    characterType: 'superhero'
  },
  {
    patterns: [/iron[-\s]?man/i, /ironman/i, /tony stark/i],
    visualDescription: "a superhero in a sleek red and gold high-tech armored suit with a glowing blue arc reactor on the chest, wearing a fully enclosed metal helmet with glowing white eye slits that completely covers the head and face with no visible skin or hair",
    characterType: 'superhero'
  },
  {
    patterns: [/captain america/i, /cap america/i, /steve rogers/i],
    visualDescription: "a patriotic superhero with a blue helmet with wings, red white and blue suit with a star on the chest, carrying a round shield",
    characterType: 'superhero'
  },
  {
    patterns: [/\bthe?\s*hulk\b/i, /bruce banner/i, /incredible hulk/i],
    visualDescription: "a massive green-skinned muscular hero with torn purple shorts, powerful build, and a fierce but heroic expression",
    characterType: 'superhero'
  },
  {
    patterns: [/\bthor\b/i],
    visualDescription: "a Norse-inspired thunder god hero with long blonde hair, a winged helmet, red cape, and carrying a powerful hammer with lightning effects",
    characterType: 'superhero'
  },
  {
    patterns: [/black panther/i, /t'?challa/i],
    visualDescription: "an African warrior king superhero in a sleek black vibranium suit with purple energy accents covering the entire body including a full-face panther mask with pointed ears that completely covers the head and face with no visible skin or hair, silver clawed gloves, and glowing purple kinetic energy patterns",
    characterType: 'superhero'
  },
  {
    patterns: [/scarlet witch/i, /wanda/i],
    visualDescription: "a powerful sorceress with flowing red hair, a red and black outfit, red energy magic swirling around her hands, and a mystical headpiece",
    characterType: 'superhero'
  },
  {
    patterns: [/black widow/i, /natasha/i],
    visualDescription: "a skilled spy superhero with red hair, a sleek black tactical bodysuit with a red hourglass emblem, and wrist gauntlets",
    characterType: 'superhero'
  },
  {
    patterns: [/deadpool/i, /wade wilson/i],
    visualDescription: "a wisecracking mercenary hero in a red and black full-body suit covering the entire body including a full-face mask that completely covers the head and face with large expressive white eye patches, no visible skin or hair, dual katana swords crossed on the back, and multiple weapon pouches on the belt",
    characterType: 'superhero'
  },
  {
    patterns: [/wolverine/i, /logan/i],
    visualDescription: "a fierce mutant hero with wild spiked black hair, yellow and blue suit, metal claws extending from his fists, muscular and rugged",
    characterType: 'superhero'
  },
  {
    patterns: [/storm/i, /ororo/i],
    visualDescription: "a powerful weather-controlling superhero with flowing white hair, dark skin, a black and gold costume, and lightning crackling around her",
    characterType: 'superhero'
  },
  {
    patterns: [/doctor strange/i, /dr\.?\s*strange/i, /stephen strange/i],
    visualDescription: "a mystical sorcerer hero with a red cape that floats magically, blue robes, a glowing eye amulet on chest, and magical orange sigils around hands",
    characterType: 'superhero'
  },
  {
    patterns: [/groot/i],
    visualDescription: "a friendly tree creature with a wooden humanoid body, branches and leaves growing from the head, kind glowing eyes, saying 'I am' phrases",
    characterType: 'monster'
  },
  {
    patterns: [/rocket\s*raccoon/i],
    visualDescription: "a small anthropomorphic raccoon with a tough attitude, wearing a tactical vest, carrying futuristic weapons, brown fur with black mask markings",
    characterType: 'animal'
  },
  
  // DC Characters
  {
    patterns: [/\bbatman\b/i, /bruce wayne/i, /dark knight/i],
    visualDescription: "a dark caped crusader in a black and gray suit with a bat emblem on chest, pointed cowl with bat ears, flowing black cape, and a utility belt",
    characterType: 'superhero'
  },
  {
    patterns: [/superman/i, /clark kent/i, /man of steel/i],
    visualDescription: "a powerful flying hero in a blue suit with a red cape, red boots, and a diamond-shaped emblem with an 'S' on the chest, strong and confident",
    characterType: 'superhero'
  },
  {
    patterns: [/wonder woman/i, /diana prince/i],
    visualDescription: "an Amazonian warrior princess with long dark hair, golden tiara with a star, red and gold armored top, blue star-spangled skirt, silver bracelets, and a golden lasso",
    characterType: 'superhero'
  },
  {
    patterns: [/the?\s*flash/i, /barry allen/i, /wally west/i],
    visualDescription: "a super-speed hero in a red suit covering the entire body including a full-head cowl that covers the head and face with only the chin and mouth visible, small golden lightning bolt wing accents on the sides of the head, white eye lenses, yellow lightning bolt emblem on chest, yellow boots, surrounded by crackling yellow lightning speed effects",
    characterType: 'superhero'
  },
  {
    patterns: [/aquaman/i, /arthur curry/i],
    visualDescription: "an underwater king hero with long blonde hair and beard, muscular build, orange and green scaled suit, carrying a golden trident",
    characterType: 'superhero'
  },
  {
    patterns: [/green lantern/i, /hal jordan/i],
    visualDescription: "a space police hero in a green and black suit with a glowing green ring, green energy constructs emanating from the ring, lantern emblem on chest",
    characterType: 'superhero'
  },
  {
    patterns: [/supergirl/i, /kara/i],
    visualDescription: "a powerful flying heroine in a blue top with red cape, red skirt, and an 'S' emblem on chest, blonde hair, confident smile",
    characterType: 'superhero'
  },
  {
    patterns: [/batgirl/i, /barbara gordon/i],
    visualDescription: "an athletic vigilante hero in purple and yellow bat-themed suit, yellow bat emblem, flowing red hair, utility belt, cape",
    characterType: 'superhero'
  },
  {
    patterns: [/harley quinn/i],
    visualDescription: "a playful anti-hero with blonde pigtails dipped in red and blue, colorful outfit mixing red and blue, mischievous grin, carrying a baseball bat",
    characterType: 'superhero'
  },
  {
    patterns: [/robin/i],
    visualDescription: "a young acrobatic hero sidekick in a red vest with 'R' emblem, green tights, black cape with yellow interior, black mask, utility belt",
    characterType: 'superhero'
  },
  {
    patterns: [/cyborg/i, /victor stone/i],
    visualDescription: "a half-human half-robot hero with glowing red robotic eye, silver mechanical body parts, powerful tech abilities visible",
    characterType: 'superhero'
  },
  
  // Disney/Pixar Characters
  {
    patterns: [/elsa/i, /frozen\s+queen/i],
    visualDescription: "an ice queen princess with platinum blonde braided hair, sparkly blue ice dress, snowflake patterns, magical ice powers swirling around her hands",
    characterType: 'human'
  },
  {
    patterns: [/anna/i],
    visualDescription: "a cheerful princess with reddish-brown braided hair with a white streak, traditional Nordic-inspired dress in green and magenta, freckles",
    characterType: 'human'
  },
  {
    patterns: [/moana/i],
    visualDescription: "a brave Polynesian princess with long curly dark hair decorated with flowers, wearing a traditional red and tan outfit, oceanic patterns, confident and adventurous",
    characterType: 'human'
  },
  {
    patterns: [/rapunzel/i],
    visualDescription: "a princess with extremely long magical golden glowing hair, purple dress with puff sleeves, barefoot, holding a frying pan, big green eyes",
    characterType: 'human'
  },
  {
    patterns: [/buzz\s*lightyear/i],
    visualDescription: "a heroic space ranger action figure with a white and green space suit, purple hood, clear dome helmet, laser on wrist, wings that extend",
    characterType: 'superhero'
  },
  {
    patterns: [/woody/i, /sheriff woody/i],
    visualDescription: "a friendly cowboy sheriff doll with a yellow plaid shirt, brown vest, blue jeans, cowboy boots, brown cowboy hat, and a pull-string on his back",
    characterType: 'human'
  },
  {
    patterns: [/stitch/i, /experiment 626/i],
    visualDescription: "a small blue alien creature with large ears, big black eyes, a cute but mischievous smile showing teeth, four arms, and blue fur",
    characterType: 'monster'
  },
  {
    patterns: [/mike\s*wazowski/i],
    visualDescription: "a small round green monster with one giant eye taking up most of his face, tiny horns, thin arms and legs, friendly smile",
    characterType: 'monster'
  },
  {
    patterns: [/sulley/i, /james\s*sullivan/i, /sully/i],
    visualDescription: "a large fluffy blue monster with purple spots, two horns, big friendly smile, fuzzy fur all over, gentle giant appearance",
    characterType: 'monster'
  },
  {
    patterns: [/nemo/i, /finding nemo/i],
    visualDescription: "a small orange clownfish with white stripes bordered by black, one smaller fin, big expressive eyes, adorable and adventurous",
    characterType: 'animal'
  },
  {
    patterns: [/dory/i],
    visualDescription: "a friendly blue tang fish with a yellow tail, big expressive eyes, always smiling, cheerful and forgetful demeanor",
    characterType: 'animal'
  },
  {
    patterns: [/simba/i, /lion king/i],
    visualDescription: "a young lion cub with golden fur, reddish mane (if adult), big amber eyes, regal and brave appearance, friendly smile",
    characterType: 'animal'
  },
  {
    patterns: [/mickey\s*mouse/i, /mickey/i],
    visualDescription: "a cheerful cartoon mouse with large round black ears, white gloves, red shorts with white buttons, big yellow shoes, friendly smile",
    characterType: 'animal'
  },
  {
    patterns: [/minnie\s*mouse/i, /minnie/i],
    visualDescription: "a sweet cartoon mouse with large round black ears with a polka dot bow, polka dot dress, white gloves, high heels, long eyelashes",
    characterType: 'animal'
  },
  {
    patterns: [/donald\s*duck/i],
    visualDescription: "a cartoon duck with white feathers, orange bill and feet, wearing a blue sailor shirt and hat, often looks grumpy but lovable",
    characterType: 'animal'
  },
  {
    patterns: [/goofy/i],
    visualDescription: "a tall lanky cartoon dog with black fur, floppy ears, wearing an orange turtleneck, brown vest, and green hat, goofy smile",
    characterType: 'animal'
  },
  
  // Nintendo Characters
  {
    patterns: [/mario/i, /super mario/i],
    visualDescription: "a cheerful Italian plumber hero with a red cap with 'M', big bushy mustache, blue overalls, red shirt, white gloves, brown boots",
    characterType: 'human'
  },
  {
    patterns: [/luigi/i],
    visualDescription: "a tall thin plumber hero with a green cap with 'L', thin mustache, blue overalls, green shirt, white gloves, timid but brave",
    characterType: 'human'
  },
  {
    patterns: [/princess peach/i, /peach/i],
    visualDescription: "an elegant princess with long blonde hair, pink ballgown with blue gem brooch, golden crown, white gloves, sweet smile",
    characterType: 'human'
  },
  {
    patterns: [/link/i, /zelda hero/i],
    visualDescription: "an elven hero with pointed ears, green tunic and cap, blonde hair, blue eyes, carrying a sword and shield, heroic stance",
    characterType: 'human'
  },
  {
    patterns: [/princess zelda/i, /zelda princess/i],
    visualDescription: "an elegant elven princess with pointed ears, long golden hair, flowing white and purple dress, golden tiara, wise and graceful",
    characterType: 'human'
  },
  {
    patterns: [/pikachu/i],
    visualDescription: "a small yellow electric mouse creature with red cheek circles, pointed ears with black tips, lightning bolt shaped tail, big expressive eyes",
    characterType: 'animal'
  },
  {
    patterns: [/kirby/i],
    visualDescription: "a small round pink puffball creature with stubby arms, red feet, big blue eyes, rosy cheeks, cute and always hungry looking",
    characterType: 'monster'
  },
  {
    patterns: [/yoshi/i],
    visualDescription: "a friendly green dinosaur with a round white belly, red saddle on back, large nose, big eyes, cute boots, long tongue",
    characterType: 'animal'
  },
  {
    patterns: [/donkey kong/i],
    visualDescription: "a strong friendly gorilla with brown fur, wearing a red necktie with 'DK' initials, muscular arms, happy expression",
    characterType: 'animal'
  },
  {
    patterns: [/samus/i, /metroid hero/i],
    visualDescription: "a futuristic armored bounty hunter in an orange and red power suit covering the entire body including a fully enclosed helmet with a green visor that completely covers the head and face with no visible skin or hair, large spherical shoulder pads, a powerful arm cannon on the right arm, athletic feminine build",
    characterType: 'superhero'
  },
  
  // Anime/Manga Popular Characters
  {
    patterns: [/goku/i, /son goku/i],
    visualDescription: "a martial arts hero with wild spiky black hair (or golden when powered up), orange martial arts gi with blue undershirt, muscular, confident fighter stance",
    characterType: 'superhero'
  },
  {
    patterns: [/naruto/i],
    visualDescription: "a young ninja hero with spiky blonde hair, orange and black jumpsuit, headband with metal plate, whisker marks on cheeks, energetic pose",
    characterType: 'superhero'
  },
  {
    patterns: [/sailor moon/i, /usagi/i],
    visualDescription: "a magical girl hero with long blonde twin-tails with buns, sailor-style outfit in blue and white with red bow, tiara, magical wand",
    characterType: 'superhero'
  },
  {
    patterns: [/pikachu/i],
    visualDescription: "a small yellow electric mouse creature with red cheek circles, pointed ears with black tips, lightning bolt shaped tail",
    characterType: 'animal'
  },
  
  // Other Popular Characters
  {
    patterns: [/harry potter/i],
    visualDescription: "a young wizard with round glasses, messy black hair, lightning bolt scar on forehead, black wizard robes, carrying a wand",
    characterType: 'human'
  },
  {
    patterns: [/hermione/i],
    visualDescription: "a clever young witch with bushy brown hair, school robes, carrying books and a wand, intelligent and confident expression",
    characterType: 'human'
  },
  {
    patterns: [/sonic/i, /sonic the hedgehog/i],
    visualDescription: "a cool blue anthropomorphic hedgehog with spiky quills, red running shoes, white gloves, confident smirk, ready to run fast",
    characterType: 'animal'
  },
  {
    patterns: [/shadow/i, /shadow the hedgehog/i],
    visualDescription: "a dark anthropomorphic hedgehog with black and red spiky quills, white chest fur, red and white hover shoes, serious expression",
    characterType: 'animal'
  },
  {
    patterns: [/tails/i, /miles prower/i],
    visualDescription: "a cute orange fox with two fluffy tails that spin like propellers, white chest and muzzle, blue eyes, white gloves",
    characterType: 'animal'
  },
  {
    patterns: [/optimus prime/i],
    visualDescription: "a heroic robot leader with a red and blue armored body, silver face plate, antennae on head, transforms from a truck",
    characterType: 'superhero'
  },
  {
    patterns: [/bumblebee/i, /transformer bee/i],
    visualDescription: "a friendly yellow robot with black stripes, car parts visible on body, blue eyes, smaller and younger looking robot hero",
    characterType: 'superhero'
  },
  {
    patterns: [/hello kitty/i],
    visualDescription: "a cute white cartoon cat with a red bow on her ear, no mouth, dot eyes, wearing a cute outfit, round head, tiny body",
    characterType: 'animal'
  },
  {
    patterns: [/spongebob/i, /sponge bob/i],
    visualDescription: "a cheerful yellow sea sponge in square shape, big blue eyes, buck teeth, brown pants, red tie, very happy expression",
    characterType: 'monster'
  },
  {
    patterns: [/patrick\s*star/i],
    visualDescription: "a pink starfish with a pointed head, green and purple flower shorts, not very smart looking but very friendly and lovable",
    characterType: 'animal'
  },
  {
    patterns: [/shrek/i],
    visualDescription: "a large friendly green ogre with trumpet-shaped ears, brown vest, white shirt, kind eyes despite scary appearance",
    characterType: 'monster'
  },
  {
    patterns: [/minion/i, /minions/i],
    visualDescription: "a small yellow cylindrical creature with one or two big googly eyes behind goggles, blue overalls, few strands of black hair, silly and lovable",
    characterType: 'monster'
  },
  {
    patterns: [/olaf/i],
    visualDescription: "a cheerful living snowman with stick arms, carrot nose, coal buttons, twig hair, always smiling, loves warm hugs",
    characterType: 'monster'
  },
  {
    patterns: [/baymax/i],
    visualDescription: "a large white inflatable healthcare robot with a round soft body, small black eyes, gentle and huggable appearance",
    characterType: 'superhero'
  },
  {
    patterns: [/wall[-\s]?e/i],
    visualDescription: "a small boxy yellow robot with tank treads, binocular eyes that express emotion, rusty and weathered but lovable",
    characterType: 'monster'
  },
  {
    patterns: [/eve\s*robot/i, /\beva\b/i],
    visualDescription: "a sleek white egg-shaped flying robot with a smooth face, blue eyes, elegant and futuristic design",
    characterType: 'monster'
  },
  
  // Power Rangers / Super Sentai
  {
    patterns: [/power ranger/i, /red ranger/i],
    visualDescription: "a heroic warrior in a colorful full-body armored spandex suit covering the entire body including a fully enclosed helmet with a dark visor that completely covers the head and face with no visible skin or hair, the helmet has a distinctive animal or dinosaur motif on top, white diamond patterns, team emblem on chest belt, dynamic action pose",
    characterType: 'superhero'
  },
  
  // Teenage Mutant Ninja Turtles
  {
    patterns: [/ninja turtle/i, /teenage mutant/i, /tmnt/i, /leonardo turtle/i, /raphael turtle/i, /donatello turtle/i, /michelangelo turtle/i],
    visualDescription: "an anthropomorphic turtle ninja with a colored mask, shell on back, ninja weapons, bandana tails, muscular green skin",
    characterType: 'animal'
  },
  
  // He-Man / She-Ra
  {
    patterns: [/he[-\s]?man/i],
    visualDescription: "a powerful blonde warrior hero with a muscular build, fur loincloth, chest harness, carrying a magical sword, heroic pose",
    characterType: 'superhero'
  },
  {
    patterns: [/she[-\s]?ra/i],
    visualDescription: "a powerful blonde warrior princess with a tiara, flowing cape, white and gold outfit, carrying a magical sword, confident stance",
    characterType: 'superhero'
  },
  
  // Paw Patrol
  {
    patterns: [/paw patrol/i, /chase paw/i, /marshall paw/i, /skye paw/i],
    visualDescription: "a cute anthropomorphic puppy in a colorful uniform and helmet, ready for rescue missions, friendly and heroic",
    characterType: 'animal'
  },
  
  // My Little Pony
  {
    patterns: [/my little pony/i, /mlp/i, /twilight sparkle/i, /rainbow dash/i, /pinkie pie/i],
    visualDescription: "a colorful magical pony with a flowing mane, big expressive eyes, cutie mark on flank, friendly and magical appearance",
    characterType: 'animal'
  },
  
  // Bluey
  {
    patterns: [/\bbluey\b/i, /bingo heeler/i],
    visualDescription: "a cute blue heeler puppy with blue fur, brown nose, playful expression, cartoon style, very friendly and imaginative",
    characterType: 'animal'
  },
  
  // Peppa Pig
  {
    patterns: [/peppa pig/i, /george pig/i],
    visualDescription: "a pink cartoon pig with a round head viewed from side, small tail, wearing a red dress (or blue shirt for boy), simple cute style",
    characterType: 'animal'
  },
  
  // Cocomelon
  {
    patterns: [/cocomelon/i, /jj cocomelon/i],
    visualDescription: "a cute toddler with a round head, big eyes, wearing a onesie, sweet innocent expression, simple cartoon style",
    characterType: 'human'
  },
];

/**
 * Translates a character name to a visual description if it matches a known copyrighted character.
 * Returns the original name/prompt if no translation is found.
 */
export function translateCharacterName(
  name: string,
  existingPrompt?: string
): { 
  translatedPrompt: string; 
  wasTranslated: boolean; 
  suggestedCharacterType?: 'superhero' | 'human' | 'animal' | 'monster';
  originalName: string;
} {
  const combinedText = `${name} ${existingPrompt || ''}`.toLowerCase();
  
  for (const translation of CHARACTER_TRANSLATIONS) {
    for (const pattern of translation.patterns) {
      if (pattern.test(combinedText)) {
        // Found a match - return the visual description
        // Preserve any additional context from the original prompt
        let enhancedDescription = translation.visualDescription;
        
        // If there's additional context in the prompt beyond the character name, append it
        if (existingPrompt) {
          // Remove the matched character name from the prompt to get additional context
          let additionalContext = existingPrompt;
          for (const p of translation.patterns) {
            additionalContext = additionalContext.replace(p, '').trim();
          }
          if (additionalContext && additionalContext.length > 3) {
            enhancedDescription += `, ${additionalContext}`;
          }
        }
        
        return {
          translatedPrompt: enhancedDescription,
          wasTranslated: true,
          suggestedCharacterType: translation.characterType,
          originalName: name
        };
      }
    }
  }
  
  // No translation found - return original
  return {
    translatedPrompt: existingPrompt || name,
    wasTranslated: false,
    originalName: name
  };
}

/**
 * Checks if a name matches a known copyrighted character.
 */
export function isLikelyCopyrightedCharacter(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  for (const translation of CHARACTER_TRANSLATIONS) {
    for (const pattern of translation.patterns) {
      if (pattern.test(lowerName)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Gets the suggested category for an avatar based on name.
 * Returns "icons" for known copyrighted characters, otherwise undefined.
 */
export function getSuggestedCategory(name: string): 'icons' | undefined {
  if (isLikelyCopyrightedCharacter(name)) {
    return 'icons';
  }
  return undefined;
}

/**
 * Gets the translation info for a known character.
 */
export function getCharacterInfo(name: string): { 
  visualDescription: string; 
  characterType?: string;
} | undefined {
  const lowerName = name.toLowerCase();
  
  for (const translation of CHARACTER_TRANSLATIONS) {
    for (const pattern of translation.patterns) {
      if (pattern.test(lowerName)) {
        return {
          visualDescription: translation.visualDescription,
          characterType: translation.characterType
        };
      }
    }
  }
  
  return undefined;
}

/**
 * Gets the list of all supported character translations for documentation/UI purposes.
 */
export function getSupportedCharacters(): string[] {
  const characters: string[] = [];
  
  for (const translation of CHARACTER_TRANSLATIONS) {
    // Extract a readable name from the first pattern
    const firstPattern = translation.patterns[0].toString();
    // Clean up regex syntax to get readable name
    const readableName = firstPattern
      .replace(/^\//, '')
      .replace(/\/i?$/, '')
      .replace(/\\b/g, '')
      .replace(/\\s\*/g, ' ')
      .replace(/\[-\\s\]\?/g, '-')
      .replace(/\?/g, '')
      .replace(/\\/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\|/g, '/')
      .trim();
    
    if (readableName) {
      characters.push(readableName);
    }
  }
  
  return [...new Set(characters)].sort();
}
