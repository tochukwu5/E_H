import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { get } from '../lib/api';
import { Button, Skeleton } from './ui';

/** Plans come from the API so prices and limits are defined in one place (server/src/config/plans.js). */
export default function PlanGrid({ currentPlan, onChoose, choosing, ctaFor }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['plans'], queryFn: () => get('/billing/plans'), staleTime: Infinity });
  if (isLoading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[420px]" />)}</div>;
  if (error || !data?.plans) return <div className="panel p-6 text-[15px] text-muted">Plans couldn't load. {error?.message}</div>;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {data.plans.map((p) => {
        const current = currentPlan === p.id;
        return (
          <div key={p.id} className={clsx('relative flex flex-col rounded-panel border bg-surface p-6', p.popular ? 'border-brand shadow-pop' : 'border-line')}>
            {p.popular && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-brand-ink">Most chosen</span>}
            <h3 className="text-[20px] font-bold">{p.name}</h3>
            <p className="mt-1 min-h-[44px] text-[14px] text-muted">{p.tagline}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="tnum font-display text-[40px] font-bold leading-none">${p.price}</span>
              <span className="text-[14px] text-muted">{p.price ? '/month' : 'forever'}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5 text-[14px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-match" />{f}</li>
              ))}
            </ul>
            <div className="mt-7">
              {ctaFor ? ctaFor(p) : (
                <Button className="w-full" variant={p.popular ? 'primary' : 'secondary'} disabled={current} loading={choosing === p.id} onClick={() => onChoose?.(p.id)}>
                  {current ? 'Your current plan' : p.price ? `Switch to ${p.name}` : 'Use Free'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
