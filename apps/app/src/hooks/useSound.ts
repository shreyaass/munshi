import { useEffect, useState, useCallback } from 'react';
import { sound, type SoundType } from '../lib/sound';

export function useSound() {
  const [enabled, setEnabledState] = useState<boolean>(() => sound.isEnabled());

  useEffect(() => {
    return sound.subscribe((next) => {
      setEnabledState(next);
    });
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    sound.setEnabled(next);
  }, []);

  const play = useCallback((type: SoundType) => {
    sound.play(type);
  }, []);

  return {
    soundEnabled: enabled,
    setSoundEnabled: setEnabled,
    play,
  };
}
