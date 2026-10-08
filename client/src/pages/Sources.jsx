import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { get } from '../lib/api';
import { Badge, Skeleton } from '../components/ui';
import { timeAgo } from '../lib/format';

export default function Sources() {
  const { data, isLoading } = useQuery({ queryKey: ['sources'], queryFn: () => get('/sources') });
  useEffect(() => {
    document.title = 'Where jobs come from — EmployHunt';
  }, []);
  const groups = data ? Object.entries(data.groups) : [];

  return (
    <div className="page py-12">
      <div className="max-w-2xl">
        <h1 className="text-[38px] font-bold sm:text-[46px]">Where our jobs come from</h1>
        <p className="mt-3 text-[17px] leading-8 text-muted">
          EmployHunt only reads official, public job feeds: APIs that companies and job boards publish so others can show their listings. We don't scrape LinkedIn, Indeed or other sites that forbid it. Every listing links back to its original posting.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="mt-10 h-[500px]" />
      ) : (
        <div className="mt-12 space-y-12">
          {groups.map(([gid, label]) => {
            const list = data.sources.filter((s) => s.group === gid);
            const planned = data.planned.filter((s) => s.group === gid);
            return (
              <section key={gid}>
                <h2 className="text-[22px] font-bold">{label}</h2>
                <div className="mt-4 overflow-hidden rounded-panel border border-line bg-surface">
                  <ul className="divide-y divide-line">
                    {list.map((s) => (
                      <li key={s.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[15px] font-semibold hover:text-brand">{s.name}<ExternalLink className="h-3.5 w-3.5 text-faint" /></a>
                          {s.group === 'ats' && <div className="text-[13px] text-muted">{s.companies} compan{s.companies === 1 ? 'y' : 'ies'} tracked</div>}
                          {s.note && s.group !== 'ats' && <div className="text-[13px] text-muted">{s.note}</div>}
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-faint">
                          {s.lastRun?.at && <span>Checked {timeAgo(s.lastRun.at)}</span>}
                          {s.enabled ? <Badge tone="match">Active</Badge> : <Badge>Needs setup</Badge>}
                        </div>
                      </li>
                    ))}
                    {planned.map((s) => (
                      <li key={s.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div><div className="text-[15px] font-semibold">{s.name}</div><div className="text-[13px] text-muted">{s.note}</div></div>
                        <Badge>Planned</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
