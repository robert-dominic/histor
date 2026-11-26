// src/features/landing/use-landing-music.ts
// The landing page's music button (landing v3 brief): it starts and stops the landing music (src/lib/landing-music.ts),
// quiet and off until clicked, and says what is playing in its tooltip. Nothing exists until there are tracks.
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { RING } from '@/features/landing/music-ring';
import { LANDING_PLAYLIST } from '@/landing/music';
import { LandingMusic, musicTip } from '@/lib/landing-music';

export function useLandingMusic(tracks = LANDING_PLAYLIST) {
  const player = useRef<LandingMusic | null>(null);
  /** The progress ring: written straight from the music's clock, never through state. */
  const ringRef = useRef<SVGCircleElement>(null);
  const [state, setState] = useState<{ playing: boolean; tip: string }>({ playing: false, tip: 'Play music' });
  const ensure = useCallback(() => {
    if (player.current === null) {
      const created = new LandingMusic(tracks);
      created.onChange(() => setState({ playing: created.playing, tip: musicTip(created.track, created.playing) }));
      player.current = created;
    }
    return player.current;
  }, [tracks]);
  // While it plays, the ring fills with the current track (and starts again on the next one).
  useEffect(() => {
    if (!state.playing) {
      return;
    }
    const ring = ringRef.current;
    const fill = () => {
      if (ring !== null && player.current !== null) {
        ring.style.strokeDashoffset = String(RING.circumference * (1 - player.current.progress()));
      }
    };
    gsap.ticker.add(fill);
    return () => {
      gsap.ticker.remove(fill);
      if (ring !== null) {
        ring.style.strokeDashoffset = String(RING.circumference);
      }
    };
  }, [state.playing]);
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
  return { available: tracks.length > 0, playing: state.playing, tip: state.tip, toggle, ringRef };
}
