import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 09a Conflicting meanings (374:2132) and 09b Meaning agreed (374:2272). No tab bar. */
export function MeaningsScreen() {
  return <Placeholder frame="09a Conflicting meanings" trail={[{ label: 'Family', to: paths.family() }]} current="Meanings" hideTabBar />;
}
