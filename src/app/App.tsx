import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { NavBar, Screen } from '../components/index.ts';
import { archiveRoutes } from '../screens/archive/routes.tsx';
import { familyRoutes } from '../screens/family/routes.tsx';
import { lessonRoutes } from '../screens/lessons/routes.tsx';
import { meaningRoutes } from '../screens/meanings/routes.tsx';
import { recordRoutes } from '../screens/record/routes.tsx';
import { DemoPanel } from './DemoPanel.tsx';
import { paths } from './paths.ts';
import { StudyRedirect } from './StudyRedirect.tsx';
import { StudyResults } from './StudyResults.tsx';

// Tab title per route, so screen readers and browser tabs name the screen.
const TITLES: [RegExp, string][] = [
  [/^\/archive/, 'Archive'],
  [/^\/record\/recording/, 'Recording'],
  [/^\/record\/save\//, 'Save this take'],
  [/^\/record\/saved\//, 'Saved'],
  [/^\/record/, 'Record'],
  [/^\/family\/send\//, 'Send story'],
  [/^\/family\/reply\//, 'Reply'],
  [/^\/family/, 'Family'],
  [/^\/stories\/[^/]+\/meaning\/new/, 'Add meaning'],
  [/^\/stories\/[^/]+\/meanings/, 'Meanings'],
  [/^\/lessons\/[^/]+\/practise/, 'Practise'],
  [/^\/lessons/, 'Lessons'],
  [/^\/study/, 'Study'],
  [/^\/go\/results/, 'Study results'],
];

function usePageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const match = TITLES.find(([re]) => re.test(pathname));
    document.title = match ? `${match[1]} | Kinvo` : 'Kinvo';
  }, [pathname]);
}

function AppLayout() {
  usePageTitle();
  return (
    <div id="app-frame" className="app-frame">
      <Outlet />
      <DemoPanel />
    </div>
  );
}

function NotFound() {
  return (
    <Screen nav={<NavBar trail={[{ label: 'Archive', to: paths.archive() }]} current="Not found" />}>
      <p className="t-muted">This page does not exist.</p>
    </Screen>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: (
      <div id="app-frame" className="app-frame">
        <NotFound />
      </div>
    ),
    children: [
      { index: true, element: <Navigate to={paths.archive()} replace /> },
      ...archiveRoutes,
      ...recordRoutes,
      ...familyRoutes,
      ...meaningRoutes,
      ...lessonRoutes,
      { path: paths.study(), element: <StudyRedirect /> },
      { path: paths.studyResults(), element: <StudyResults /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
