import nodemailer from "nodemailer";

function hasEmailCredentials() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!hasEmailCredentials()) {
    console.warn(
      `[email] Skipping "${subject}" to ${to} — EMAIL_USER/EMAIL_PASS not set`,
    );
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}
