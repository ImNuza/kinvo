import type { RouteObject } from 'react-router';
import { FamilyScreen } from './FamilyScreen.tsx';
import { ReplyScreen } from './ReplyScreen.tsx';
import { SelectStoryScreen } from './SelectStoryScreen.tsx';
import { SendStoryScreen } from './SendStoryScreen.tsx';

// Owner: W2 (Family).
export const familyRoutes: RouteObject[] = [
  { path: '/family', element: <FamilyScreen /> },
  { path: '/family/share/:personId', element: <SelectStoryScreen /> },
  { path: '/family/send/:storyId', element: <SendStoryScreen /> },
  { path: '/family/reply/:storyId', element: <ReplyScreen /> },
];
