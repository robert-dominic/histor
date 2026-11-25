// src/features/landing/use-landing-music.ts
// The landing page's music button (landing v3 brief): it starts and stops the landing music (src/lib/landing-music.ts),
// quiet and off until clicked, and says what is playing in its tooltip. Nothing exists until there are tracks.
import { useCallback, useEffect, useRef, useState } from 'react';
import { LANDING_PLAYLIST } from '@/landing/music';
import { LandingMusic, musicTip } from '@/lib/landing-music';

export function useLandingMusic(tracks = LANDING_PLAYLIST) {
  const player = useRef<LandingMusic | null>(null);
  const [state, setState] = useState<{ playing: boolean; tip: string }>({ playing: false, tip: 'Play music' });
  const ensure = useCallback(() => {
    if (player.current === null) {
      const created = new LandingMusic(tracks);
      created.onChange(() => setState({ playing: created.playing, tip: musicTip(created.track, created.playing) }));
      player.current = created;
    }
    return player.current;
  }, [tracks]);
  // Leaving the page: the music fades out and goes.
  useEffect(
    () => () => {
      player.current?.destroy();
      player.current = null;
    },
    []
  );
  const toggle = useCallback(() => {
    if (tracks.length === 0) {
      return;
    }
    const music = ensure();
    if (music.playing) {
      music.stop();
    } else {
      music.start();
    }
  }, [ensure, tracks]);
  return { available: tracks.length > 0, playing: state.playing, tip: state.tip, toggle };
}
