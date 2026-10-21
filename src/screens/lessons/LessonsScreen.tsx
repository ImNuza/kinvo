import { Link } from 'react-router';
import { ButtonLink, NavBar, Pill, Screen } from '../../components/index.ts';
import { useAppState } from '../../data/react.tsx';
import { paths } from '../../app/paths.ts';
import { lessons, type Lesson } from '../../shared/index.ts';
import { shortDay } from './dates.ts';
import './lessons.css';

/** "Sunday lunch" -> "lunch" */
function occasionWord(occasion: string): string {
  const words = occasion.trim().split(/\s+/);
  return (words[words.length - 1] ?? '').toLowerCase();
}

function sourceLine(lesson: Lesson): string {
  if (lesson.agreed) return `${lesson.agreedAuthor?.name ?? 'Family'}'s agreed meaning`;
  if (lesson.pill === 'differ') return 'Meanings differ';
  if (lesson.suggestedBy) return `${lesson.suggestedBy.name}'s meaning`;
  return '';
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const source = sourceLine(lesson);
  const from = `from ${shortDay(lesson.storyDate)} ${occasionWord(lesson.occasion)}`.trim();
  const differ = lesson.pill === 'differ';
  return (
    <li className="k-card lesson">
      <div className="lesson__text">
        <p className="t-muted">Lesson · {from}</p>
        <p className="t-title" lang="nan">
          {lesson.phrase.phrase}
        </p>
        <p className="t-muted">{[lesson.phrase.english, source].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="lesson__foot">
        {lesson.pill ? <Pill kind={lesson.pill} /> : <span />}
        {differ ? (
          <Link to={paths.meanings(lesson.storyId)} className="lesson__link t-subtitle">
            Compare meanings
          </Link>
        ) : (
          <Link to={paths.practise(lesson.storyId)} className="lesson__link t-subtitle">
            Practise
          </Link>
        )}
      </div>
    </li>
  );
}

/** 12 Lessons (319:531). */
export function LessonsScreen() {
  const state = useAppState();
  const items = lessons(state);

  return (
    <Screen nav={<NavBar title="Lessons" />} tab="lessons">
      <div className="lessons-head">
        <h2 className="t-heading">Lessons</h2>
        <p className="t-muted t-italic">Only from recorded conversations</p>
      </div>
      {items.length > 0 ? (
        <ul className="lessons-list">
          {items.map((lesson) => (
            <LessonCard key={lesson.storyId} lesson={lesson} />
          ))}
        </ul>
      ) : (
        <div className="lessons-empty">
          <p className="t-muted">Record a conversation with Ah Ma to get your first lesson.</p>
          <ButtonLink to={paths.record()} icon="mic">
            Record
          </ButtonLink>
        </div>
      )}
    </Screen>
  );
}
