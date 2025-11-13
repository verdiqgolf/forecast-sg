'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function FilterBar({
  seedCourses,
  defaults,
}: {
  seedCourses: string[];
  defaults: { from: string; to: string; course: string; holes: '9' | '18' | 'all' };
}) {
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [course, setCourse] = useState(defaults.course);
  const [holes, setHoles] = useState<'9' | '18' | 'all'>(defaults.holes);

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function apply() {
    const q = new URLSearchParams(sp.toString());
    from ? q.set('from', from) : q.delete('from');
    to ? q.set('to', to) : q.delete('to');
    course ? q.set('course', course) : q.delete('course');
    holes && holes !== 'all' ? q.set('holes', holes) : q.delete('holes');
    router.push(`${pathname}?${q.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
      <label className="text-sm">
        From
        <input
          type="date"
          className="w-full rounded border p-2"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="text-sm">
        To
        <input
          type="date"
          className="w-full rounded border p-2"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <label className="text-sm md:col-span-2">
        Course
        <input
          list="courses"
          className="w-full rounded border p-2"
          placeholder="Type or pick…"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        />
        <datalist id="courses">
          {seedCourses.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="text-sm">
        Holes
        <select
          className="w-full rounded border p-2"
          value={holes}
          onChange={(e) => setHoles(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="18">18</option>
          <option value="9">9</option>
        </select>
      </label>

      <div className="md:col-span-5 flex gap-2 justify-end">
        <button onClick={clearAll} className="px-4 py-2 rounded-2xl border hover:bg-gray-50">
          Clear
        </button>
        <button onClick={apply} className="px-4 py-2 rounded-2xl border hover:bg-gray-50">
          Apply
        </button>
      </div>
    </div>
  );
}
