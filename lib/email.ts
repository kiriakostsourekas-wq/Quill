import { Resend } from "resend";

export async function sendWelcomeEmail(to: string, name: string) {
  const from = process.env.RESEND_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!from || !apiKey) {
    console.warn("Resend welcome email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL missing");
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: "Welcome to Quill — a note from the founder",
    html: `
      <p>Hey ${name},</p>
      <p>I'm Kyriakos, the person who built Quill.</p>
      <p>I started this because I kept noticing that AI tools were making everyone on LinkedIn sound identical — polished, but forgettable. Quill exists to fix that.</p>
      <p>A few things that will help you get started:</p>
      <p>1. Train your Voice DNA first — paste 3-5 of your best past posts. The more specific your samples, the better your scores.</p>
      <p>2. Write your first post in the Compose editor and watch the voice score update live.</p>
      <p>3. Schedule it to LinkedIn (and X if you've connected it).</p>
      <p>If anything feels confusing or broken, reply to this email directly. I read everything.</p>
      <p>Good luck with your posting,<br/>Kyriakos</p>
      <p>P.S. If you have 2 minutes, I'd love to know: what's the #1 thing you want Quill to help you with? Just hit reply.</p>
    `,
  });
}
