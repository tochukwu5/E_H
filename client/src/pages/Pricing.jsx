import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Minus } from 'lucide-react';
import PlanGrid from '../components/PlanGrid';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../lib/api';

const ROWS = [
  ['Active job searches', (l) => l.niches],
  ['Alert speed', (l) => (l.delivery === 'instant' ? 'Within minutes' : 'Daily digest')],
  ['Telegram and email', () => true],
  ['WhatsApp', (l) => l.channels.includes('whatsapp')],
  ['Alerts per day', (l) => l.maxAlertsPerDay],
  ['AI match reasons', (l) => l.aiMatchReasons],
  ['AI cover letters per month', (l) => l.coverLetters],
  ['Approve-first applications', (l) => l.autoApply !== 'off'],
  ['Auto mode', (l) => l.autoApply === 'auto'],
  ['Prepared applications per month', (l) => l.autoApplyPerMonth || false],
  ['Company watchlist', (l) => l.companyWatchlist || false],
  ['Application tracker and follow-ups', () => true],
];

const Cell = ({ v }) => (v === true ? <Check className="mx-auto h-4 w-4 text-match" aria-label="Included" /> : v === false ? <Minus className="mx-auto h-4 w-4 text-faint" aria-label="Not included" /> : <span className="tnum">{v}</span>);

export default function Pricing() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const { data } = useQuery({ queryKey: ['plans'], queryFn: () => get('/billing/plans'), staleTime: Infinity });
  useEffect(() => {
    document.title = 'Pricing — EmployHunt';
  }, []);
  const change = useMutation({
    mutationFn: (plan) => post('/billing/change-plan', { plan }),
    onSuccess: (d) => {
      setUser(d.user);
      toast.success(`You're on the ${d.user.plan} plan`);
      nav('/app');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="page py-14">
      <div className="max-w-2xl">
        <h1 className="text-[40px] font-bold sm:text-[48px]">Pay for speed, not for jobs</h1>
        <p className="mt-3 text-[17px] text-muted">Every plan sees the same jobs. Paid plans get them faster, on more channels, with applications prepared for you. Cancel any time.</p>
      </div>
      <div className="mt-12">
        <PlanGrid
          currentPlan={user?.plan}
          choosing={change.isPending ? change.variables : null}
          ctaFor={user ? undefined : (p) => <Button to={`/register?plan=${p.id}`} className="w-full" variant={p.popular ? 'primary' : 'secondary'}>{p.price ? `Start with ${p.name}` : 'Start free'}</Button>}
          onChoose={(id) => change.mutate(id)}
        />
      </div>

      {data && (
        <section className="mt-20">
          <h2 className="text-[28px] font-bold">Compare plans</h2>
          <div className="mt-6 overflow-x-auto rounded-panel border border-line bg-surface">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-4 text-left font-semibold">Feature</th>
                  {data.plans.map((p) => <th key={p.id} className="px-5 py-4 text-center font-semibold">{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, fn]) => (
                  <tr key={label} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3.5 text-muted">{label}</td>
                    {data.plans.map((p) => <td key={p.id} className="px-5 py-3.5 text-center font-medium"><Cell v={fn(p.limits)} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] text-faint">Prices in US dollars. Local payment options (cards, bank transfer and USDC) are coming soon.</p>
        </section>
      )}
    </div>
  );
}
