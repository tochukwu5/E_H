import { useEffect } from 'react';

const PRIVACY = [
  ['What we collect', 'Your name, email, password (stored as a secure hash), the resume you upload, your job search settings, and the phone number or Telegram chat you connect for alerts.'],
  ['How we use it', 'To match jobs to you, send the alerts you turned on, and draft applications when you ask. If AI features are on, the relevant parts of your profile and the job description are sent to our AI provider to write cover letters and match reasons.'],
  ['What we never do', 'We never sell your data, and we never send applications or messages to employers without your setting allowing it.'],
  ['Your controls', 'Download all your data or delete your account at any time in Settings → Account. Deleting removes your resume, matches and applications.'],
  ['Contact', 'Questions about privacy: hello@employhunt.app'],
];
const TERMS = [
  ['The service', 'EmployHunt finds job listings from public sources and sends you matches. Listings belong to their publishers. We don’t guarantee any listing is accurate or still open.'],
  ['Your responsibilities', 'Only include true information in your profile. You are responsible for applications submitted from your account, including ones prepared by the AI.'],
  ['Fair use', 'Don’t use EmployHunt to spam employers. Daily limits on applications exist for this reason.'],
  ['Plans and billing', 'Paid plans renew monthly until you cancel. You can switch to the Free plan at any time.'],
  ['Changes', 'We may update these terms and will tell you by email when we make important changes.'],
];

export default function Legal({ kind }) {
  const items = kind === 'privacy' ? PRIVACY : TERMS;
  const title = kind === 'privacy' ? 'Privacy policy' : 'Terms of service';
  useEffect(() => {
    document.title = `${title} — EmployHunt`;
  }, [title]);
  return (
    <div className="page max-w-3xl py-14">
      <h1 className="text-[38px] font-bold">{title}</h1>
      <p className="mt-2 text-[14px] text-faint">This is a starter template. Have it reviewed by a lawyer before launch.</p>
      <div className="mt-10 space-y-8">
        {items.map(([h, p]) => (
          <section key={h}>
            <h2 className="text-[20px] font-bold">{h}</h2>
            <p className="mt-2 text-[16px] leading-7 text-muted">{p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
