// ═══════════════════════════════════════════════════════════════════
// MycoSG — Supabase Edge Function: send-email
// File: supabase/functions/send-email/index.ts
//
// DEPLOY:
//   supabase functions deploy send-email
//
// SET SECRETS (run once):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set ADMIN_EMAIL=hello@mycosg.com.sg
//   supabase secrets set FROM_EMAIL=noreply@mycosg.com.sg
//
// Uses Resend (https://resend.com) — free tier: 100 emails/day
// Swap for SendGrid or AWS SES by changing the fetch URL + headers
// ═══════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL") || "hello@mycosg.com.sg";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL")  || "noreply@mycosg.com.sg";
const FROM_NAME      = "MycoSG";

// ── Email templates ─────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f5f0e8;margin:0;padding:0;}
  .wrap{max-width:600px;margin:0 auto;background:#1a2e1a;}
  .header{background:#1a2e1a;padding:28px 32px;border-bottom:2px solid #c9a84c;}
  .logo{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#c9a84c;letter-spacing:2px;}
  .logo span{color:#8fbc6e;}
  .body{background:#f5f0e8;padding:32px;}
  h2{font-family:Georgia,serif;color:#1a2e1a;margin:0 0 16px;}
  p{color:#4a4a3a;line-height:1.7;margin:0 0 12px;}
  .field{background:#fff;border:1px solid #ddd;border-radius:3px;padding:8px 12px;margin:6px 0;}
  .field strong{color:#1a2e1a;font-size:12px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px;}
  .field span{color:#4a4a3a;font-size:15px;}
  .highlight{background:#2d4a2d;color:#f5f0e8;padding:16px 20px;border-radius:3px;margin:16px 0;}
  .highlight p{color:#f5f0e8;margin:0;}
  .footer{background:#1a2e1a;padding:20px 32px;text-align:center;}
  .footer p{color:rgba(245,240,232,0.5);font-size:11px;margin:0;}
  .btn{display:inline-block;background:#c9a84c;color:#1a2e1a;padding:10px 22px;border-radius:2px;text-decoration:none;font-weight:700;font-size:13px;margin:8px 0;}
</style></head><body>
<div class="wrap">
  <div class="header"><div class="logo">Myco<span>SG</span></div></div>
  <div class="body">
    <h2>${title}</h2>
    ${body}
  </div>
  <div class="footer"><p>© 2025 MycoSG Pte. Ltd. · Singapore's Modular Mushroom Collective<br>This is an automated notification from mycosg.com.sg</p></div>
</div></body></html>`;
}

function field(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<div class="field"><strong>${label}</strong><span>${value}</span></div>`;
}

// ── Templates per form type ──────────────────────────────────────────

const templates: Record<string, (p: any) => { adminSubject: string; adminBody: string; userSubject?: string; userBody?: string }> = {

  im_request: (p) => ({
    adminSubject: `📄 IM Request: ${p.name} (${p.lead_type})`,
    adminBody: baseTemplate("New Information Memorandum Request", `
      <p>A prospect has requested access to the MycoSG FarmBox Information Memorandum.</p>
      ${field("Name", p.name)}
      ${field("Email", p.email)}
      ${field("Phone", p.phone)}
      ${field("Purchaser Type", p.lead_type)}
      <div class="highlight"><p>⚡ Action: Contact within 24 hours to qualify interest and offer a call.</p></div>
      <a href="https://app.supabase.com/project/htxlvfzbjiozjzumywev/editor" class="btn">View in Supabase →</a>
    `),
    userSubject: "Your MycoSG Information Memorandum is ready",
    userBody: baseTemplate("Information Memorandum Unlocked", `
      <p>Hi ${p.name},</p>
      <p>Thank you for your interest in the MycoSG FarmBox Programme. Your Information Memorandum is now accessible on our website.</p>
      <div class="highlight">
        <p>The document covers our two-contract structure, full cost breakdown, three-scenario financial model, and SFA Small Offers compliance documentation.</p>
      </div>
      <p>Our team will be in touch within 2 business days to walk you through the programme and answer any questions.</p>
      <p>In the meantime, feel free to reply to this email or WhatsApp us at <strong>+65 9XXX XXXX</strong>.</p>
      <p style="margin-top:20px;">Warm regards,<br><strong>The MycoSG Team</strong></p>
    `),
  }),

  subscription_confirmation: (p) => ({
    adminSubject: `🍄 New Subscription: ${p.name} — ${p.plan}`,
    adminBody: baseTemplate("New Mushroom Box Subscription", `
      <p>A new Mushroom Box subscription has been submitted.</p>
      ${field("Name", p.name)}
      ${field("Email", p.email)}
      ${field("Plan", p.plan)}
      ${field("Frequency", p.freq)}
      ${field("Delivery Postcode", p.postcode)}
      <div class="highlight"><p>⚡ Action: Send payment link and confirm first delivery date.</p></div>
    `),
    userSubject: `Welcome to MycoSG — your ${p.plan} box is confirmed`,
    userBody: baseTemplate(`Welcome to the ${p.plan} Box`, `
      <p>Hi ${p.name},</p>
      <p>You're now part of the MycoSG collective! Here's a summary of your subscription:</p>
      ${field("Plan", p.plan)}
      ${field("Frequency", p.freq)}
      ${field("Delivery Area", p.postcode)}
      <div class="highlight">
        <p>🍄 Your first box will be dispatched within 48 hours of payment confirmation. You'll receive a harvest notification email before each delivery telling you exactly what's inside.</p>
      </div>
      <p>You can pause, skip, or cancel anytime — just reply to this email with 48 hours notice.</p>
      <p style="margin-top:20px;">Warm regards,<br><strong>The MycoSG Team</strong></p>
    `),
  }),

  farmbox_interest: (p) => ({
    adminSubject: `📦 FarmBox EOI: ${p.fullname} — ${p.units}`,
    adminBody: baseTemplate("New FarmBox Expression of Interest", `
      <p>A new expression of interest has been submitted for FarmBox unit purchase.</p>
      ${field("Full Legal Name", p.fullname)}
      ${field("Email", p.email)}
      ${field("Phone", p.phone)}
      ${field("Purchaser Type", p.ptype)}
      ${field("Units Requested", p.units)}
      <div class="highlight"><p>⚡ Action: Send full documentation pack (ESA + FMSA) within 2 business days. Complete KYC before proceeding.</p></div>
    `),
    userSubject: "MycoSG FarmBox — Expression of Interest Received",
    userBody: baseTemplate("Your Expression of Interest is Confirmed", `
      <p>Dear ${p.fullname},</p>
      <p>Thank you for your interest in the MycoSG FarmBox Programme. We have received your expression of interest for <strong>${p.units}</strong>.</p>
      <div class="highlight">
        <p>Our investment team will contact you within 2 business days to share the full documentation pack, including the Equipment Sale Agreement and Farm Management Services Agreement, for your legal review.</p>
      </div>
      <p><strong>Important:</strong> No commitment is made until both agreements are signed. We recommend engaging a Singapore-qualified corporate lawyer to review the documentation.</p>
      <p>If you have immediate questions, please reply to this email or call us at <strong>+65 9XXX XXXX</strong>.</p>
      <p style="margin-top:20px;">Warm regards,<br><strong>The MycoSG Investment Team</strong></p>
    `),
  }),

  booking_enquiry: (p) => ({
    adminSubject: `🌱 Booking: ${p.experience} — ${p.name} (${p.pax})`,
    adminBody: baseTemplate("New Experience Booking", `
      ${field("Experience", p.experience)}
      ${field("Name", p.name)}
      ${field("Email", p.email)}
      ${field("Phone", p.phone)}
      ${field("Participants", p.pax)}
      ${field("Preferred Date", p.date)}
      ${field("Notes", p.notes)}
      <div class="highlight"><p>⚡ Action: Confirm availability and send payment link within 24 hours.</p></div>
    `),
    userSubject: `MycoSG Booking Received — ${p.experience}`,
    userBody: baseTemplate("Booking Request Confirmed", `
      <p>Hi ${p.name},</p>
      <p>We've received your booking request for the <strong>${p.experience}</strong>.</p>
      ${field("Participants", p.pax)}
      ${field("Preferred Date", p.date || "To be confirmed")}
      <div class="highlight"><p>We'll confirm availability and send a payment link within 24 hours. Your spot is reserved once payment is received.</p></div>
      <p style="margin-top:20px;">See you at the farm!<br><strong>The MycoSG Team</strong></p>
    `),
  }),

  corporate_enquiry: (p) => ({
    adminSubject: `🏢 Corporate: ${p.company} — ${p.programme} (${p.pax} pax)`,
    adminBody: baseTemplate("New Corporate Event Enquiry", `
      ${field("Programme", p.programme)}
      ${field("Company", p.company)}
      ${field("Contact", p.contact)}
      ${field("Email", p.email)}
      ${field("Phone", p.phone)}
      ${field("Headcount", p.pax)}
      ${field("Preferred Date", p.date)}
      ${field("Notes", p.notes)}
      <div class="highlight"><p>⚡ Action: Send tailored proposal within 1 business day.</p></div>
    `),
    userSubject: `MycoSG Corporate Enquiry — ${p.company}`,
    userBody: baseTemplate("Corporate Enquiry Received", `
      <p>Hi ${p.contact},</p>
      <p>Thank you for your interest in a MycoSG corporate experience for <strong>${p.company}</strong>.</p>
      <p>Our team will review your requirements and send a tailored proposal within 1 business day.</p>
      <div class="highlight"><p>Programme: ${p.programme}<br>Estimated headcount: ${p.pax || "TBC"}</p></div>
      <p style="margin-top:20px;">Warm regards,<br><strong>The MycoSG Corporate Team</strong></p>
    `),
  }),

  school_booking: (p) => ({
    adminSubject: `🎓 School: ${p.school} — ${p.level} (${p.students} students)`,
    adminBody: baseTemplate("New Schools Programme Booking", `
      ${field("Level", p.level)}
      ${field("School", p.school)}
      ${field("Teacher", p.teacher)}
      ${field("Email", p.email)}
      ${field("Phone", p.phone)}
      ${field("Students", p.students)}
      ${field("Preferred Date", p.date)}
      ${field("Notes", p.notes)}
      <div class="highlight"><p>⚡ Action: Confirm date and send programme details + MOE funding guidance within 2 business days.</p></div>
    `),
    userSubject: `MycoSG Schools Programme — ${p.school}`,
    userBody: baseTemplate("Schools Booking Confirmed", `
      <p>Dear ${p.teacher},</p>
      <p>Thank you for booking the MycoSG Schools Programme for <strong>${p.school}</strong>.</p>
      <div class="highlight"><p>Programme: ${p.level}<br>Students: ${p.students || "TBC"}<br>Preferred date: ${p.date || "To be confirmed"}</p></div>
      <p>Our schools coordinator will contact you within 2 business days to finalise the visit date and send all pre-visit materials, including the curriculum worksheet and MOE funding application guidance.</p>
      <p style="margin-top:20px;">Warm regards,<br><strong>The MycoSG Education Team</strong></p>
    `),
  }),

  wholesale_enquiry: (p) => ({
    adminSubject: `🛒 Wholesale: ${p.business} — ${p.volume}kg/wk`,
    adminBody: baseTemplate("New Wholesale Enquiry", `
      ${field("Business", p.business)}
      ${field("Contact", p.contact)}
      ${field("Email", p.email)}
      ${field("Phone", p.phone)}
      ${field("Varieties", p.varieties)}
      ${field("Weekly Volume", p.volume ? `${p.volume} kg` : undefined)}
      ${field("Notes", p.notes)}
      <div class="highlight"><p>⚡ Action: Send wholesale pricing sheet and offer a sample box within 1 business day.</p></div>
    `),
    userSubject: `MycoSG Wholesale Enquiry — ${p.business}`,
    userBody: baseTemplate("Wholesale Enquiry Received", `
      <p>Hi ${p.contact || p.business},</p>
      <p>Thank you for your wholesale enquiry. We've noted your interest in: <strong>${p.varieties || "various varieties"}</strong>.</p>
      <div class="highlight"><p>Our sales team will reach out within 1 business day with wholesale pricing, a sample box offer, and delivery schedule details.</p></div>
      <p style="margin-top:20px;">Warm regards,<br><strong>The MycoSG Sales Team</strong></p>
    `),
  }),
};

// ── Send via Resend ──────────────────────────────────────────────────

async function sendViaResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return await res.json();
}

// ── Main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { type, payload } = await req.json();
    const tmpl = templates[type];

    if (!tmpl) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), { status: 400 });
    }

    const { adminSubject, adminBody, userSubject, userBody } = tmpl(payload);

    // Send admin notification
    await sendViaResend(ADMIN_EMAIL, adminSubject, adminBody);

    // Send user confirmation (if template has one)
    if (userSubject && userBody && payload.email) {
      await sendViaResend(payload.email, userSubject, userBody);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
