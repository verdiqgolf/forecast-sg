import { supabaseServer } from '@/lib/supabaseServer';
import Recorder from '@/components/voice/Recorder';

type Obj = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  metadata: Record<string, any> | null;
};

export const revalidate = 0; // show new uploads immediately

export default async function VoicePage() {
  const supabase = await supabaseServer();

  // get user id (to scope listing)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  let objects: Obj[] = [];
  if (userId) {
    const { data: objs, error: listErr } = await supabase
      .storage
      .from('recordings')
      .list(userId, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } });

    if (!listErr && objs) objects = objs as any;
  }

  // make short-lived signed URLs for playback
  const playable = await Promise.all(
    objects.map(async (o) => {
      const fullPath = `${userId}/${o.name}`;
      const { data, error } = await supabase
        .storage
        .from('recordings')
        .createSignedUrl(fullPath, 60 * 30); // 30 minutes
      return {
        name: o.name,
        path: fullPath,
        url: data?.signedUrl ?? null,
        updated: o.updated_at,
      };
    })
  );

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Voice</h1>

      <Recorder />

      <div className="rounded-2xl border">
        <div className="p-4 font-semibold">My Recordings</div>
        <div className="divide-y">
          {!playable.length ? (
            <div className="p-4 text-sm opacity-70">No recordings yet.</div>
          ) : (
            playable.map((p) => (
              <div key={p.path} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs opacity-60">
                    {new Date(p.updated).toLocaleString()}
                  </div>
                </div>
                <div className="shrink-0">
                  {p.url ? (
                    <audio controls src={p.url} className="w-64" />
                  ) : (
                    <span className="text-sm text-red-600">No URL</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
