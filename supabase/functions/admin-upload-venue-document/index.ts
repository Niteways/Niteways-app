// Lovable Cloud Function: upload a venue document (storage + DB row)
// Allows anonymous uploads per user request

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Json = Record<string, unknown>;

function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "Server not configured" });
  }

  // Try to get user ID from auth header (optional)
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  
  if (token) {
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        if (claimsData?.claims?.sub) {
          userId = claimsData.claims.sub as string;
        }
      }
    } catch (e) {
      // Ignore auth errors - allow anonymous upload
      console.log("Auth check skipped:", e);
    }
  }

  const form = await req.formData();
  const venueId = String(form.get("venueId") ?? "").trim();
  const docName = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "agreement").trim();
  const expirationDateStr = String(form.get("expirationDate") ?? "").trim();
  const file = form.get("file");
  
  if (!venueId) return json(400, { error: "Missing venueId" });
  if (!docName) return json(400, { error: "Missing document name" });
  if (!(file instanceof File)) return json(400, { error: "Missing file" });

  // Parse expiration date if provided
  let expirationDate: string | null = null;
  if (expirationDateStr && expirationDateStr !== "null" && expirationDateStr !== "undefined") {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(expirationDateStr)) {
      expirationDate = expirationDateStr;
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${venueId}/${Date.now()}-${safeName}`;

  // Use service client to bypass RLS
  const service = createClient(supabaseUrl, serviceKey);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await service.storage
    .from("venue-documents")
    .upload(storagePath, bytes, { contentType: file.type || "application/octet-stream" });
  if (uploadError) return json(400, { error: uploadError.message });

  const { data: row, error: insertError } = await service
    .from("venue_documents")
    .insert({
      venue_id: venueId,
      name: docName,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size || null,
      uploaded_by: userId, // Will be null for anonymous uploads
      category: category,
      expiration_date: expirationDate,
    })
    .select("*")
    .single();

  if (insertError) return json(400, { error: insertError.message });

  return json(200, { ok: true, document: row });
});
