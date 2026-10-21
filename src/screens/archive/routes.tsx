import type { RouteObject } from 'react-router';
import { ArchiveScreen } from './ArchiveScreen.tsx';

// Owner: W4 (Archive and Lessons).
export const archiveRoutes: RouteObject[] = [{ path: '/archive', element: <ArchiveScreen /> }];
