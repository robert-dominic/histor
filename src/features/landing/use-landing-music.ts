// src/features/landing/use-landing-music.ts
// The landing page's Music pill (landing brief, 2): it plays and pauses the landing playlist through the one sound
// engine and the playlist player (src/lib/sound/music.ts). Nothing exists until there are tracks.
import { useCallback, useEffect, useRef, useState } from 'react';
import { LANDING_PLAYLIST } from '@/landing/music';
import { sound } from '@/lib/sound';
import { MusicPlayer } from '@/lib/sound/music';

export function useLandingMusic(tracks = LANDING_PLAYLIST) {
  const playerRef = useRef<MusicPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(
    () => () => {
      playerRef.current?.stop();
      playerRef.current = null;
    },
    []
  );
  const toggle = useCallback(() => {
    if (tracks.length === 0) {
      return;
    }
    if (playerRef.current === null) {
      playerRef.current = new MusicPlayer(sound);
      playerRef.current.setPlace('story', { story: tracks });
    }
    sound.unlock();
    if (playing) {
      playerRef.current.pause();
    } else {
      playerRef.current.resume();
    }
    setPlaying(!playing);
  }, [playing, tracks]);
  return { available: tracks.length > 0, playing, toggle };
}
