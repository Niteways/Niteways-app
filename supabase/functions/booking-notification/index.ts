import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  bookingId: string;
  status: "confirmed" | "declined";
  guestEmail?: string;
  guestName: string;
  venueName: string;
  tableNumber: string;
  bookingDate: string;
  bookingTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: BookingNotificationRequest = await req.json();
    const { bookingId, status, guestEmail, guestName, venueName, tableNumber, bookingDate, bookingTime } = payload;

    // Create Supabase client for notifications
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isApproved = status === "confirmed";
    const title = isApproved 
      ? "Booking Confirmed! 🎉" 
      : "Booking Update";
    const message = isApproved
      ? `Your table reservation at ${venueName} has been confirmed! Table ${tableNumber} on ${bookingDate} at ${bookingTime}.`
      : `Unfortunately, your table request at ${venueName} for ${bookingDate} could not be accommodated. Please try booking a different table or date.`;

    // Save notification to database
    await supabase.from("user_notifications").insert({
      user_email: guestEmail,
      title,
      message,
      type: "booking",
      related_id: bookingId,
    });

    // Send email if guest email is provided using Resend API
    if (guestEmail) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      
      if (RESEND_API_KEY) {
        const subject = isApproved 
          ? `Your booking at ${venueName} is confirmed!`
          : `Update on your booking request at ${venueName}`;

        const htmlContent = isApproved ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #14b8a6, #0d9488); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
            </div>
            <div style="background: #1a1a1a; color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; margin-bottom: 20px;">Hi ${guestName},</p>
              <p style="color: #9ca3af; margin-bottom: 25px;">Great news! Your table reservation has been confirmed.</p>
              
              <div style="background: #262626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #14b8a6; margin-top: 0;">Booking Details</h3>
                <p style="margin: 8px 0;"><strong>Venue:</strong> ${venueName}</p>
                <p style="margin: 8px 0;"><strong>Table:</strong> ${tableNumber}</p>
                <p style="margin: 8px 0;"><strong>Date:</strong> ${bookingDate}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${bookingTime}</p>
              </div>
              
              <p style="color: #9ca3af; font-size: 14px;">See you there!</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Niteways Team</p>
            </div>
          </div>
        ` : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #374151; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Booking Update</h1>
            </div>
            <div style="background: #1a1a1a; color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; margin-bottom: 20px;">Hi ${guestName},</p>
              <p style="color: #9ca3af; margin-bottom: 25px;">We're sorry, but your table request at ${venueName} for ${bookingDate} couldn't be accommodated at this time.</p>
              
              <p style="color: #9ca3af; margin-bottom: 25px;">Please try booking a different table or date. We'd love to have you!</p>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Niteways Team</p>
            </div>
          </div>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Niteways <onboarding@resend.dev>",
            to: [guestEmail],
            subject,
            html: htmlContent,
          }),
        });

        if (emailResponse.ok) {
          console.log("Email sent successfully to:", guestEmail);
        } else {
          console.error("Failed to send email:", await emailResponse.text());
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in booking-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
