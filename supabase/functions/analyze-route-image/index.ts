import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, startLocation, endLocation } = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing route image:", imageUrl.substring(0, 80));

    const prompt = `You are a geographic route analyzer. Look at this bike ride route map image and extract the key waypoints along the route.

${startLocation ? `Start location: ${startLocation}` : ""}
${endLocation ? `End location: ${endLocation}` : ""}

Analyze the route shown in the image and identify 3-8 key intermediate waypoints (turns, landmarks, intersections, or notable points along the route) between the start and end. 

Return the waypoints as geographic coordinates (latitude, longitude) that would create a route matching what's shown in the image when plotted on Google Maps.

IMPORTANT: The waypoints should trace the ACTUAL route shown in the image, not just a straight line. Include turns and key direction changes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_waypoints",
              description: "Extract waypoints from a route map image as lat/lng coordinates",
              parameters: {
                type: "object",
                properties: {
                  waypoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lat: { type: "number", description: "Latitude" },
                        lng: { type: "number", description: "Longitude" },
                        label: { type: "string", description: "Short description of this waypoint" },
                      },
                      required: ["lat", "lng"],
                      additionalProperties: false,
                    },
                  },
                  routeDescription: {
                    type: "string",
                    description: "Brief description of the overall route",
                  },
                },
                required: ["waypoints"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_waypoints" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add more credits.");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data).substring(0, 500));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No waypoints extracted from image");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Extracted waypoints:", result.waypoints?.length);

    return new Response(
      JSON.stringify({
        waypoints: result.waypoints || [],
        routeDescription: result.routeDescription || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing route image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
