import type { RouteObject } from 'react-router';
import { LessonsScreen } from './LessonsScreen.tsx';
import { PractiseScreen } from './PractiseScreen.tsx';

// Owner: W4 (Archive and Lessons).
export const lessonRoutes: RouteObject[] = [
  { path: '/lessons', element: <LessonsScreen /> },
  { path: '/lessons/:storyId/practise', element: <PractiseScreen /> },
];
