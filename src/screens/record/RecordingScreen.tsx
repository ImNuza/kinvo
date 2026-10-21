import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 03 Recording (316:329) and 03a Leave recording warning (370:1948). */
export function RecordingScreen() {
  return <Placeholder frame="03 Recording" trail={[{ label: 'Record', to: paths.record() }]} current="Recording" />;
}
