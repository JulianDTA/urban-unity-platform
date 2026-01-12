import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "ticket_status_change" | "new_announcement";
  ticketId?: string;
  newsId?: string;
  recipientEmail?: string;
  recipientName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ticketId, newsId, recipientEmail, recipientName }: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let emailSubject = "";
    let emailHtml = "";

    if (type === "ticket_status_change" && ticketId && recipientEmail) {
      // Fetch ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (ticketError) throw ticketError;

      const statusColors: Record<string, string> = {
        open: "#f59e0b",
        in_progress: "#3b82f6",
        resolved: "#10b981",
        closed: "#6b7280",
      };

      const statusColor = statusColors[ticket.status] || "#6b7280";

      emailSubject = `Ticket Update: ${ticket.subject}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e3a5f, #2d4a6f); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
              .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; color: white; font-weight: 600; font-size: 14px; }
              .ticket-details { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🏢 ResidenceHub</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Ticket Status Update</p>
              </div>
              <div class="content">
                <p>Hello ${recipientName || "Resident"},</p>
                <p>Your support ticket has been updated:</p>
                
                <div class="ticket-details">
                  <h3 style="margin-top: 0;">${ticket.subject}</h3>
                  <p><strong>Category:</strong> ${ticket.category}</p>
                  <p><strong>New Status:</strong> <span class="status-badge" style="background-color: ${statusColor};">${ticket.status.replace("_", " ").toUpperCase()}</span></p>
                  ${ticket.admin_notes ? `<p><strong>Admin Notes:</strong> ${ticket.admin_notes}</p>` : ""}
                </div>
                
                <p style="margin-top: 20px;">Log in to your account to view more details or respond to this ticket.</p>
                
                <div class="footer">
                  <p>This is an automated message from ResidenceHub.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (type === "new_announcement" && newsId) {
      // Fetch news details
      const { data: news, error: newsError } = await supabase
        .from("news")
        .select("*")
        .eq("id", newsId)
        .single();

      if (newsError) throw newsError;

      // Fetch all resident emails
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email, full_name");

      if (profilesError) throw profilesError;

      emailSubject = `📢 New Announcement: ${news.title}`;
      
      // Send to all residents
      const emailPromises = profiles.map(async (profile) => {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e3a5f, #2d4a6f); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                .announcement { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🏢 ResidenceHub</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">New Announcement</p>
                </div>
                <div class="content">
                  <p>Hello ${profile.full_name || "Resident"},</p>
                  <p>A new announcement has been posted:</p>
                  
                  <div class="announcement">
                    <h2 style="margin-top: 0; color: #1e3a5f;">${news.title}</h2>
                    <p>${news.content.substring(0, 300)}${news.content.length > 300 ? "..." : ""}</p>
                    <p style="color: #6b7280; font-size: 12px;">Posted on ${new Date(news.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <p style="margin-top: 20px;">Log in to your account to read the full announcement.</p>
                  
                  <div class="footer">
                    <p>This is an automated message from ResidenceHub.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        return resend.emails.send({
          from: "ResidenceHub <onboarding@resend.dev>",
          to: [profile.email],
          subject: emailSubject,
          html,
        });
      });

      await Promise.all(emailPromises);

      return new Response(
        JSON.stringify({ success: true, message: `Sent to ${profiles.length} residents` }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      throw new Error("Invalid notification type or missing required parameters");
    }

    // Send single email for ticket status change
    if (type === "ticket_status_change" && recipientEmail) {
      const emailResponse = await resend.emails.send({
        from: "ResidenceHub <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(JSON.stringify(emailResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ error: "No action taken" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
