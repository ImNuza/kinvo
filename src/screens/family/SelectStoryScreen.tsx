import { useNavigate, useParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { ButtonLink, NavBar, Screen } from '../../components/index.ts';
import { useAppState } from '../../data/react.tsx';
import { formatDayMonth, personById, type Story } from '../../shared/index.ts';
import { isPhotoStory, storyDetail } from './people.ts';
import './family.css';

const TRAIL = [{ label: 'Family', to: paths.family() }];

/** Newest day first, newest recording first within a day. */
function byNewest(a: Story, b: Story) {
  return b.date.localeCompare(a.date) || Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

/** 06c Select a story (560:3715). Tapping a story opens 07 Send story for that person. */
export function SelectStoryScreen() {
  const { personId = '' } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const person = personById(state, personId);

  if (!person) {
    return (
      <Screen nav={<NavBar trail={TRAIL} current="Select a story" />} tab="family">
        <div className="stack gap-4 fam-missing">
          <p className="t-title">Family member not found</p>
          <ButtonLink variant="outline" size="md" to={paths.family()}>
            Back to Family
          </ButtonLink>
        </div>
      </Screen>
    );
  }

  const stories = state.stories.filter((s) => s.status === 'saved').sort(byNewest);
  // Suggest the newest story the family is already explaining, as in the scenario.
  const suggested = stories.find((s) => state.meanings.some((m) => m.storyId === s.id)) ?? stories[0];

  return (
    <Screen nav={<NavBar trail={TRAIL} current="Select a story" />} tab="family" bodyClassName="pick-body">
      <header className="pick-head">
        <h2 className="t-heading">Select a story</h2>
        <p className="t-body t-muted">Choose a story to send to {person.name}.</p>
      </header>

      {stories.length === 0 ? (
        <p className="t-body t-muted">No saved stories yet. Record one first.</p>
      ) : (
        <ul className="pick-list">
          {stories.map((story) => {
            const on = story.id === suggested?.id;
            const kind = isPhotoStory(story) ? 'Photo' : 'Voice';
            const detail = storyDetail(state, story);
            return (
              <li key={story.id}>
                <button
                  type="button"
                  className={on ? 'pick-story pick-story--on' : 'pick-story'}
                  aria-current={on ? 'true' : undefined}
                  onClick={() => navigate(`${paths.send(story.id)}?to=${encodeURIComponent(person.id)}`)}
                >
                  <span className="pick-story__radio" aria-hidden="true" />
                  <span className="pick-story__copy">
                    <span className="t-body t-muted">
                      {formatDayMonth(story.date)} · {kind}
                    </span>
                    <span className="pick-story__title">{story.title}</span>
                    {detail && <span className="t-body t-muted">{detail}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
