import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { Icon, NavBar, Pill, PlayButton, Screen } from '../../components/index.ts';
import { useAppState } from '../../data/react.tsx';
import { AH_MA_CLIP_URL, useClipUrl, usePlayer } from '../../lib/audio.ts';
import { usePersona } from '../../lib/session.ts';
import { paths } from '../../app/paths.ts';
import {
  formatDay,
  DEMO_TODAY,
  addDays,
  calendarDays,
  formatMonth,
  personById,
  storyPill,
  streak,
  type AppState,
  type CalendarDay,
  type Story,
} from '../../shared/index.ts';
import './archive.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-09" shifted by delta months. */
function shiftMonth(yearMonth: string, delta: number): string {
  const [y = 0, m = 1] = yearMonth.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Whole weeks (Sunday first) that cover the month: 5 for September 2026, as in the Figma frame. */
function gridDates(yearMonth: string): string[] {
  const first = `${yearMonth}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const [y = 0, m = 1] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = addDays(first, -weekday);
  return Array.from({ length: Math.ceil((weekday + daysInMonth) / 7) * 7 }, (_, i) => addDays(start, i));
}

/** "Sunday 13 September" for screen readers. */
function longDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
  const month = d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  return `${weekday} ${d.getUTCDate()} ${month}`;
}

function dayLabel(date: string, day: CalendarDay): string {
  const parts = [longDay(date)];
  if (date === DEMO_TODAY) parts.push('today');
  parts.push(day.hasMeaning ? 'has meaning' : 'has recording, no meaning yet');
  return parts.join(', ');
}

function storyLink(state: AppState, story: Story): string {
  if (story.status === 'draft') return paths.save(story.id);
  if (state.meanings.some((m) => m.storyId === story.id)) return paths.meanings(story.id);
  return paths.send(story.id);
}

/** Plays the story clip from this phone, or Ah Ma's placeholder clip when none is saved. */
function ClipPlay({ storyId, title }: { storyId: string | null; title: string }) {
  const saved = useClipUrl(storyId);
  const player = usePlayer(saved ?? AH_MA_CLIP_URL);
  return <PlayButton playing={player.playing} onClick={player.toggle} label={`Play ${title}`} disabled={player.failed} />;
}

function StoryRow({ state, story }: { state: AppState; story: Story }) {
  const pill = storyPill(state, story.id);
  return (
    <li className="arch-story">
      <div className="arch-story__text">
        <p className="t-muted">
          {formatDay(story.date)} · {story.place}
        </p>
        <Link to={storyLink(state, story)} className="arch-story__title t-subtitle">
          {story.title}
        </Link>
      </div>
      {pill && <Pill kind={pill} />}
      <ClipPlay storyId={story.id} title={story.title} />
    </li>
  );
}

type DayCellProps = {
  date: string;
  inMonth: boolean;
  day: CalendarDay | undefined;
  selected: boolean;
  onSelect: (date: string) => void;
  register: (date: string, el: HTMLButtonElement | null) => void;
};

function DayCell({ date, inMonth, day, selected, onSelect, register }: DayCellProps) {
  const num = Number(date.slice(8));
  const isToday = date === DEMO_TODAY;
  const classes = ['arch-day'];
  if (!inMonth) classes.push('arch-day--out');
  if (day?.hasMeaning) classes.push('arch-day--meaning');
  else if (day) classes.push('arch-day--recording');
  if (isToday) classes.push('arch-day--today');

  if (!day) {
    return (
      <li>
        <span className={classes.join(' ')}>{num}</span>
      </li>
    );
  }
  if (selected) classes.push('arch-day--selected');
  return (
    <li>
      <button
        type="button"
        ref={(el) => register(date, el)}
        className={classes.join(' ')}
        aria-label={dayLabel(date, day)}
        aria-pressed={selected}
        aria-current={isToday ? 'date' : undefined}
        data-date={date}
        onClick={() => onSelect(date)}
      >
        <span>{num}</span>
        <span className="arch-dot" aria-hidden="true" />
      </button>
    </li>
  );
}

/** 01 Archive (316:59). */
export function ArchiveScreen() {
  const state = useAppState();
  const persona = usePersona();
  const name = personById(state, persona)?.name ?? 'Your';
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [selected, setSelected] = useState<string>(DEMO_TODAY);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const days = calendarDays(state);
  const count = streak(state, DEMO_TODAY).count;

  const register = (date: string, el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(date, el);
    else buttons.current.delete(date);
  };

  /** Left and right step through the recording days. Up and down go to the same weekday in the next or previous week. */
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const date = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-date]')?.dataset.date;
    if (!date) return;
    const sorted = [...buttons.current.keys()].sort();
    const at = sorted.indexOf(date);
    let next: string | undefined;
    if (e.key === 'ArrowRight') next = sorted[at + 1];
    else if (e.key === 'ArrowLeft') next = sorted[at - 1];
    else if (e.key === 'ArrowDown') next = sorted.find((d) => d >= addDays(date, 7));
    else if (e.key === 'ArrowUp') next = [...sorted].reverse().find((d) => d <= addDays(date, -7));
    else return;
    e.preventDefault();
    if (next) buttons.current.get(next)?.focus();
  };

  const selectedDay = days.get(selected);
  const selectedStories = selectedDay ? state.stories.filter((s) => selectedDay.storyIds.includes(s.id)) : [];

  return (
    <Screen nav={<NavBar title="Archive" />} tab="archive">
      <section className="k-card arch-card" aria-label="Recording calendar">
        <div className="arch-head">
          <h2 className="arch-month">{formatMonth(month)}</h2>
          <p className="t-muted t-italic">{name}'s memory lane</p>
          {count > 0 && <Pill kind="streak">{count} day streak</Pill>}
          <div className="arch-nav">
            <button type="button" className="arch-nav__btn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
              <Icon name="chev-left" size={18} />
            </button>
            <button type="button" className="arch-nav__btn" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
              <Icon name="chev-right" size={18} />
            </button>
          </div>
        </div>

        <ul className="arch-grid arch-grid--names" aria-hidden="true">
          {WEEKDAYS.map((w) => (
            <li key={w} className="arch-weekday t-muted">
              {w}
            </li>
          ))}
        </ul>
        <ul className="arch-grid" aria-label={`Days in ${formatMonth(month)}`} onKeyDown={onKeyDown}>
          {gridDates(month).map((date) => (
            <DayCell
              key={date}
              date={date}
              inMonth={date.startsWith(month)}
              day={days.get(date)}
              selected={date === selected}
              onSelect={setSelected}
              register={register}
            />
          ))}
        </ul>

        <div className="arch-detail" aria-live="polite">
          {selectedStories.length > 0 ? (
            <ul className="arch-stories">
              {selectedStories.map((s) => (
                <StoryRow key={s.id} state={state} story={s} />
              ))}
            </ul>
          ) : (
            <div className="arch-story">
              <div className="arch-story__text">
                <p className="t-muted">{formatDay(selected)}</p>
                <p className="t-muted">
                  {selectedDay ? 'A recording from this day. Details are not in this demo.' : 'No recording on this day.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <ul className="arch-legend" aria-label="Legend">
        <li>
          <span className="arch-key arch-key--meaning">
            <span className="arch-dot" aria-hidden="true" />
          </span>
          Has meaning
        </li>
        <li>
          <span className="arch-key arch-key--recording" />
          No meaning yet
        </li>
        <li>
          <span className="arch-key arch-key--today" />
          Today
        </li>
      </ul>
    </Screen>
  );
}
