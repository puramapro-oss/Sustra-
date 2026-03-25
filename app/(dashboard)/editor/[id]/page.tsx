'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EditorPage from '../page';

export default function EditorByIdPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a full implementation, this would load the video data from Supabase
    // and pass it to the editor. For now, we render the base editor.
    const videoId = params.id as string;
    if (!videoId) {
      router.push('/editor');
      return;
    }
    setLoading(false);
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-2rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-sutra-violet border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Chargement de la vidéo...</p>
        </div>
      </div>
    );
  }

  return <EditorPage />;
}
