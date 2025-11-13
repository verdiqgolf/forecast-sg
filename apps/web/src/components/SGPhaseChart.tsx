// components/partials/SGPhaseChart.tsx
'use client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';

type Row = {
  x: string;          // date label
  offtee: number;     // sg_offtee
  approach: number;   // sg_approach
  short: number;      // sg_short
  putting: number;    // sg_putting
  total?: number;     // optional
};

export default function SGPhaseChart({ data }: { data: Row[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" minTickGap={24} />
          <YAxis />
          <ReferenceLine y={0} strokeDasharray="3 3" />
          <Tooltip />
          <Legend />
          {/* stacked by component */}
          <Bar dataKey="offtee" stackId="sg" fill="#4ade80" name="Off-tee" />
          <Bar dataKey="approach" stackId="sg" fill="#60a5fa" name="Approach" />
          <Bar dataKey="short" stackId="sg" fill="#f59e0b" name="Short Game" />
          <Bar dataKey="putting" stackId="sg" fill="#ef4444" name="Putting" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
