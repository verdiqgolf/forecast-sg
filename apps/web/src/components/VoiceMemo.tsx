'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  roundId?: string; // optional: tie memo to a round
  holeId?: string;  // optional: tie memo to a specific hole
  onUploaded?: (url: string, transcript: string) => void;
};

export default function VoiceMemo({ roundId, holeId, onUploaded }: Props) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const chunks = useRef<BlobPart[]>([]);
  const [transcript, setTranscript] = useState('');
  const recogRef = useRef<any>(null);

  useEffect(() => {
    // Simple browser speech recognition (Chrome/Edge)
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';
      r.onresult = (e: any) => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          t += e.results[i][0].transcript;
        }
        setTranscript(t.trim());
      };
      recogRef.current = r;
    }
  }, []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mr = new MediaRecorder(stream, {
      mimeType: 'audio/webm', // explicit is safer
    });

    chunks.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.current.push(e.data);
      }
    };

    mr.start();

    if (recogRef.current) {
      try {
        recogRef.current.start();
      } catch {
        // no-op
      }
    }

    setRec(mr);
    setIsRecording(true);
  }

  async function stop() {
    if (!rec) return;

    const mr = rec;
    setIsRecording(false);

    // ✅ Wait for MediaRecorder to fully stop and flush all chunks
    await new Promise<void>((resolve) => {
      mr.onstop = () => {
        resolve();
      };
      mr.stop();
    });

    // Now it's safe to stop tracks
    mr.stream.getTracks().forEach((t) => t.stop());

    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch {
        // ignore
      }
    }

    // build blob *after* recorder has stopped
    const blob = new Blob(chunks.current, { type: 'audio/webm' });
    console.log('VoiceMemo blob size (bytes):', blob.size);
    chunks.current = [];

    if (!blob.size) {
      alert('No audio captured. Try again.');
      setRec(null);
      return;
    }

    const filename = `memo-${Date.now()}.webm`;
    const file = new File([blob], filename, {
      type: 'audio/webm',
    });

    try {
      // 1) Upload to Supabase Storage
      const path = `memos/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.webm`;

      const { error: upErr } = await supabase.storage
        .from('verdiq-audio')
        .upload(path, file, {
          upsert: false,
          cacheControl: '3600',
          contentType: 'audio/webm',
        });

      if (upErr) {
        console.error('Upload error:', upErr);
        alert(upErr.message);
        return;
      }

      // 2) Get the current user (for userId)
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        console.error(userErr);
        alert("Not logged in. Can't process memo.");
        return;
      }

      // 3) Call your AI processing route
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          userId: user.id,
          browserTranscript: transcript, // optional extra context
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error('AI processing error:', data);
        alert(data.error || 'AI processing failed.');
        return;
      }

      // Prefer AI transcript if your API returns one
      const finalTranscript: string =
        (data.transcript as string | undefined) ?? transcript ?? '';

      // 4) Get a public URL (for playback + storage)
      const { data: pub } = supabase.storage
        .from('verdiq-audio')
        .getPublicUrl(path);

      const publicUrl = pub?.publicUrl ?? null;

      // 5) Insert into voice_memos for long-term trend analysis
      // Make sure you created this table (as discussed earlier)
      const { error: insertErr } = await supabase.from('voice_memos').insert({
        user_id: user.id,
        round_id: roundId ?? null,
        hole_id: holeId ?? null,
        audio_url: publicUrl ?? path, // store public URL if available, else path
        transcript: finalTranscript || null,
      });

      if (insertErr) {
        console.error('voice_memos insert error:', insertErr);
        // non-fatal; we still let the user proceed
      }

      // 6) Notify parent (for UI updates, etc.)
      if (publicUrl && onUploaded) {
        onUploaded(publicUrl, finalTranscript);
      }

      alert('Uploaded, processed, and saved by Verdiq AI!');
    } catch (err: any) {
      console.error('VoiceMemo stop error:', err);
      alert(err?.message ?? 'Upload or processing failed.');
    } finally {
      setTranscript('');
      setRec(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={isRecording ? stop : start}
        className={`rounded-2xl px-4 py-2 border ${
          isRecording
            ? 'bg-red-600 text-white border-red-600'
            : 'hover:bg-gray-50'
        }`}
      >
        {isRecording ? 'Stop Recording' : 'Record Voice Note'}
      </button>
      {transcript ? (
        <span className="text-sm opacity-70 truncate">📝 {transcript}</span>
      ) : null}
    </div>
  );
}
