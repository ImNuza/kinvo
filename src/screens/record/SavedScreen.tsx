import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, ButtonLink, Icon, NavBar, PlayButton, Screen } from '../../components/index.ts';
import { paths } from '../../app/paths.ts';
import { useAppState } from '../../data/react.tsx';
import { useVariant } from '../../lib/session.ts';
import { DEMO_TODAY, addDays, formatDay, storyById, streak } from '../../shared/index.ts';
import { StoryNotFound } from './StoryNotFound.tsx';
import { useStoryClip } from './useStoryClip.ts';
import './record.css';

/** The streak strip shows this many days, ending today. */
const STRIP_DAYS = 5;

function weekdayLetter(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'narrow', timeZone: 'UTC' });
}

/** 05 Saved (316:470). A/B: see useVariant(). */
export function SavedScreen() {
  const { storyId = '' } = useParams();
  const state = useAppState();
  const variant = useVariant();
  const player = useStoryClip(storyId);
  const [askHidden, setAskHidden] = useState(false);

  const story = storyById(state, storyId);
  if (!story) return <StoryNotFound current="Saved" />;

  const { count, days: streakDays } = streak(state, DEMO_TODAY);
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(DEMO_TODAY, i - (STRIP_DAYS - 1)));
  const playLabel = player.playing ? 'Pause recording' : 'Play recording';

  return (
    <Screen nav={<NavBar trail={[{ label: 'Record', to: paths.record() }]} current="Saved" />} tab="record">
      <div className="rec-saved">
        <p className="rec-saved__status t-subtitle t-success" role="status">
          <Icon name="check" size={14} />
          <span>Saved</span>
        </p>
        <div className="rec-streak">
          <Icon name="flame" size={24} className="rec-streak__flame" />
          <span className="rec-streak__count">{count}</span>
        </div>
        <p className="rec-saved__caption t-subtitle">
          days with Ah Ma
        </p>
        <ul className="rec-days" aria-label="Last five days">
          {strip.map((date) => {
            const inStreak = streakDays.includes(date);
            const isToday = date === DEMO_TODAY;
            const cls = inStreak ? 'rec-day rec-day--on' : isToday ? 'rec-day rec-day--today' : 'rec-day';
            return (
              <li key={date} className={cls}>
                <span aria-hidden="true">{weekdayLetter(date)}</span>
                <span className="sr-only">
                  {formatDay(date)}
                  {inStreak ? ', in the streak' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <h2 className="rec-saved__title t-subtitle">{story.title}</h2>
      <div className="rec-play">
        <PlayButton playing={player.playing} onClick={player.toggle} label="Play recording" tone="primary" />
        <span className="t-subtitle" aria-hidden="true">
          {playLabel}
        </span>
      </div>

      {variant === 'b' && !askHidden && (
        <section className="rec-ask k-card" aria-labelledby="rec-ask-title">
          <h3 id="rec-ask-title" className="t-subtitle">
            Ask a family member?
          </h3>
          <p className="t-muted">A family member can explain what Ah Ma said and suggest a reply.</p>
          <div className="rec-ask__actions">
            <ButtonLink to={paths.send(story.id)} variant="primary" size="md">
              Ask for a meaning
            </ButtonLink>
            <Button variant="ghost" size="md" onClick={() => setAskHidden(true)}>
              Not now
            </Button>
          </div>
        </section>
      )}
    </Screen>
  );
}
