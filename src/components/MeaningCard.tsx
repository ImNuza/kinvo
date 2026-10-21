import { formatTime } from '../shared/format.ts';
import { Avatar } from './Avatar.tsx';
import { Button } from './Button.tsx';
import { Pill } from './Pill.tsx';

export type MeaningCardProps = {
  authorName: string;
  authorInitials: string;
  /** ISO time, shown as "7:40 pm". */
  createdAt: string;
  text: string;
  /** Agreed state: green border and an Agreed pill, no button. */
  agreed?: boolean;
  /** Shows the "Mark as agreed" button when set and not agreed. */
  onMarkAgreed?: () => void;
  className?: string;
};

/** Figma "Meaning Card" (373:2148). */
export function MeaningCard({ authorName, authorInitials, createdAt, text, agreed = false, onMarkAgreed, className }: MeaningCardProps) {
  return (
    <article
      className={['k-meaning', agreed ? 'k-meaning--agreed' : '', className ?? ''].filter(Boolean).join(' ')}
      aria-label={`${authorName}'s meaning${agreed ? ', agreed' : ''}`}
    >
      <div className="k-meaning__head">
        <Avatar initials={authorInitials} size={32} />
        <p className="k-meaning__who">
          <span className="k-meaning__name">{authorName}</span>
          <time className="k-meaning__time" dateTime={createdAt}>
            {formatTime(createdAt)}
          </time>
        </p>
        {agreed && <Pill kind="agreed" />}
      </div>
      <p className="k-meaning__text">{text}</p>
      {!agreed && onMarkAgreed && (
        <Button variant="outline" size="sm" onClick={onMarkAgreed} className="k-meaning__agree">
          Mark as agreed
        </Button>
      )}
    </article>
  );
}
