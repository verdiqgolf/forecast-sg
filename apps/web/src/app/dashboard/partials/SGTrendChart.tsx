'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

type Datum = { id: string; x: string; sg: number; sgAvg?: number };

export default function SGTrendChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="sg" name="SG" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="sgAvg" name="Rolling Avg (5)" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
