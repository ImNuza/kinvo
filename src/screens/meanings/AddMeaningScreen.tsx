import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 09 Add meaning (318:445). */
export function AddMeaningScreen() {
  return <Placeholder frame="09 Add meaning" trail={[{ label: 'Family', to: paths.family() }]} current="Add meaning" tab="family" />;
}
