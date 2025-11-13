// components/partials/FilterBar.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type Search = {
  from?: string;
  to?: string;
  course?: string;
  holes?: '9' | '18' | 'all';
};

export default function FilterBar({
  seedCourses = [],
  defaults,
}: {
  seedCourses?: string[];
  defaults?: { from: string; to: string; course: string; holes: '9' | '18' | 'all' };
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const initial = useMemo(() => ({
    from: defaults?.from ?? sp.get('from') ?? '',
    to: defaults?.to ?? sp.get('to') ?? '',
    course: defaults?.course ?? sp.get('course') ?? '',
    holes: (defaults?.holes ?? (sp.get('holes') as Search['holes'])) || 'all',
  }), [sp, defaults]);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [course, setCourse] = useState(initial.course);
  const [holes, setHoles] = useState<Search['holes']>(initial.holes);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (course) params.set('course', course);
    if (holes && holes !== 'all') params.set('holes', holes);
    router.push(`?${params.toString()}`);
  }, [from, to, course, holes, router]);

  // Apply on Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') apply(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apply]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
      <label className="flex flex-col text-sm">From
        <input value={from} onChange={e=>setFrom(e.target.value)} type="date"
          className="rounded-xl p-2 bg-neutral-900 border border-neutral-700" />
      </label>
      <label className="flex flex-col text-sm">To
        <input value={to} onChange={e=>setTo(e.target.value)} type="date"
          className="rounded-xl p-2 bg-neutral-900 border border-neutral-700" />
      </label>
      <label className="flex flex-col text-sm md:col-span-2">Course
        <input list="courses" value={course} onChange={e=>setCourse(e.target.value)} placeholder="Any course"
          className="rounded-xl p-2 bg-neutral-900 border border-neutral-700" />
        <datalist id="courses">
          {seedCourses.map(c => <option key={c} value={c} />)}
        </datalist>
      </label>
      <label className="flex flex-col text-sm">Holes
        <select value={holes} onChange={e=>setHoles(e.target.value as Search['holes'])}
          className="rounded-xl p-2 bg-neutral-900 border border-neutral-700">
          <option value="all">All</option>
          <option value="9">9</option>
          <option value="18">18</option>
        </select>
      </label>
      <button onClick={apply} className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition">
        Apply
      </button>
    </div>
  );
}
