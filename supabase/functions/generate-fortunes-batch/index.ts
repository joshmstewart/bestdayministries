import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Theme definitions with descriptions for AI prompts
const THEME_DEFINITIONS: Record<string, { label: string; description: string; examples: string }> = {
  time_preciousness: {
    label: "Time & Its Preciousness",
    description: "Value of time, not wasting it, living fully, making each moment count",
    examples: "Seneca on wasted time, 'Lost time is never found again' (Franklin), Psalm 90:12 on numbering our days",
  },
  simplicity_focus: {
    label: "Simplicity & Focus",
    description: "Less is more, avoiding overwhelm, staying focused on what matters, decluttering",
    examples: "Thoreau on simplicity, 'Do less, better', Matthew 6:34 on not worrying about tomorrow",
  },
  action_over_thinking: {
    label: "Action Over Thinking",
    description: "Starting now, avoiding paralysis by analysis, imperfect action beats perfect inaction",
    examples: "'Done is better than perfect', 'The journey of a thousand miles begins with a single step'",
  },
  humor_lightness: {
    label: "Humor & Lightness",
    description: "Playful wisdom, not taking life too seriously, joy and laughter as medicine",
    examples: "Proverbs 17:22 on cheerful heart, 'Blessed are those who can laugh at themselves'",
  },
  self_care: {
    label: "Self-Care & Rest",
    description: "Rest, boundaries, recharging, taking care of yourself first, sabbath rest",
    examples: "Matthew 11:28-29 on rest, 'You cannot pour from an empty cup'",
  },
  listening_communication: {
    label: "Listening & Communication",
    description: "Being a good listener, thoughtful words, the power of silence, speaking kindly",
    examples: "James 1:19 on being slow to speak, 'We have two ears and one mouth'",
  },
  curiosity_learning: {
    label: "Curiosity & Learning",
    description: "Staying curious, growth mindset, never stop learning, asking questions",
    examples: "'The more I learn, the more I realize I don't know' (Einstein), Proverbs 18:15 on seeking knowledge",
  },
  nature_connection: {
    label: "Nature & Creation",
    description: "Lessons from nature, creation's wisdom, environmental stewardship, outdoor peace",
    examples: "Psalm 19:1 on heavens declaring glory, 'Look deep into nature' (Einstein)",
  },
  creative_expression: {
    label: "Creative Expression",
    description: "Making things, expressing yourself, using your gifts, creativity as worship",
    examples: "Exodus 35:31-35 on creative gifts, 'Every child is an artist' (Picasso)",
  },
  failure_resilience: {
    label: "Failure & Resilience",
    description: "Learning from mistakes, bouncing back, failure as teacher, perseverance through trials",
    examples: "'Fall seven times, stand up eight', Romans 5:3-4 on suffering producing perseverance",
  },
  relationships_depth: {
    label: "Relationships & Depth",
    description: "Quality over quantity in friendships, deep connections, investing in people",
    examples: "Proverbs 17:17 on friends, 'A true friend walks in when everyone else walks out'",
  },
  solitude_reflection: {
    label: "Solitude & Reflection",
    description: "Value of alone time, introspection, meditation, quiet moments with God",
    examples: "Luke 5:16 on Jesus withdrawing to pray, 'In quietness and trust is your strength' (Isaiah 30:15)",
  },
  money_contentment: {
    label: "Money & Contentment",
    description: "Enough-ness, not chasing wealth, contentment, generosity over greed",
    examples: "1 Timothy 6:6-10 on contentment, 'The love of money is the root of all evil'",
  },
  health_body: {
    label: "Health & Body",
    description: "Taking care of physical self, body as temple, rest and exercise, healthy habits",
    examples: "1 Corinthians 6:19-20 on body as temple, 'Take care of your body, it's the only place you have to live'",
  },
  mortality_perspective: {
    label: "Mortality & Perspective",
    description: "Living with awareness of limited time, making it count, legacy, eternal perspective",
    examples: "Psalm 39:4-5 on brevity of life, 'Teach us to number our days' (Psalm 90:12)",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { source_type = "affirmation", count = 20, theme = null, translation = "nlt", selectedTypes = null } = body;

    // Bible translation mapping for prompts
    const TRANSLATION_NAMES: Record<string, string> = {
      nlt: "NLT (New Living Translation)",
      niv: "NIV (New International Version)",
      esv: "ESV (English Standard Version)",
      csb: "CSB (Christian Standard Bible)",
      msg: "The Message",
      kjv: "KJV (King James Version)",
      nasb: "NASB (New American Standard Bible)",
    };
    const translationName = TRANSLATION_NAMES[translation] || TRANSLATION_NAMES.nlt;

    // Available source types for "all" mode - can be customized via selectedTypes
    const DEFAULT_SOURCE_TYPES = ["bible_verse", "affirmation", "quote", "life_lesson", "gratitude_prompt", "discussion_starter", "proverbs"];
    
    // Use selectedTypes if provided and valid, otherwise use all types
    const ALL_SOURCE_TYPES = (Array.isArray(selectedTypes) && selectedTypes.length > 0) 
      ? selectedTypes.filter((t: string) => DEFAULT_SOURCE_TYPES.includes(t))
      : DEFAULT_SOURCE_TYPES;
    
    // If source_type is "all", we'll generate a true mix of types
    const isAllTypesMode = source_type === "all";
    let actualSourceType = source_type;
    
    if (isAllTypesMode) {
      console.log(`"All Types" mode: will generate a mix across ${ALL_SOURCE_TYPES.length} types: ${ALL_SOURCE_TYPES.join(", ")}`);
    }

    // Get theme info if specified
    const themeInfo = theme ? THEME_DEFINITIONS[theme] : null;

    // Generate fortunes using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Fetch existing references BEFORE generating to include in prompt
    const { data: existingFortunesForPrompt } = await adminClient
      .from("daily_fortunes")
      .select("reference, author, content")
      .eq("source_type", actualSourceType);
    
    // Build exclusion list based on source type
    let exclusionList = "";
    if (actualSourceType === "bible_verse" || actualSourceType === "proverbs") {
      const existingRefs = (existingFortunesForPrompt || [])
        .filter(f => f.reference)
        .map(f => f.reference)
        .slice(0, 100); // Limit to avoid huge prompts
      if (existingRefs.length > 0) {
        exclusionList = `\n\nIMPORTANT - DO NOT generate any of these verses (we already have them):\n${existingRefs.join(", ")}\n\nGenerate DIFFERENT verses not on this list.`;
      }
    } else if (actualSourceType === "inspirational_quote") {
      const existingAuthors = [...new Set((existingFortunesForPrompt || [])
        .filter(f => f.author)
        .map(f => f.author))];
      if (existingAuthors.length > 0) {
        exclusionList = `\n\nWe already have quotes from: ${existingAuthors.slice(0, 30).join(", ")}.\nPrioritize quotes from OTHER people not on this list, though you can include them if the quote is truly exceptional and different.`;
      }
    } else {
      // For affirmations, life lessons, etc. - include some existing content to avoid
      const existingSamples = (existingFortunesForPrompt || [])
        .map(f => f.content)
        .slice(0, 20);
      if (existingSamples.length > 0) {
        exclusionList = `\n\nIMPORTANT - Generate DIFFERENT content from these existing items:\n${existingSamples.map(s => `- "${s}"`).join("\n")}\n\nBe creative and generate fresh, original content.`;
      }
    }
    
    // Build theme-specific prompt addition
    const themePromptAddition = themeInfo 
      ? `\n\n🎯 THEME FOCUS: "${themeInfo.label}"\nDescription: ${themeInfo.description}\nExamples for inspiration: ${themeInfo.examples}\n\nALL generated content MUST relate to this theme. Be creative but stay on topic.`
      : "";

    let prompt = "";
    if (actualSourceType === "bible_verse") {
      const topicGuidance = themeInfo 
        ? `Focus SPECIFICALLY on verses about: ${themeInfo.description}\nExample verses on this theme: ${themeInfo.examples}`
        : "Topics: love, hope, joy, being valued, God's care, encouragement, strength, peace, friendship, wisdom, patience, gratitude.";
      
      prompt = `Generate ${count} REAL, ACTUAL Bible verses from the ${translationName}. These must be genuine scripture that can be verified.

CRITICAL: Use the EXACT text as it appears in the ${translationName}. Do NOT mix translations or use paraphrases. Every verse must be word-for-word accurate to this specific translation.

For each verse, provide:
1. The EXACT verse text as it appears in the ${translationName}
2. The precise Bible reference (Book Chapter:Verse format)

Focus on LESSER-KNOWN but still encouraging verses. Avoid the most commonly quoted verses and dig deeper into Scripture.

${topicGuidance}

Books to explore: Psalms (beyond Psalm 23), Isaiah, Philippians, Colossians, Ephesians, James, 1 Peter, 1 John, Hebrews, Deuteronomy, Zephaniah, Micah, Lamentations, Song of Solomon, Ecclesiastes.${exclusionList}${themePromptAddition}

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses, not made-up spiritual sayings
- Use the EXACT wording from the ${translationName} - do not paraphrase or use other translations
- Include the EXACT reference (e.g., "Isaiah 41:10", "Zephaniah 3:17", "Lamentations 3:22-23")
- Prioritize verses that are encouraging but less commonly quoted
${themeInfo ? `- Every verse must relate to the theme: "${themeInfo.label}"` : ""}

Format as JSON array:
[{"content": "exact verse text from ${translationName}", "reference": "Book Chapter:Verse"}]`;
    } else if (actualSourceType === "affirmation") {
      const focusGuidance = themeInfo
        ? `Focus on affirmations about: ${themeInfo.description}`
        : "Focused on self-worth, abilities, belonging, and positive qualities";
      
      prompt = `Generate ${count} unique, positive affirmations for adults with intellectual and developmental disabilities.

Make them:
- Simple sentences (8-15 words max)
- First-person statements ("I am...", "I can...", "I have...")
- ${focusGuidance}
- Easy to remember and repeat daily
- FRESH and CREATIVE - not generic or overused${exclusionList}${themePromptAddition}

Format as JSON array:
[{"content": "the affirmation text"}]`;
    } else if (actualSourceType === "life_lesson") {
      const topicGuidance = themeInfo
        ? `Focus on wisdom about: ${themeInfo.description}\nExamples: ${themeInfo.examples}`
        : `Topics to cover:
- Happiness and positivity
- Self-belief and confidence
- Kindness and friendship
- Patience and perseverance
- Being yourself
- Hope and new beginnings`;

      prompt = `Generate ${count} short, wise sayings about life - like fortune cookie wisdom. These should be timeless, universal truths in simple words.

Style guidelines:
- SHORT and memorable (5-12 words ideal)
- Universal truths that apply to everyone
- Wise but simple - no complex vocabulary
- Feels like advice from a wise friend
- Can be understood by anyone
- Be CREATIVE and ORIGINAL - avoid clichés${exclusionList}${themePromptAddition}

${topicGuidance}

Format as JSON array:
[{"content": "the life lesson text"}]`;
    } else if (actualSourceType === "gratitude_prompt") {
      const focusGuidance = themeInfo
        ? `Focus prompts on gratitude related to: ${themeInfo.description}`
        : "Related to everyday experiences (friends, activities, small pleasures)";

      prompt = `Generate ${count} gratitude prompts to help adults with intellectual and developmental disabilities reflect on the good things in life.

Make them:
- Simple questions or statements that prompt reflection
- ${focusGuidance}
- Easy to connect to their daily life
- VARIED and CREATIVE - explore different aspects of gratitude${exclusionList}${themePromptAddition}

Format as JSON array:
[{"content": "the gratitude prompt text"}]`;
    } else if (actualSourceType === "discussion_starter") {
      const topicGuidance = themeInfo
        ? `Focus questions on: ${themeInfo.description}\nRelated topics: ${themeInfo.examples}`
        : `Topics should encourage sharing experiences and opinions about:
- Favorite things (food, activities, places)
- Dreams and goals
- Friendship and helping others
- Handling challenges
- What makes them happy
- Memories and experiences
- Creativity and imagination`;

      prompt = `Generate ${count} thought-provoking discussion questions for adults with intellectual and developmental disabilities.

${topicGuidance}${exclusionList}${themePromptAddition}

Format as JSON array:
[{"content": "the discussion question text"}]`;
    } else if (actualSourceType === "proverbs") {
      const focusGuidance = themeInfo
        ? `Focus on biblical wisdom about: ${themeInfo.description}\nExamples: ${themeInfo.examples}`
        : "Focus on LESSER-KNOWN proverbs and wisdom passages.";

      prompt = `Generate ${count} REAL biblical proverbs and wisdom sayings from the ${translationName}. These should be wise, practical teachings from the Bible - especially from Proverbs, Ecclesiastes, Psalms, and Jesus' teachings.

CRITICAL: Use the EXACT text as it appears in the ${translationName}. Do NOT mix translations or use paraphrases.

${focusGuidance} Dig deep into Proverbs chapters 10-31, Ecclesiastes, and the teachings of Jesus in the Gospels.${exclusionList}${themePromptAddition}

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses from the ${translationName}
- Use the EXACT wording - do not paraphrase or use other translations
- Include the Bible reference
- Choose accessible, practical wisdom that applies to daily life
- Keep language simple and understandable
- Prioritize verses that are less commonly quoted
${themeInfo ? `- Every proverb must relate to the theme: "${themeInfo.label}"` : ""}

Format as JSON array:
[{"content": "the proverb or wisdom text from ${translationName}", "reference": "Book Chapter:Verse"}]`;
    } else {
      // Default: inspirational_quote
      const topicGuidance = themeInfo
        ? `Focus on quotes about: ${themeInfo.description}\nExamples for inspiration: ${themeInfo.examples}`
        : "";

      prompt = `Generate ${count} REAL, VERIFIED inspirational quotes from famous people. These must be actual quotes that can be attributed to real historical or contemporary figures.

CRITICAL: Only use quotes that are genuinely from these people, not misattributed or made-up quotes.

Explore quotes from a WIDE VARIETY of people, including:
- Authors and poets (Maya Angelou, Toni Morrison, Langston Hughes, Rumi, Khalil Gibran)
- Leaders (Nelson Mandela, Winston Churchill, Theodore Roosevelt, Abraham Lincoln)
- Scientists (Marie Curie, Albert Einstein, Carl Sagan, Jane Goodall)
- Athletes (Muhammad Ali, Serena Williams, Michael Jordan, Jackie Robinson)
- Entertainers (Dolly Parton, Jim Henson, Robin Williams, Audrey Hepburn)
- Activists (Rosa Parks, Malala Yousafzai, Harriet Tubman, Frederick Douglass)
- Philosophers (Marcus Aurelius, Confucius, Lao Tzu, Seneca)${exclusionList}${themePromptAddition}

${topicGuidance}

REQUIREMENTS:
- Every quote MUST include the author
- Only use quotes you are confident are accurately attributed
${themeInfo ? `- Focus on quotes about: "${themeInfo.label}" - ${themeInfo.description}` : "- Choose encouraging, uplifting quotes about courage, kindness, perseverance, and self-worth"}
- Avoid complex or abstract quotes - keep them accessible
- Prioritize lesser-known quotes over the most famous ones

Format as JSON array:
[{"content": "quote text", "author": "Person Name"}]`;
    }

    // Normalize text for comparison (lowercase, remove punctuation, trim)
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
    };

    // Parse a Bible reference like "Matthew 1:1-3" into components
    const parseBibleReference = (ref: string): { book: string; chapter: number; startVerse: number; endVerse: number } | null => {
      if (!ref) return null;
      
      // Match patterns like "Matthew 1:1-3", "Psalm 23:1", "1 John 3:16-18"
      const match = ref.match(/^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?$/i);
      if (!match) return null;
      
      const book = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
      const chapter = parseInt(match[2], 10);
      const startVerse = parseInt(match[3], 10);
      const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;
      
      return { book, chapter, startVerse, endVerse };
    };

    // Check if two Bible verse references overlap
    const doBibleReferencesOverlap = (ref1: string | null, ref2: string | null): boolean => {
      if (!ref1 || !ref2) return false;
      
      const parsed1 = parseBibleReference(ref1);
      const parsed2 = parseBibleReference(ref2);
      
      if (!parsed1 || !parsed2) return false;
      
      // Must be same book and chapter
      if (parsed1.book !== parsed2.book || parsed1.chapter !== parsed2.chapter) {
        return false;
      }
      
      // Check verse range overlap: ranges overlap if start1 <= end2 AND end1 >= start2
      return parsed1.startVerse <= parsed2.endVerse && parsed1.endVerse >= parsed2.startVerse;
    };

    // Check if two strings are soft matches (one contains significant portion of other)
    const isSoftMatch = (newText: string, existingText: string): boolean => {
      const normalizedNew = normalizeText(newText);
      const normalizedExisting = normalizeText(existingText);
      
      // Exact match after normalization
      if (normalizedNew === normalizedExisting) return true;
      
      // Check if one contains the other (for quotes that might have slight variations)
      if (normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew)) {
        return true;
      }
      
      // Check word overlap - if 60% of words match, consider it a soft match (lowered from 80%)
      const newWords = normalizedNew.split(' ').filter(w => w.length > 3); // Only meaningful words
      const existingWords = new Set(normalizedExisting.split(' ').filter(w => w.length > 3));
      
      if (newWords.length === 0) return false;
      
      const matchingWords = newWords.filter(w => existingWords.has(w)).length;
      const overlapRatio = matchingWords / newWords.length;
      
      return overlapRatio >= 0.6; // Lowered threshold to catch more similar content
    };

    // AI-powered semantic similarity check for content that passes word overlap
    // This is the last line of defense against semantic duplicates
    const checkSemanticSimilarity = async (newContent: string, existingContents: string[], sessionCollected: string[] = []): Promise<boolean> => {
      // Combine existing DB content with items collected in this session
      const allToCheck = [...sessionCollected, ...existingContents];
      if (allToCheck.length === 0) return false;
      
      // Take a focused sample (max 25) - enough for good coverage without being slow
      const samplesToCheck = allToCheck.slice(0, 25);
      
      try {
        const semanticResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite", // Fast model for quick checks
            messages: [
              {
                role: "system",
                content: `You are a semantic duplicate detector for gratitude/discussion prompts.

Answer 'YES' ONLY if the NEW content is essentially asking THE SAME SPECIFIC QUESTION as an existing one. Examples of duplicates:
- "What made you smile today?" vs "What is one thing that made you smile today?" (same question)
- "Who is someone you're grateful for?" vs "Name a person you appreciate" (same question)

Answer 'NO' if the questions are DIFFERENT even if they share a broad theme like happiness or gratitude. Examples of NON-duplicates:
- "What made you smile today?" vs "What is your favorite part of the day?" (different questions)
- "Name something soft you like" vs "What color makes you happy?" (different questions)

Focus on the SPECIFIC QUESTION being asked, not the general theme.`
              },
              {
                role: "user",
                content: `NEW: "${newContent}"\n\nEXISTING:\n${samplesToCheck.map((c, i) => `${i + 1}. "${c}"`).join('\n')}\n\nIs the NEW asking the same specific question as any existing? YES or NO only.`
              }
            ],
            temperature: 0.1, // Low temperature for consistent judgment
            max_tokens: 10,
          }),
        });

        if (!semanticResponse.ok) {
          console.error("Semantic check failed, allowing content through");
          return false;
        }

        const semanticData = await semanticResponse.json();
        const answer = (semanticData.choices?.[0]?.message?.content || "").trim().toUpperCase();
        
        if (answer.includes("YES")) {
          console.log(`Semantic match detected for: "${newContent.substring(0, 50)}..."`);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Semantic check error:", error);
        return false; // On error, allow the content through
      }
    };

    // Fetch ALL existing fortunes for deduplication (including archived ones)
    const { data: existingFortunes, error: fetchError } = await adminClient
      .from("daily_fortunes")
      .select("content, author, reference, is_archived");
    
    if (fetchError) {
      console.error("Failed to fetch existing fortunes:", fetchError);
      throw new Error("Failed to check for duplicates");
    }

    // Build mutable sets that will grow as we find unique fortunes
    let existingContentSet = new Set(
      (existingFortunes || []).map(f => normalizeText(f.content))
    );

    let existingBibleReferences = (existingFortunes || [])
      .filter(f => f.reference)
      .map(f => f.reference as string);
    
    let existingExactReferences = new Set(
      (existingFortunes || [])
        .filter(f => f.reference)
        .map(f => (f.reference as string).toLowerCase().replace(/\s+/g, ''))
    );

    // All existing for soft match checking
    let allExistingForSoftMatch = [...(existingFortunes || [])];

    console.log(`Starting generation. Existing fortunes: ${existingFortunes?.length || 0} (including ${existingFortunes?.filter(f => f.is_archived).length || 0} archived)`);
    if (theme) {
      console.log(`Theme: ${theme} (${themeInfo?.label})`);
    }

    // Helper function to generate prompt for a specific source type
    const getPromptForType = (targetType: string, targetCount: number, dynamicExclusion: string): string => {
      let typePrompt = "";
      if (targetType === "bible_verse") {
        const topicGuidance = themeInfo 
          ? `Focus SPECIFICALLY on verses about: ${themeInfo.description}\nExample verses on this theme: ${themeInfo.examples}`
          : "Topics: love, hope, joy, being valued, God's care, encouragement, strength, peace, friendship, wisdom, patience, gratitude.";
        
        typePrompt = `Generate ${targetCount} REAL, ACTUAL Bible verses from the ${translationName}. These must be genuine scripture that can be verified.

CRITICAL: Use the EXACT text as it appears in the ${translationName}. Do NOT mix translations or use paraphrases. Every verse must be word-for-word accurate to this specific translation.

For each verse, provide:
1. The EXACT verse text as it appears in the ${translationName}
2. The precise Bible reference (Book Chapter:Verse format)

Focus on LESSER-KNOWN but still encouraging verses. Avoid the most commonly quoted verses and dig deeper into Scripture.

${topicGuidance}

Books to explore: Psalms (beyond Psalm 23), Isaiah, Philippians, Colossians, Ephesians, James, 1 Peter, 1 John, Hebrews, Deuteronomy, Zephaniah, Micah, Lamentations, Song of Solomon, Ecclesiastes.${dynamicExclusion}${themePromptAddition}

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses, not made-up spiritual sayings
- Use the EXACT wording from the ${translationName} - do not paraphrase or use other translations
- Include the EXACT reference (e.g., "Isaiah 41:10", "Zephaniah 3:17", "Lamentations 3:22-23")
- Prioritize verses that are encouraging but less commonly quoted
${themeInfo ? `- Every verse must relate to the theme: "${themeInfo.label}"` : ""}

Format as JSON array:
[{"content": "exact verse text from ${translationName}", "reference": "Book Chapter:Verse"}]`;
      } else if (targetType === "affirmation") {
        const focusGuidance = themeInfo
          ? `Focus on affirmations about: ${themeInfo.description}`
          : "Focused on self-worth, abilities, belonging, and positive qualities";
        
        typePrompt = `Generate ${targetCount} unique, positive affirmations for adults with intellectual and developmental disabilities.

Make them:
- Simple sentences (8-15 words max)
- First-person statements ("I am...", "I can...", "I have...")
- ${focusGuidance}
- Easy to remember and repeat daily
- FRESH and CREATIVE - not generic or overused${dynamicExclusion}${themePromptAddition}

Format as JSON array:
[{"content": "the affirmation text"}]`;
      } else if (targetType === "life_lesson") {
        const topicGuidance = themeInfo
          ? `Focus on wisdom about: ${themeInfo.description}\nExamples: ${themeInfo.examples}`
          : `Topics to cover:
- Happiness and positivity
- Self-belief and confidence
- Kindness and friendship
- Patience and perseverance
- Being yourself
- Hope and new beginnings`;

        typePrompt = `Generate ${targetCount} short, wise sayings about life - like fortune cookie wisdom. These should be timeless, universal truths in simple words.

Style guidelines:
- SHORT and memorable (5-12 words ideal)
- Universal truths that apply to everyone
- Wise but simple - no complex vocabulary
- Feels like advice from a wise friend
- Can be understood by anyone
- Be CREATIVE and ORIGINAL - avoid clichés${dynamicExclusion}${themePromptAddition}

${topicGuidance}

Format as JSON array:
[{"content": "the life lesson text"}]`;
      } else if (targetType === "gratitude_prompt") {
        const focusGuidance = themeInfo
          ? `Focus prompts on gratitude related to: ${themeInfo.description}`
          : "Related to everyday experiences (friends, activities, small pleasures)";

        typePrompt = `Generate ${targetCount} gratitude prompts to help adults with intellectual and developmental disabilities reflect on the good things in life.

Make them:
- Simple questions or statements that prompt reflection
- ${focusGuidance}
- Easy to connect to their daily life
- VARIED and CREATIVE - explore different aspects of gratitude${dynamicExclusion}${themePromptAddition}

Format as JSON array:
[{"content": "the gratitude prompt text"}]`;
      } else if (targetType === "discussion_starter") {
        const topicGuidance = themeInfo
          ? `Focus questions on: ${themeInfo.description}\nRelated topics: ${themeInfo.examples}`
          : `Topics should encourage sharing experiences and opinions about:
- Favorite things (food, activities, places)
- Dreams and goals
- Friendship and helping others
- Handling challenges
- What makes them happy
- Memories and experiences
- Creativity and imagination`;

        typePrompt = `Generate ${targetCount} thought-provoking discussion questions for adults with intellectual and developmental disabilities.

${topicGuidance}${dynamicExclusion}${themePromptAddition}

Format as JSON array:
[{"content": "the discussion question text"}]`;
      } else if (targetType === "proverbs") {
        const focusGuidance = themeInfo
          ? `Focus on biblical wisdom about: ${themeInfo.description}\nExamples: ${themeInfo.examples}`
          : "Focus on LESSER-KNOWN proverbs and wisdom passages.";

        typePrompt = `Generate ${targetCount} REAL biblical proverbs and wisdom sayings from the ${translationName}. These should be wise, practical teachings from the Bible - especially from Proverbs, Ecclesiastes, Psalms, and Jesus' teachings.

CRITICAL: Use the EXACT text as it appears in the ${translationName}. Do NOT mix translations or use paraphrases.

${focusGuidance} Dig deep into Proverbs chapters 10-31, Ecclesiastes, and the teachings of Jesus in the Gospels.${dynamicExclusion}${themePromptAddition}

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses from the ${translationName}
- Use the EXACT wording - do not paraphrase or use other translations
- Include the Bible reference
- Choose accessible, practical wisdom that applies to daily life
- Keep language simple and understandable
- Prioritize verses that are less commonly quoted
${themeInfo ? `- Every proverb must relate to the theme: "${themeInfo.label}"` : ""}

Format as JSON array:
[{"content": "the proverb or wisdom text from ${translationName}", "reference": "Book Chapter:Verse"}]`;
      } else {
        // Default: inspirational_quote
        const topicGuidance = themeInfo
          ? `Focus on quotes about: ${themeInfo.description}\nExamples for inspiration: ${themeInfo.examples}`
          : "";

        typePrompt = `Generate ${targetCount} REAL, VERIFIED inspirational quotes from famous people. These must be actual quotes that can be attributed to real historical or contemporary figures.

CRITICAL: Only use quotes that are genuinely from these people, not misattributed or made-up quotes.

Explore quotes from a WIDE VARIETY of people, including:
- Authors and poets (Maya Angelou, Toni Morrison, Langston Hughes, Rumi, Khalil Gibran)
- Leaders (Nelson Mandela, Winston Churchill, Theodore Roosevelt, Abraham Lincoln)
- Scientists (Marie Curie, Albert Einstein, Carl Sagan, Jane Goodall)
- Athletes (Muhammad Ali, Serena Williams, Michael Jordan, Jackie Robinson)
- Entertainers (Dolly Parton, Jim Henson, Robin Williams, Audrey Hepburn)
- Activists (Rosa Parks, Malala Yousafzai, Harriet Tubman, Frederick Douglass)
- Philosophers (Marcus Aurelius, Confucius, Lao Tzu, Seneca)${dynamicExclusion}${themePromptAddition}

${topicGuidance}

REQUIREMENTS:
- Every quote MUST include the author
- Only use quotes you are confident are accurately attributed
${themeInfo ? `- Focus on quotes about: "${themeInfo.label}" - ${themeInfo.description}` : "- Choose encouraging, uplifting quotes about courage, kindness, perseverance, and self-worth"}
- Avoid complex or abstract quotes - keep them accessible
- Prioritize lesser-known quotes over the most famous ones

Format as JSON array:
[{"content": "quote text", "author": "Person Name"}]`;
      }
      return typePrompt;
    };

    // Helper to generate fortunes for a specific type
    const generateForType = async (targetType: string, targetCount: number): Promise<any[]> => {
      const typePrompt = getPromptForType(targetType, targetCount + 3, exclusionList); // Ask for a few extra
      
      console.log(`Generating ${targetCount} "${targetType}" items...`);

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates uplifting content. Always respond with valid JSON arrays only, no markdown. CRITICALLY IMPORTANT: Generate UNIQUE content."
            },
            { role: "user", content: typePrompt }
          ],
          temperature: 0.9,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI request failed for ${targetType}: ${aiResponse.status}`);
        return [];
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "[]";
      
      try {
        const cleanContent = rawContent.replace(/```json\n?|\n?```/g, "").trim();
        const fortunes = JSON.parse(cleanContent);
        // Add the source_type to each fortune
        return fortunes.slice(0, targetCount).map((f: any) => ({
          ...f,
          source_type: targetType
        }));
      } catch (parseError) {
        console.error(`Failed to parse AI response for ${targetType}:`, rawContent.substring(0, 200));
        return [];
      }
    };

    // Main generation logic - differs for "all" mode vs single type
    let allGeneratedFortunes: any[] = [];
    
    // Helper function to deduplicate fortunes within a batch (and against existing DB)
    const deduplicateFortunes = (fortunes: any[]): any[] => {
      const uniqueFortunes: any[] = [];
      const seenContentInBatch = new Set<string>();
      const seenReferencesInBatch = new Set<string>();
      
      for (const f of fortunes) {
        const normalizedContent = normalizeText(f.content);
        
        // Check exact content match against existing DB
        if (existingContentSet.has(normalizedContent)) {
          console.log(`Skipping DB duplicate: "${f.content.substring(0, 50)}..."`);
          continue;
        }
        
        // Check exact content match within this batch
        if (seenContentInBatch.has(normalizedContent)) {
          console.log(`Skipping batch duplicate: "${f.content.substring(0, 50)}..."`);
          continue;
        }
        
        // Check Bible reference for bible_verse AND proverbs types
        if ((f.source_type === "bible_verse" || f.source_type === "proverbs") && f.reference) {
          const normalizedRef = f.reference.toLowerCase().replace(/\s+/g, '');
          
          // Check against existing DB references
          if (existingExactReferences.has(normalizedRef)) {
            console.log(`Skipping DB duplicate Bible reference: "${f.reference}"`);
            continue;
          }
          
          // Check against references seen in this batch
          if (seenReferencesInBatch.has(normalizedRef)) {
            console.log(`Skipping batch duplicate Bible reference: "${f.reference}"`);
            continue;
          }
          
          // Check overlapping references against DB
          let hasOverlapWithDB = false;
          for (const existingRef of existingBibleReferences) {
            if (doBibleReferencesOverlap(f.reference, existingRef)) {
              console.log(`Skipping overlapping Bible reference: "${f.reference}" overlaps with DB "${existingRef}"`);
              hasOverlapWithDB = true;
              break;
            }
          }
          if (hasOverlapWithDB) continue;
          
          // Check overlapping references within batch
          let hasOverlapWithBatch = false;
          for (const seenRef of seenReferencesInBatch) {
            if (doBibleReferencesOverlap(f.reference, seenRef)) {
              console.log(`Skipping overlapping Bible reference: "${f.reference}" overlaps with batch "${seenRef}"`);
              hasOverlapWithBatch = true;
              break;
            }
          }
          if (hasOverlapWithBatch) continue;
          
          // Mark this reference as seen
          seenReferencesInBatch.add(normalizedRef);
        }
        
        // Check soft matches against all existing
        let isSoft = false;
        for (const existing of allExistingForSoftMatch) {
          if (isSoftMatch(f.content, existing.content)) {
            console.log(`Skipping soft match: "${f.content.substring(0, 50)}..."`);
            isSoft = true;
            break;
          }
        }
        if (isSoft) continue;
        
        // Also check soft match within batch
        for (const unique of uniqueFortunes) {
          if (isSoftMatch(f.content, unique.content)) {
            console.log(`Skipping batch soft match: "${f.content.substring(0, 50)}..."`);
            isSoft = true;
            break;
          }
        }
        if (isSoft) continue;
        
        // This one is unique!
        seenContentInBatch.add(normalizedContent);
        uniqueFortunes.push(f);
        console.log(`✓ Unique fortune: "${f.content.substring(0, 40)}..." (${uniqueFortunes.length} collected)`);
      }
      
      return uniqueFortunes;
    };
    
    if (isAllTypesMode) {
      // ALL TYPES MODE: Generate a mix across all source types
      // Distribute count across types (roughly equal, at least 2 each)
      const typesCount = ALL_SOURCE_TYPES.length;
      const perType = Math.max(2, Math.floor(count / typesCount));
      const remainder = count - (perType * typesCount);
      
      console.log(`All Types mode: generating ~${perType} per type across ${typesCount} types`);
      
      // Shuffle types for variety in which ones get extra items
      const shuffledTypes = [...ALL_SOURCE_TYPES].sort(() => Math.random() - 0.5);
      
      // Generate for each type in parallel
      const typeGenerations = shuffledTypes.map((type, index) => {
        const extra = index < remainder ? 1 : 0; // Distribute remainder
        return generateForType(type, perType + extra);
      });
      
      const results = await Promise.all(typeGenerations);
      const rawFortunes = results.flat();
      
      // Shuffle the combined results for variety
      const shuffledFortunes = rawFortunes.sort(() => Math.random() - 0.5);
      
      // Apply deduplication to the combined batch
      allGeneratedFortunes = deduplicateFortunes(shuffledFortunes);
      
      console.log(`All Types mode: ${rawFortunes.length} generated, ${allGeneratedFortunes.length} unique after deduplication`);
    } else {
      // SINGLE TYPE MODE: Use the retry loop for a specific type
      const collectedUniqueFortunes: any[] = [];
      const maxAttempts = 5;
      let attempt = 0;

      while (collectedUniqueFortunes.length < count && attempt < maxAttempts) {
        attempt++;
        const remaining = count - collectedUniqueFortunes.length;
        
        // Build dynamic exclusion list that includes what we've already collected this session
        let dynamicExclusion = exclusionList;
        if ((actualSourceType === "bible_verse" || actualSourceType === "proverbs") && collectedUniqueFortunes.length > 0) {
          const sessionRefs = collectedUniqueFortunes.filter(f => f.reference).map(f => f.reference);
          dynamicExclusion += `\n\nALSO DO NOT generate these (already collected this session): ${sessionRefs.join(", ")}`;
        }
        
        // Update prompt with current exclusion and remaining count
        let currentPrompt = prompt.replace(new RegExp(`Generate ${count}`), `Generate ${remaining + 5}`); // Ask for a few extra
        currentPrompt = currentPrompt.replace(exclusionList, dynamicExclusion);
        
        console.log(`Attempt ${attempt}/${maxAttempts}: Need ${remaining} more, requesting ${remaining + 5}`);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that generates uplifting content. Always respond with valid JSON arrays only, no markdown. CRITICALLY IMPORTANT: Generate UNIQUE content that is NOT on any exclusion list provided."
              },
              { role: "user", content: currentPrompt }
            ],
            temperature: 0.9 + (attempt * 0.05), // Increase temperature on retries for variety
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI request failed on attempt ${attempt}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "[]";
        
        // Parse the JSON response
        let fortunes: any[] = [];
        try {
          const cleanContent = rawContent.replace(/```json\n?|\n?```/g, "").trim();
          fortunes = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error(`Failed to parse AI response on attempt ${attempt}:`, rawContent);
          continue;
        }

        // Filter out duplicates - track consecutive rejections to detect when we're stuck
        let consecutiveRejections = 0;
        const maxConsecutiveRejections = 15; // If 15 items in a row are rejected, we're likely exhausted
        
        for (const f of fortunes) {
          if (collectedUniqueFortunes.length >= count) break;
          
          // Early exit if we're stuck in a rejection loop
          if (consecutiveRejections >= maxConsecutiveRejections) {
            console.log(`Breaking early: ${consecutiveRejections} consecutive rejections - topic likely saturated`);
            break;
          }
          
          const normalizedContent = normalizeText(f.content);
          
          // Check exact match (after normalization)
          if (existingContentSet.has(normalizedContent)) {
            console.log(`Skipping exact match: "${f.content.substring(0, 50)}..."`);
            consecutiveRejections++;
            continue;
          }
          
          // Check Bible reference for bible_verse AND proverbs types
          if ((actualSourceType === "bible_verse" || actualSourceType === "proverbs") && f.reference) {
            const normalizedRef = f.reference.toLowerCase().replace(/\s+/g, '');
            if (existingExactReferences.has(normalizedRef)) {
              console.log(`Skipping duplicate Bible reference: "${f.reference}"`);
              consecutiveRejections++;
              continue;
            }
            
            let hasOverlap = false;
            for (const existingRef of existingBibleReferences) {
              if (doBibleReferencesOverlap(f.reference, existingRef)) {
                console.log(`Skipping overlapping Bible reference: "${f.reference}" overlaps with "${existingRef}"`);
                hasOverlap = true;
                break;
              }
            }
            if (hasOverlap) {
              consecutiveRejections++;
              continue;
            }
          }
          
          // Check soft matches against all existing
          let isSoft = false;
          for (const existing of allExistingForSoftMatch) {
            if (isSoftMatch(f.content, existing.content)) {
              console.log(`Skipping soft match: "${f.content.substring(0, 50)}..."`);
              isSoft = true;
              break;
            }
          }
          if (isSoft) {
            consecutiveRejections++;
            continue;
          }
          
          // AI semantic check - catches questions/prompts that ask the same thing differently
          // Apply to categories where semantic similarity matters most
          if (["discussion_starter", "gratitude_prompt", "affirmation", "life_lesson"].includes(actualSourceType)) {
            const existingContentForSemantic = allExistingForSoftMatch.map(e => e.content);
            // Also pass items already collected this session to prevent same-batch duplicates
            const sessionCollectedContent = collectedUniqueFortunes.map(u => u.content);
            const isSemanticallyDuplicate = await checkSemanticSimilarity(f.content, existingContentForSemantic, sessionCollectedContent);
            if (isSemanticallyDuplicate) {
              console.log(`Skipping semantic duplicate: "${f.content.substring(0, 50)}..."`);
              consecutiveRejections++;
              continue;
            }
          }
          
          // This one is unique! Add it to our collection and tracking sets
          consecutiveRejections = 0; // Reset counter on success
          collectedUniqueFortunes.push({ ...f, source_type: actualSourceType });
          existingContentSet.add(normalizedContent);
          if (f.reference) {
            existingBibleReferences.push(f.reference);
            existingExactReferences.add(f.reference.toLowerCase().replace(/\s+/g, ''));
          }
          allExistingForSoftMatch.push({ content: f.content, author: f.author || null, reference: f.reference || null, is_archived: false });
          
          console.log(`✓ Unique fortune collected: "${f.content.substring(0, 40)}..." (${collectedUniqueFortunes.length}/${count})`);
        }
        
        // If this attempt yielded nothing after processing all items, we might be exhausted
        if (consecutiveRejections >= maxConsecutiveRejections) {
          console.log(`Topic appears saturated after attempt ${attempt}. Stopping early.`);
          break;
        }
      }
      
      allGeneratedFortunes = collectedUniqueFortunes;
      console.log(`Finished after ${attempt} attempts. Collected ${allGeneratedFortunes.length}/${count} unique fortunes`);
    }

    if (allGeneratedFortunes.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        count: 0,
        message: "Could not find unique fortunes after multiple attempts",
        fortunes: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert only unique fortunes into database
    // For "all" mode, each fortune already has its source_type; otherwise use actualSourceType
    const fortunesToInsert = allGeneratedFortunes.map((f: any) => ({
      content: f.content,
      source_type: f.source_type || actualSourceType,
      author: f.author || null,
      reference: f.reference || null,
      theme: theme || null, // Include theme in the insert
      is_approved: false,
      is_used: false,
    }));

    const { data: insertedData, error: insertError } = await adminClient
      .from("daily_fortunes")
      .insert(fortunesToInsert)
      .select();

    if (insertError) throw insertError;

    // Build type distribution for response
    const typeDistribution: Record<string, number> = {};
    allGeneratedFortunes.forEach((f: any) => {
      const t = f.source_type || actualSourceType;
      typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    });

    return new Response(JSON.stringify({
      success: true,
      count: insertedData?.length || 0,
      source_type: isAllTypesMode ? "all" : actualSourceType,
      mixed_types: isAllTypesMode,
      type_distribution: isAllTypesMode ? typeDistribution : undefined,
      theme: theme || null,
      fortunes: insertedData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-fortunes-batch:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
