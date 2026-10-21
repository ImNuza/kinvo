import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 05 Saved (316:470). A/B: see useVariant(). */
export function SavedScreen() {
  return <Placeholder frame="05 Saved" trail={[{ label: 'Record', to: paths.record() }]} current="Saved" />;
}
