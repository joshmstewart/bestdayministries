import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Activity categories with prompts
const ACTIVITY_CATEGORIES: Record<string, { name: string; prompt: string; examples: string[] }> = {
  cleaning: {
    name: "Cleaning",
    prompt: "sweeping, mopping, or vacuuming a clean sparkling room with cleaning supplies visible",
    examples: ["Sweep floor", "Vacuum", "Mop", "Dust", "Clean bathroom", "Wipe counters"]
  },
  organizing: {
    name: "Organizing",
    prompt: "organizing items neatly on shelves, making the bed perfectly, or tidying up a space",
    examples: ["Make bed", "Organize closet", "Put away toys", "Sort laundry", "Tidy room"]
  },
  cooking: {
    name: "Cooking & Kitchen",
    prompt: "cooking in a kitchen, preparing food, or washing dishes with a proud expression",
    examples: ["Wash dishes", "Set table", "Help cook", "Put away groceries", "Empty dishwasher"]
  },
  personal_care: {
    name: "Personal Care",
    prompt: "taking care of themselves - brushing teeth, getting dressed, or grooming with confidence",
    examples: ["Brush teeth", "Take shower", "Get dressed", "Brush hair", "Wash hands"]
  },
  pet_care: {
    name: "Pet Care",
    prompt: "lovingly caring for a pet - feeding, walking, or playing with an animal companion",
    examples: ["Feed pet", "Walk dog", "Clean litter box", "Play with pet", "Fill water bowl"]
  },
  outdoor: {
    name: "Outdoor Tasks",
    prompt: "doing outdoor chores like gardening, raking leaves, or watering plants in a sunny yard",
    examples: ["Water plants", "Rake leaves", "Take out trash", "Get mail", "Pull weeds"]
  },
  laundry: {
    name: "Laundry",
    prompt: "handling laundry tasks - folding clean clothes neatly or loading the washing machine",
    examples: ["Fold laundry", "Put away clothes", "Sort dirty laundry", "Hang clothes"]
  },
  general: {
    name: "General Tasks",
    prompt: "completing a helpful household task with a proud, accomplished expression",
    examples: []
  }
};

// Detect category from chore title
function detectCategory(choreTitle: string): string {
  const lowerTitle = choreTitle.toLowerCase();
  
  for (const [category, data] of Object.entries(ACTIVITY_CATEGORIES)) {
    for (const example of data.examples) {
      if (lowerTitle.includes(example.toLowerCase()) || example.toLowerCase().includes(lowerTitle)) {
        return category;
      }
    }
  }
  
  // Keyword matching
  if (/clean|sweep|mop|vacuum|wipe|dust|scrub/.test(lowerTitle)) return "cleaning";
  if (/bed|organize|tidy|sort|put away/.test(lowerTitle)) return "organizing";
  if (/dish|cook|kitchen|table|food|groceries/.test(lowerTitle)) return "cooking";
  if (/brush|teeth|shower|bath|dress|groom|wash hands/.test(lowerTitle)) return "personal_care";
  if (/pet|dog|cat|feed pet|walk dog|litter/.test(lowerTitle)) return "pet_care";
  if (/plant|water|garden|trash|mail|outdoor|yard|leaf|rake/.test(lowerTitle)) return "outdoor";
  if (/laundry|fold|clothes|wash clothes/.test(lowerTitle)) return "laundry";
  
  return "general";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    const { choreTitle, targetUserId } = await req.json();

    if (!choreTitle) {
      throw new Error("choreTitle is required");
    }

    // Use targetUserId if provided (for guardians acting on behalf of bestie), otherwise use the authenticated user
    const userId = targetUserId || user.id;

    // Verify if using targetUserId that user is a guardian of that bestie
    if (targetUserId && targetUserId !== user.id) {
      const { data: link, error: linkError } = await supabase
        .from("caregiver_bestie_links")
        .select("id")
        .eq("caregiver_id", user.id)
        .eq("bestie_id", targetUserId)
        .single();

      if (linkError || !link) {
        // Also check if admin/owner
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!roleData || !["admin", "owner"].includes(roleData.role)) {
          throw new Error("Not authorized to generate images for this user");
        }
      }
    }

    // Get user's selected fitness avatar
    const { data: userAvatar, error: avatarError } = await supabase
      .from("user_fitness_avatars")
      .select("avatar_id, fitness_avatars(*)")
      .eq("user_id", userId)
      .eq("is_selected", true)
      .single();

    if (avatarError || !userAvatar?.fitness_avatars) {
      throw new Error("No fitness avatar selected. Please select an avatar in the Fitness Center first.");
    }

    const avatar = userAvatar.fitness_avatars as any;
    const avatarImageUrl = avatar.image_url || avatar.preview_image_url;

    if (!avatarImageUrl) {
      throw new Error("Avatar has no image to use");
    }

    // Detect activity category
    const category = detectCategory(choreTitle);
    const categoryData = ACTIVITY_CATEGORIES[category];

    // Build the prompt
    const prompt = `Use the EXACT same character from the reference image. Show them ${categoryData.prompt}. Keep the character identical (same gender, face, hair, and art style) but dress them appropriately for the activity. The character should look happy and proud of completing their task. Bright, cheerful cartoon illustration style with warm colors.`;

    console.log("Generating chore celebration for:", choreTitle);
    console.log("Detected category:", category, "-", categoryData.name);
    console.log("Avatar image URL:", avatarImageUrl);

    // Call Lovable AI to generate the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: avatarImageUrl } }
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("Failed to generate image");
    }

    const aiResponse = await response.json();
    const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiResponse));
      throw new Error("No image generated");
    }

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Generate unique filename
    const today = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();
    const fileName = `${userId}/${today}_${timestamp}.png`;

    // Upload to Supabase Storage (use workout-images bucket which already exists)
    const { error: uploadError } = await supabase.storage
      .from("workout-images")
      .upload(`chore-celebrations/${fileName}`, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save image");
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("workout-images")
      .getPublicUrl(`chore-celebrations/${fileName}`);

    const imageUrl = urlData.publicUrl;

    // Save to database
    const { data: savedImage, error: saveError } = await supabase
      .from("chore_celebration_images")
      .insert({
        user_id: userId,
        avatar_id: avatar.id,
        image_url: imageUrl,
        activity_category: category,
        completion_date: today,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw new Error("Failed to save image record");
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: savedImage,
        category: categoryData.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
