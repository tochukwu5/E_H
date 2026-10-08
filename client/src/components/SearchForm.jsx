import { useState } from 'react';
import { Field, Input, ChipInput, Pills, Select, Button } from './ui';
import { JOB_TYPES, WORK_MODES, SENIORITY, PRESETS } from '../lib/format';

export const EMPTY_SEARCH = { name: '', titles: [], keywords: [], excludeKeywords: [], jobTypes: [], workModes: [], locations: [], eligibility: 'anywhere', seniority: [], minSalary: 0, currency: 'USD', strictness: 60, active: true };

const STRICT_LABEL = (v) => (v < 45 ? 'Show me more' : v < 65 ? 'Balanced' : v < 80 ? 'Picky' : 'Only near-perfect');

export default function SearchForm({ initial, onSubmit, submitting, submitLabel = 'Save search', showPresets = true, onCancel }) {
  const [s, setS] = useState({ ...EMPTY_SEARCH, ...initial });
  const [more, setMore] = useState(false);
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...s, name: s.name || s.titles[0] || 'My search', minSalary: Number(s.minSalary) || 0, strictness: Number(s.strictness) });
      }}
    >
      {showPresets && !initial?._id && (
        <div>
          <div className="label">Start from a ready-made search</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => setS({ ...EMPTY_SEARCH, ...p })} className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${s.name === p.name ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted hover:text-ink'}`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="Job titles" hint="Press Enter after each one. Add 2–4 variations of the same role.">
        <ChipInput value={s.titles} onChange={set('titles')} placeholder="e.g. Frontend developer" />
      </Field>
      <Field label="Must-have skills" hint="Optional. Jobs mentioning these score higher.">
        <ChipInput value={s.keywords} onChange={set('keywords')} placeholder="e.g. react, typescript" />
      </Field>
      <Field label="Work mode"><Pills options={WORK_MODES} value={s.workModes} onChange={set('workModes')} /></Field>
      <Field label="Job type" hint="Pick Freelance or Contract to get gigs."><Pills options={JOB_TYPES} value={s.jobTypes} onChange={set('jobTypes')} /></Field>
      <Field label="Where can you work from?">
        <Pills options={{ anywhere: 'Show everything', my_country: 'Only jobs open to my country' }} value={s.eligibility} onChange={set('eligibility')} multiple={false} />
      </Field>

      <Field label={`Match strictness: ${STRICT_LABEL(s.strictness)}`} hint={`Only jobs scoring ${s.strictness} or more reach you.`}>
        <input type="range" min="30" max="90" step="5" value={s.strictness} onChange={set('strictness')} className="w-full accent-[rgb(var(--brand))]" aria-label="Match strictness" />
      </Field>

      {!more ? (
        <button type="button" onClick={() => setMore(true)} className="text-[14px] font-semibold text-brand hover:underline">More options: level, salary, locations, words to avoid</button>
      ) : (
        <div className="space-y-6 rounded-panel border border-line bg-raised p-5">
          <Field label="Level"><Pills options={SENIORITY} value={s.seniority} onChange={set('seniority')} /></Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label="Minimum yearly salary" hint="Jobs that list a lower salary are hidden. Jobs with no salary still show.">
              <Input type="number" min="0" value={s.minSalary} onChange={set('minSalary')} />
            </Field>
            <Field label="Currency">
              <Select value={s.currency} onChange={set('currency')}>{['USD', 'EUR', 'GBP', 'CAD', 'NGN', 'ZAR', 'AUD'].map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
          </div>
          <Field label="Cities or countries for on-site jobs" hint="Remote jobs ignore this."><ChipInput value={s.locations} onChange={set('locations')} placeholder="e.g. Lagos, London" /></Field>
          <Field label="Words to avoid" hint="Hide jobs that mention any of these."><ChipInput value={s.excludeKeywords} onChange={set('excludeKeywords')} placeholder="e.g. unpaid, commission only, clearance" /></Field>
        </div>
      )}

      <Field label="Name" hint="Shown in your alerts so you know which search found the job.">
        <Input value={s.name} onChange={set('name')} placeholder={s.titles[0] || 'e.g. Remote React roles'} maxLength={60} />
      </Field>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting} disabled={!s.titles.length}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
