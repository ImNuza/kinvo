import { useParams } from 'react-router';
import { Placeholder } from '../../app/Placeholder.tsx';
import { paths } from '../../app/paths.ts';

/** 08 Auntie Lin replied (318:390). */
export function ReplyScreen() {
  const { storyId = '' } = useParams();
  return (
    <Placeholder
      frame="08 Auntie Lin replied"
      trail={[
        { label: 'Family', to: paths.family() },
        { label: 'Send story', to: paths.send(storyId) },
      ]}
      current="Reply"
    />
  );
}
