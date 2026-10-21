import { ButtonLink, NavBar, Screen } from '../../components/index.ts';
import { paths } from '../../app/paths.ts';
import './record.css';

/** Shown when the story id in the URL does not exist. */
export function StoryNotFound({ current }: { current: string }) {
  return (
    <Screen nav={<NavBar trail={[{ label: 'Record', to: paths.record() }]} current={current} />}>
      <div className="rec-missing">
        <p className="t-subtitle" role="status">
          Story not found
        </p>
        <p className="t-muted">This story is not on this phone. Start a new recording instead.</p>
        <ButtonLink to={paths.record()} variant="outline" size="md">
          Go to Record
        </ButtonLink>
      </div>
    </Screen>
  );
}
