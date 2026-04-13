import { Resend } from "resend";
import { absoluteAppUrl } from "@/lib/utils";

export async function sendWelcomeEmail(to: string, name: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = "Kyriakos from Quill <onboarding@resend.dev>";
  const voiceDnaUrl = absoluteAppUrl("/voice-dna");
  const unsubscribeUrl = absoluteAppUrl("/unsubscribe");

  if (!apiKey) {
    console.warn("Resend welcome email skipped: RESEND_API_KEY missing");
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: "Welcome to Quill — a note from the founder",
    html: `
      <div style="margin:0;padding:24px;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;">
        <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:12px;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:24px;line-height:32px;font-weight:700;color:#534AB7;">Quill</div>
            <div style="margin-top:6px;font-size:14px;line-height:20px;color:#6b7280;">Write once. Sound like you.</div>
          </div>

          <p style="margin:0 0 16px;font-size:16px;line-height:24px;">Hey ${name},</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:24px;">I'm Kyriakos — I built Quill because I kept seeing AI make everyone on LinkedIn sound the same. You signed up to fix that. Good call.</p>

          <div style="margin:0 0 24px;">
            <div style="margin:0 0 8px;font-size:15px;line-height:24px;">
              <span style="display:inline-block;min-width:20px;color:#534AB7;font-weight:700;">1.</span>
              Train your Voice DNA first — paste 3-5 of your best past posts so Quill has something real to learn from.
            </div>
            <div style="margin:0 0 8px;font-size:15px;line-height:24px;">
              <span style="display:inline-block;min-width:20px;color:#534AB7;font-weight:700;">2.</span>
              Write your first post in Compose and watch the voice score update live as you draft.
            </div>
            <div style="margin:0;font-size:15px;line-height:24px;">
              <span style="display:inline-block;min-width:20px;color:#534AB7;font-weight:700;">3.</span>
              Schedule it to LinkedIn, and X too if you've connected it, once the post sounds like you.
            </div>
          </div>

          <div style="margin:0 0 24px;">
            <a href="${voiceDnaUrl}" style="display:inline-block;background-color:#534AB7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:20px;padding:12px 18px;border-radius:8px;">Train your Voice DNA →</a>
          </div>

          <p style="margin:0 0 16px;font-size:15px;line-height:24px;">If anything feels off or you have a question, just reply to this email. I read every reply personally. — Kyriakos</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:24px;">P.S. What's the #1 thing you want Quill to help you with? Hit reply.</p>

          <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">
            Quill · quill-ai.dev ·
            <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  });
}
