export function renderPasswordResetEmail(resetUrl: string, expiresInMinutes: number) {
  return {
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#fff7ed;font-family:Arial,sans-serif;color:#1c1917">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px">
      <div style="background:#ea580c;color:#fff;padding:16px 20px;font-size:22px;font-weight:700;border-radius:0.25rem 0.25rem 0 0">CourtHub</div>
      <div style="background:#ffffff;padding:32px 24px;border:1px solid #fed7aa;border-radius:0 0 0.25rem 0.25rem">
        <h1 style="margin:0 0 16px;font-size:24px">Reset your password</h1>
        <p style="line-height:1.6">We received a request to reset your CourtHub password.</p>
        <p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:13px 20px;font-weight:700;border-radius:0.25rem">Reset password</a></p>
        <p style="font-size:14px;line-height:1.6;color:#57534e">This link expires in ${expiresInMinutes} minutes and can only be used once. If you did not request this, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`,
    text: `Reset your CourtHub password\n\nUse this link to create a new password: ${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes and can only be used once. If you did not request this, ignore this email.`,
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!,
  );
}
