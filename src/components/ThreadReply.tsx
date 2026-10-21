import { formatTime } from '../shared/format.ts';
import { Avatar } from './Avatar.tsx';

export type ThreadReplyProps = {
  authorName: string;
  authorInitials: string;
  createdAt: string;
  text: string;
};

/** Figma "Thread Reply" (373:2149). Render a list of these inside an <ol>/<ul> as <li>. */
export function ThreadReply({ authorName, authorInitials, createdAt, text }: ThreadReplyProps) {
  return (
    <div className="k-reply">
      <Avatar initials={authorInitials} size={32} />
      <div className="k-reply__text">
        <p className="k-reply__who">
          <span className="k-reply__name">{authorName}</span>
          <time className="k-reply__time" dateTime={createdAt}>
            {formatTime(createdAt)}
          </time>
        </p>
        <p className="k-reply__body">{text}</p>
      </div>
    </div>
  );
}
