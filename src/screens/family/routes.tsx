import type { RouteObject } from 'react-router';
import { FamilyScreen } from './FamilyScreen.tsx';
import { ReplyScreen } from './ReplyScreen.tsx';
import { SendStoryScreen } from './SendStoryScreen.tsx';

// Owner: W2 (Family).
export const familyRoutes: RouteObject[] = [
  { path: '/family', element: <FamilyScreen /> },
  { path: '/family/send/:storyId', element: <SendStoryScreen /> },
  { path: '/family/reply/:storyId', element: <ReplyScreen /> },
];
