'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

type Row = {
  x: string;
  offtee: number;
  approach: number;
  short: number;
  putting: number;
  total: number;
};

export default function SGPhaseChart({ data }: { data: Row[] }) {
  const [show, setShow] = useState({
    offtee: true,
    approach: true,
    short: true,
    putting: true,
    total: false, // off by default; enable to compare sum vs total
  });

  const toggle = (k: keyof typeof show) =>
    setShow((s) => ({ ...s, [k]: !s[k] }));

  const anyOn = Object.values(show).some(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={show.offtee} onChange={() => toggle('offtee')} />
          Off-tee
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={show.approach} onChange={() => toggle('approach')} />
          Approach
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={show.short} onChange={() => toggle('short')} />
          Short
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={show.putting} onChange={() => toggle('putting')} />
          Putting
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={show.total} onChange={() => toggle('total')} />
          Total
        </label>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" />
            {show.offtee && <Line type="monotone" dataKey="offtee" name="Off-tee" dot={false} strokeWidth={2} />}
            {show.approach && <Line type="monotone" dataKey="approach" name="Approach" dot={false} strokeWidth={2} />}
            {show.short && <Line type="monotone" dataKey="short" name="Short" dot={false} strokeWidth={2} />}
            {show.putting && <Line type="monotone" dataKey="putting" name="Putting" dot={false} strokeWidth={2} />}
            {show.total && <Line type="monotone" dataKey="total" name="Total" dot={false} strokeWidth={2} />}
            {!anyOn && <ReferenceLine y={0} stroke="#ccc" />} {/* fallback */}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
