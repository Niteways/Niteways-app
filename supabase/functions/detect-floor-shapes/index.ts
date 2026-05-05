import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are an expert floor plan analyzer. Analyze this floor plan image EXACTLY as it appears and recreate it precisely.

CRITICAL INSTRUCTIONS:
1. Look at EVERY element in the image carefully - tables, chairs, walls, bars, stages, dance floors, booths, plants, etc.
2. Match the EXACT positions, sizes, and shapes of each element as closely as possible
3. If you see a table in a specific location, place it at that exact percentage position
4. If elements are arranged in a row or pattern, preserve that arrangement
5. Count and reproduce ALL tables and elements you see, not just a few samples

For each detected shape, provide:
1. type: one of "table", "bar", "booth", "dj", "entrance", "wall", "restroom", "stage", "plant", "decoration", "vip_area", "divider"
2. shape: one of "rectangle", "circle", "rounded", "line"
3. x: x position (0-100 as percentage of image width) - BE PRECISE to match the image
4. y: y position (0-100 as percentage of image height) - BE PRECISE to match the image  
5. width: width (0-100 as percentage) - match the relative size in the image
6. height: height (0-100 as percentage) - match the relative size in the image
7. label: suggested label (T1, T2, BAR, VIP 1, etc.)
8. rotation: rotation in degrees if the element is rotated (0, 45, 90, etc.)

ELEMENT IDENTIFICATION GUIDE:
- Small squares/circles (2-5% of image): Individual tables
- Larger rectangles with seating: VIP booths  
- Long narrow rectangles: Bars or walls
- Central open areas: Dance floor (mark as stage or vip_area)
- Rectangular platforms: DJ booth or stage
- Small circles near walls: Plants
- Rectangular blocks near edges: Restrooms
- Lines/thin rectangles: Walls or dividers
- Doorway openings: Entrances

Return ONLY a valid JSON array. Example:
[
  {"type":"table","shape":"circle","x":15,"y":25,"width":4,"height":4,"label":"T1","rotation":0},
  {"type":"table","shape":"circle","x":25,"y":25,"width":4,"height":4,"label":"T2","rotation":0},
  {"type":"booth","shape":"rectangle","x":70,"y":15,"width":15,"height":8,"label":"VIP 1","rotation":0},
  {"type":"bar","shape":"rounded","x":40,"y":80,"width":30,"height":6,"label":"BAR","rotation":0},
  {"type":"wall","shape":"line","x":5,"y":5,"width":90,"height":1,"label":"","rotation":0}
]

Be thorough - detect ALL visible elements in the floor plan image. The goal is to recreate the floor plan as accurately as possible.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
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
          JSON.stringify({ error: "Payment required. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON from the response
    let elements = [];
    try {
      // Try to extract JSON from the response - handle markdown code blocks
      let jsonContent = content;
      
      // Remove markdown code block if present
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      }
      
      const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        elements = JSON.parse(jsonMatch[0]);
        
        // Validate and clean up elements
        elements = elements.filter((el: any) => 
          el && 
          typeof el.type === 'string' && 
          typeof el.x === 'number' && 
          typeof el.y === 'number'
        ).map((el: any) => ({
          type: el.type,
          shape: el.shape || "rectangle",
          x: Math.min(100, Math.max(0, el.x)),
          y: Math.min(100, Math.max(0, el.y)),
          width: Math.min(50, Math.max(2, el.width || 5)),
          height: Math.min(50, Math.max(2, el.height || 5)),
          label: el.label || "",
          rotation: el.rotation || 0
        }));
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", content);
      elements = [];
    }

    console.log(`Detected ${elements.length} elements from floor plan`);

    return new Response(
      JSON.stringify({ elements }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in detect-floor-shapes:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to detect shapes";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
