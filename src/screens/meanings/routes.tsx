import type { RouteObject } from 'react-router';
import { AddMeaningScreen } from './AddMeaningScreen.tsx';
import { MeaningsScreen } from './MeaningsScreen.tsx';

// Owner: W3 (Meanings).
export const meaningRoutes: RouteObject[] = [
  { path: '/stories/:storyId/meaning/new', element: <AddMeaningScreen /> },
  { path: '/stories/:storyId/meanings', element: <MeaningsScreen /> },
];
