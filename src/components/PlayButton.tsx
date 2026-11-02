import { Icon } from './Icon.tsx';

export type PlayButtonProps = {
  playing: boolean;
  onClick: () => void;
  /** Accessible name, e.g. "Play Ah Ma's voice". Becomes "Pause ..." while playing. */
  label: string;
  /** "filled" is the 34px solid teal circle on 09a. */
  tone?: 'default' | 'primary' | 'filled';
  disabled?: boolean;
};

/** 36px outlined circle with play or pause (01, 05, 09, 13), or a filled one (09a). */
export function PlayButton({ playing, onClick, label, tone = 'default', disabled }: PlayButtonProps) {
  return (
    <button
      type="button"
      className={`k-play k-play--${tone}`}
      onClick={onClick}
      aria-label={playing ? label.replace(/^Play/, 'Pause') : label}
      aria-pressed={playing}
      disabled={disabled}
    >
      <Icon name={playing ? 'pause' : 'play'} size={14} />
    </button>
  );
}
