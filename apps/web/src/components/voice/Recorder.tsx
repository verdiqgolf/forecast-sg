'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Status = 'idle' | 'recording' | 'paused' | 'stopped' | 'uploading' | 'processing';

export default function Recorder() {
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // timer
  useEffect(() => {
    if (status === 'recording') {
      startedAtRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current) {
          setElapsed(Math.floor((performance.now() - startedAtRef.current) / 1000));
        }
      }, 250) as unknown as number;
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const start = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(); // default timeslice; gather in ondataavailable
      mediaRecorderRef.current = mr;
      setElapsed(0);
      setStatus('recording');
    } catch (e: any) {
      setError(e?.message ?? 'Microphone permissions denied or unsupported browser.');
    }
  };

  const pause = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
    }
  };

  const resume = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
    }
  };

const stop = async () => {
  const mr = mediaRecorderRef.current;
  if (!mr) return;
  setStatus('stopped');

  await new Promise<void>((resolve) => {
    mr.onstop = () => resolve();
    mr.stop();
  });

  // stop tracks
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;

  const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
  chunksRef.current = [];

  const def = new Date().toISOString().replace(/[:.]/g, '-');
  const name =
    prompt('Name this recording (optional):', `verdiq-${def}`) ||
    `verdiq-${def}`;

  setStatus('uploading');
  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error('You must be signed in to upload.');

    const path = `${user.id}/${name}.webm`;

    // Upload to Storage bucket: recordings
    const { error: upErr } = await supabase
      .storage
      .from('recordings') // <- bucket name stays as-is
      .upload(path, blob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (upErr) throw upErr;

    // Call our AI processing route
    setStatus('processing');
    const res = await fetch('/api/voice/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ path, userId: user.id }), 
      // instead of JSON.stringify({ path })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Processing failed.');
    }

    alert('Uploaded & processed by Verdiq AI!');
  } catch (e: any) {
    console.error(e);
    setError(e?.message ?? 'Upload or processing failed.');
  } finally {
    setStatus('idle');
    setElapsed(0);
  }
};


  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="font-semibold">Voice Recorder</div>
      <div className="text-sm opacity-70">Status: {status}</div>
      <div className="text-3xl tabular-nums">{minutes}:{seconds}</div>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={start}
          disabled={status === 'recording' || status === 'paused' || status === 'uploading' || status === 'processing'}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
        >
          Start
        </button>
        <button
          onClick={pause}
          disabled={status !== 'recording'}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
        >
          Pause
        </button>
        <button
          onClick={resume}
          disabled={status !== 'paused'}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
        >
          Resume
        </button>
        <button
          onClick={stop}
          disabled={status !== 'recording' && status !== 'paused'}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
        >
          Stop & Upload
        </button>
      </div>

      <div className="text-xs opacity-60">
        Files are saved privately to Supabase Storage (bucket: <code>recordings</code>).
      </div>
    </div>
  );
}
