import { useNavigate } from 'react-router';
import { Icon, NavBar, Screen } from '../../components/index.ts';
import { paths } from '../../app/paths.ts';
import './record.css';

/** 02 Record (316:250). */
export function RecordScreen() {
  const navigate = useNavigate();
  return (
    <Screen nav={<NavBar title="Record" />} bodyClassName="rec-body rec-body--start">
      <div className="rec-start">
        <h2 className="t-title">Ah Ma is telling a story?</h2>
        <button
          type="button"
          className="rec-start__button"
          aria-label="Start recording"
          onClick={() => navigate(paths.recording())}
        >
          <Icon name="mic" size={40} />
        </button>
        <p className="rec-start__label t-subtitle">Tap to record</p>
      </div>
    </Screen>
  );
}
