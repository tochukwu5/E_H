import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Check, X, Lightbulb } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Field, Textarea, ScoreRing, Badge } from '../components/ui';

export default function AtsChecker() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jd, setJd] = useState('');
  useEffect(() => {
    document.title = 'Free ATS resume checker — EmployHunt';
  }, []);

  const check = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      if (file) fd.append('resume', file);
      else fd.append('resumeText', resumeText);
      fd.append('jobDescription', jd);
      return api.post('/tools/ats-check', fd).then((r) => r.data);
    },
    onError: (e) => toast.error(e.message),
  });
  const r = check.data;

  return (
    <div className="page py-12">
      <div className="max-w-2xl">
        <h1 className="text-[38px] font-bold sm:text-[46px]">Free ATS resume checker</h1>
        <p className="mt-3 text-[17px] text-muted">Paste a job description and see how well your resume covers it: matching skills, missing keywords and fixes. Nothing is stored.</p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <form className="panel space-y-5 p-6" onSubmit={(e) => { e.preventDefault(); check.mutate(); }}>
          <Field label="Your resume" hint="PDF up to 5 MB, or paste the text below.">
            <label className="flex cursor-pointer items-center gap-3 rounded-ctl border border-dashed border-line bg-raised px-4 py-4 hover:border-brand">
              <FileText className="h-6 w-6 text-brand" />
              <span className="text-[14px]">{file ? <span className="font-semibold">{file.name}</span> : <><span className="font-semibold text-brand">Choose a PDF</span> or drop it here</>}</span>
              <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </Field>
          {!file && <Field label="Or paste resume text"><Textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows={6} placeholder="Paste your resume here" /></Field>}
          <Field label="Job description" hint="Paste the whole posting for the best result.">
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={9} placeholder="Paste the job description" required />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={check.isPending}>Check my resume</Button>
        </form>

        <section aria-live="polite">
          {!r ? (
            <div className="panel flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <ScoreRing score={0} size={84} stroke={7} />
              <p className="mt-4 max-w-sm text-[15px] text-muted">Your score, matching skills and suggested fixes will appear here.</p>
            </div>
          ) : (
            <div className="panel space-y-6 p-6">
              <div className="flex items-center gap-5">
                <ScoreRing score={r.score} size={92} stroke={8} />
                <div>
                  <div className="text-[20px] font-bold">{r.score >= 75 ? 'Strong match' : r.score >= 55 ? 'Decent, with gaps' : 'Needs work for this job'}</div>
                  <div className="text-[14px] text-muted">{r.wordCount} words read from your resume</div>
                </div>
              </div>
              <div>
                <h2 className="font-sans text-[15px] font-semibold">Skills</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.matchedSkills.map((s) => <Badge key={s} tone="match" icon={Check}>{s}</Badge>)}
                  {r.missingSkills.map((s) => <Badge key={s} tone="danger" icon={X}>{s}</Badge>)}
                  {!r.matchedSkills.length && !r.missingSkills.length && <span className="text-[14px] text-muted">No specific tools named in this job.</span>}
                </div>
              </div>
              {r.missingKeywords.length > 0 && (
                <div>
                  <h2 className="font-sans text-[15px] font-semibold">Words from the job you don't use</h2>
                  <p className="mt-2 text-[14px] text-muted">{r.missingKeywords.join(', ')}</p>
                </div>
              )}
              <div>
                <h2 className="font-sans text-[15px] font-semibold">Sections found</h2>
                <ul className="mt-2 grid grid-cols-2 gap-2 text-[14px]">
                  {Object.entries(r.sections).map(([k, ok]) => (
                    <li key={k} className="flex items-center gap-2 capitalize">{ok ? <Check className="h-4 w-4 text-match" /> : <X className="h-4 w-4 text-danger" />}{k}</li>
                  ))}
                </ul>
              </div>
              {r.tips.length > 0 && (
                <div className="rounded-ctl bg-raised p-4">
                  <h2 className="flex items-center gap-2 font-sans text-[15px] font-semibold"><Lightbulb className="h-4 w-4 text-warn" />How to improve</h2>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] text-muted">{r.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              )}
              <div className="border-t border-line pt-5">
                <p className="text-[14px] text-muted">Want jobs that already fit your resume, sent to your phone?</p>
                <Button to="/register" className="mt-3">Get matched jobs free</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
