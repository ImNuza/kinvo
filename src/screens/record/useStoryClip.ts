import { AH_MA_CLIP_URL, usePlayer, useClipUrl, type Player } from '../../lib/audio.ts';

/** Player for the clip saved with a story. Falls back to the placeholder clip when the story has no audio. */
export function useStoryClip(storyId: string): Player {
  const clipUrl = useClipUrl(storyId);
  return usePlayer(clipUrl ?? AH_MA_CLIP_URL);
}
