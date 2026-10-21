import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 07 Send story (318:329). */
export function SendStoryScreen() {
  return <Placeholder frame="07 Send story" trail={[{ label: 'Family', to: paths.family() }]} current="Send story" />;
}
