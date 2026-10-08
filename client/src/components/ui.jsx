import { forwardRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { X, Loader2 } from 'lucide-react';

/* ── Button ─────────────────────────────────────────── */
const BTN = {
  primary: 'bg-brand text-brand-ink hover:bg-brand/90 shadow-[0_1px_0_rgb(255_255_255/0.15)_inset]',
  secondary: 'bg-surface text-ink border border-line hover:bg-raised',
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  danger: 'bg-danger text-white hover:bg-danger/90',
  soft: 'bg-brand-soft text-brand hover:bg-brand-soft/70',
};
const SIZE = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-[14px] gap-2', lg: 'h-12 px-5 text-[15px] gap-2' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', to, href, loading, className, children, icon: Icon, ...rest }, ref) {
  const cls = clsx('inline-flex items-center justify-center rounded-ctl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 whitespace-nowrap', BTN[variant], SIZE[size], className);
  const inner = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} target="_blank" rel="noreferrer noopener" {...rest}>{inner}</a>;
  return <button ref={ref} className={cls} disabled={loading || rest.disabled} {...rest}>{inner}</button>;
});

/* ── Form fields ────────────────────────────────────── */
export function Field({ label, hint, error, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <p className="mt-1.5 text-[13px] font-medium text-danger">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={clsx('input', className)} {...p} />;
});
export const Textarea = forwardRef(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={clsx('input min-h-[110px] leading-6', className)} {...p} />;
});
export function Select({ className, children, ...p }) {
  return <select className={clsx('input appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238490a8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...p}>{children}</select>;
}

/* ── Toggle switch ──────────────────────────────────── */
export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={clsx('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-55')}>
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={clsx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-line')}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}

/* ── Multi-choice pills ─────────────────────────────── */
export function Pills({ options, value = [], onChange, multiple = true }) {
  const toggle = (k) => {
    if (!multiple) return onChange(k);
    onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([k, label]) => {
        const on = multiple ? value.includes(k) : value === k;
        return (
          <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={on} className={clsx('rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors', on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted hover:text-ink')}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tag input: type and press Enter or comma ───────── */
export function ChipInput({ value = [], onChange, placeholder, max = 30 }) {
  const [text, setText] = useState('');
  const add = (raw) => {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    onChange([...new Set([...value, ...items])].slice(0, max));
    setText('');
  };
  return (
    <div className="input flex min-h-[46px] flex-wrap items-center gap-1.5 py-2">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-raised px-2.5 py-1 text-[13px] font-medium">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="text-faint hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(text); }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(text)}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[120px] flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
      />
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────── */
const TONE = {
  neutral: 'bg-raised text-muted border-line',
  brand: 'bg-brand-soft text-brand border-transparent',
  match: 'bg-match-soft text-match border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
};
export function Badge({ tone = 'neutral', className, children, icon: Icon }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-semibold', TONE[tone], className)}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/* ── Match score ring: the product's signature element ─ */
export function ScoreRing({ score = 0, size = 52, stroke = 5, className }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? 'text-match' : score >= 60 ? 'text-brand' : 'text-warn';
  return (
    <div className={clsx('relative shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={`Match score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-line" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className={clsx('stroke-current transition-[stroke-dashoffset] duration-700', tone)} />
      </svg>
      <span className={clsx('tnum absolute inset-0 grid place-items-center font-display font-bold', tone)} style={{ fontSize: size * 0.32 }}>{score}</span>
    </div>
  );
}

/* ── Loading and empty states ───────────────────────── */
export const Spinner = ({ className }) => <Loader2 className={clsx('h-5 w-5 animate-spin text-brand', className)} />;
export const Skeleton = ({ className }) => <div className={clsx('animate-pulse rounded-ctl bg-raised', className)} />;

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      {Icon && <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand"><Icon className="h-6 w-6" /></span>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1.5 max-w-md text-[15px] text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Modal / drawer ─────────────────────────────────── */
export function Modal({ open, onClose, title, children, wide, side }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-[rgb(10_15_30/0.5)] backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className={clsx('relative flex max-h-full flex-col bg-surface shadow-pop', side ? 'ml-auto h-full w-full max-w-xl border-l border-line' : clsx('m-auto w-[calc(100%-32px)] rounded-panel border border-line', wide ? 'max-w-2xl' : 'max-w-md'))}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-ctl p-1.5 text-muted hover:bg-raised hover:text-ink" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, children, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[28px] font-bold">{title}</h1>
        {children && <p className="mt-1 text-[15px] text-muted">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
