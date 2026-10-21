import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 13 Practise phrase (319:615). */
export function PractiseScreen() {
  return <Placeholder frame="13 Practise phrase" trail={[{ label: 'Lessons', to: paths.lessons() }]} current="Practise" />;
}
