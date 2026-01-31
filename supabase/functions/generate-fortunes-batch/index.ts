import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { source_type = "affirmation", count = 20 } = body;

    // Generate fortunes using AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Fetch existing references BEFORE generating to include in prompt
    const { data: existingFortunesForPrompt } = await adminClient
      .from("daily_fortunes")
      .select("reference, author, content")
      .eq("source_type", source_type);
    
    // Build exclusion list based on source type
    let exclusionList = "";
    if (source_type === "bible_verse" || source_type === "proverbs") {
      const existingRefs = (existingFortunesForPrompt || [])
        .filter(f => f.reference)
        .map(f => f.reference)
        .slice(0, 100); // Limit to avoid huge prompts
      if (existingRefs.length > 0) {
        exclusionList = `\n\nIMPORTANT - DO NOT generate any of these verses (we already have them):\n${existingRefs.join(", ")}\n\nGenerate DIFFERENT verses not on this list.`;
      }
    } else if (source_type === "inspirational_quote") {
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
    
    let prompt = "";
    if (source_type === "bible_verse") {
      prompt = `Generate ${count} REAL, ACTUAL Bible verses from the NIV or KJV translation. These must be genuine scripture that can be verified.

For each verse, provide:
1. The EXACT verse text as it appears in the Bible (NIV or KJV)
2. The precise Bible reference (Book Chapter:Verse format)

Focus on LESSER-KNOWN but still encouraging verses. Avoid the most commonly quoted verses and dig deeper into Scripture.

Topics: love, hope, joy, being valued, God's care, encouragement, strength, peace, friendship, wisdom, patience, gratitude.

Books to explore: Psalms (beyond Psalm 23), Isaiah, Philippians, Colossians, Ephesians, James, 1 Peter, 1 John, Hebrews, Deuteronomy, Zephaniah, Micah, Lamentations, Song of Solomon.${exclusionList}

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses, not made-up spiritual sayings
- Include the EXACT reference (e.g., "Isaiah 41:10", "Zephaniah 3:17", "Lamentations 3:22-23")
- Prioritize verses that are encouraging but less commonly quoted

Format as JSON array:
[{"content": "exact verse text", "reference": "Book Chapter:Verse"}]`;
    } else if (source_type === "affirmation") {
      prompt = `Generate ${count} unique, positive affirmations for adults with intellectual and developmental disabilities.

Make them:
- Simple sentences (8-15 words max)
- First-person statements ("I am...", "I can...", "I have...")
- Focused on self-worth, abilities, belonging, and positive qualities
- Easy to remember and repeat daily
- FRESH and CREATIVE - not generic or overused${exclusionList}

Format as JSON array:
[{"content": "the affirmation text"}]`;
    } else if (source_type === "life_lesson") {
      prompt = `Generate ${count} short, wise sayings about life - like fortune cookie wisdom. These should be timeless, universal truths in simple words.

Style guidelines:
- SHORT and memorable (5-12 words ideal)
- Universal truths that apply to everyone
- Wise but simple - no complex vocabulary
- Feels like advice from a wise friend
- Can be understood by anyone
- Be CREATIVE and ORIGINAL - avoid clichés${exclusionList}

Topics to cover:
- Happiness and positivity
- Self-belief and confidence
- Kindness and friendship
- Patience and perseverance
- Being yourself
- Hope and new beginnings

Format as JSON array:
[{"content": "the life lesson text"}]`;
    } else if (source_type === "gratitude_prompt") {
      prompt = `Generate ${count} gratitude prompts to help adults with intellectual and developmental disabilities reflect on the good things in life.

Make them:
- Simple questions or statements that prompt reflection
- Related to everyday experiences (friends, activities, small pleasures)
- Easy to connect to their daily life
- VARIED and CREATIVE - explore different aspects of gratitude${exclusionList}

Format as JSON array:
[{"content": "the gratitude prompt text"}]`;
    } else if (source_type === "discussion_starter") {
      prompt = `Generate ${count} thought-provoking discussion questions for adults with intellectual and developmental disabilities.

Topics should encourage sharing experiences and opinions about:
- Favorite things (food, activities, places)
- Dreams and goals
- Friendship and helping others
- Handling challenges
- What makes them happy
- Memories and experiences
- Creativity and imagination${exclusionList}

Format as JSON array:
[{"content": "the discussion question text"}]`;
    } else if (source_type === "proverbs") {
      prompt = `Generate ${count} REAL biblical proverbs and wisdom sayings. These should be wise, practical teachings from the Bible - especially from Proverbs, Ecclesiastes, Psalms, and Jesus' teachings.

Focus on LESSER-KNOWN proverbs and wisdom passages. Dig deep into Proverbs chapters 10-31, Ecclesiastes, and the teachings of Jesus in the Gospels.${exclusionList}

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses or accurate paraphrases of biblical wisdom
- Include the Bible reference
- Choose accessible, practical wisdom that applies to daily life
- Keep language simple and understandable
- Prioritize verses that are less commonly quoted

Format as JSON array:
[{"content": "the proverb or wisdom text", "reference": "Book Chapter:Verse"}]`;
    } else {
      // Default: inspirational_quote
      prompt = `Generate ${count} REAL, VERIFIED inspirational quotes from famous people. These must be actual quotes that can be attributed to real historical or contemporary figures.

CRITICAL: Only use quotes that are genuinely from these people, not misattributed or made-up quotes.

Explore quotes from a WIDE VARIETY of people, including:
- Authors and poets (Maya Angelou, Toni Morrison, Langston Hughes, Rumi, Khalil Gibran)
- Leaders (Nelson Mandela, Winston Churchill, Theodore Roosevelt, Abraham Lincoln)
- Scientists (Marie Curie, Albert Einstein, Carl Sagan, Jane Goodall)
- Athletes (Muhammad Ali, Serena Williams, Michael Jordan, Jackie Robinson)
- Entertainers (Dolly Parton, Jim Henson, Robin Williams, Audrey Hepburn)
- Activists (Rosa Parks, Malala Yousafzai, Harriet Tubman, Frederick Douglass)
- Philosophers (Marcus Aurelius, Confucius, Lao Tzu)${exclusionList}

REQUIREMENTS:
- Every quote MUST include the author
- Only use quotes you are confident are accurately attributed
- Choose encouraging, uplifting quotes about courage, kindness, perseverance, and self-worth
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
      
      // Check word overlap - if 80% of words match, consider it a soft match
      const newWords = normalizedNew.split(' ').filter(w => w.length > 3); // Only meaningful words
      const existingWords = new Set(normalizedExisting.split(' ').filter(w => w.length > 3));
      
      if (newWords.length === 0) return false;
      
      const matchingWords = newWords.filter(w => existingWords.has(w)).length;
      const overlapRatio = matchingWords / newWords.length;
      
      return overlapRatio >= 0.8;
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

    // Retry loop to accumulate unique fortunes
    const collectedUniqueFortunes: any[] = [];
    const maxAttempts = 5;
    let attempt = 0;

    while (collectedUniqueFortunes.length < count && attempt < maxAttempts) {
      attempt++;
      const remaining = count - collectedUniqueFortunes.length;
      
      // Build dynamic exclusion list that includes what we've already collected this session
      let dynamicExclusion = exclusionList;
      if ((source_type === "bible_verse" || source_type === "proverbs") && collectedUniqueFortunes.length > 0) {
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

      // Filter out duplicates
      for (const f of fortunes) {
        if (collectedUniqueFortunes.length >= count) break;
        
        const normalizedContent = normalizeText(f.content);
        
        // Check exact match (after normalization)
        if (existingContentSet.has(normalizedContent)) {
          console.log(`Skipping exact match: "${f.content.substring(0, 50)}..."`);
          continue;
        }
        
        // Check Bible reference for bible_verse AND proverbs types
        if ((source_type === "bible_verse" || source_type === "proverbs") && f.reference) {
          const normalizedRef = f.reference.toLowerCase().replace(/\s+/g, '');
          if (existingExactReferences.has(normalizedRef)) {
            console.log(`Skipping duplicate Bible reference: "${f.reference}"`);
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
          if (hasOverlap) continue;
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
        
        // This one is unique! Add it to our collection and tracking sets
        collectedUniqueFortunes.push(f);
        existingContentSet.add(normalizedContent);
        if (f.reference) {
          existingBibleReferences.push(f.reference);
          existingExactReferences.add(f.reference.toLowerCase().replace(/\s+/g, ''));
        }
        allExistingForSoftMatch.push({ content: f.content, author: f.author || null, reference: f.reference || null, is_archived: false });
        
        console.log(`✓ Unique fortune collected: "${f.content.substring(0, 40)}..." (${collectedUniqueFortunes.length}/${count})`);
      }
    }

    console.log(`Finished after ${attempt} attempts. Collected ${collectedUniqueFortunes.length}/${count} unique fortunes`);

    if (collectedUniqueFortunes.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        count: 0,
        message: `Could not find unique fortunes after ${maxAttempts} attempts`,
        fortunes: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert only unique fortunes into database
    const fortunesToInsert = collectedUniqueFortunes.map((f: any) => ({
      content: f.content,
      source_type,
      author: f.author || null,
      reference: f.reference || null,
      is_approved: false,
      is_used: false,
    }));

    const { data: insertedData, error: insertError } = await adminClient
      .from("daily_fortunes")
      .insert(fortunesToInsert)
      .select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      count: insertedData?.length || 0,
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
