import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 04 Save this take (316:399). A/B: see useVariant(). */
export function SaveTakeScreen() {
  return <Placeholder frame="04 Save this take" trail={[{ label: 'Record', to: paths.record() }]} current="Save this take" />;
}
