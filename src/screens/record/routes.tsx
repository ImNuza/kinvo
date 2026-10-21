import type { RouteObject } from 'react-router';
import { RecordScreen } from './RecordScreen.tsx';
import { RecordingScreen } from './RecordingScreen.tsx';
import { SaveTakeScreen } from './SaveTakeScreen.tsx';
import { SavedScreen } from './SavedScreen.tsx';

// Owner: W1 (Record).
export const recordRoutes: RouteObject[] = [
  { path: '/record', element: <RecordScreen /> },
  { path: '/record/recording', element: <RecordingScreen /> },
  { path: '/record/save/:storyId', element: <SaveTakeScreen /> },
  { path: '/record/saved/:storyId', element: <SavedScreen /> },
];
