import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { NavBar, Screen } from '../components/index.ts';
import { archiveRoutes } from '../screens/archive/routes.tsx';
import { familyRoutes } from '../screens/family/routes.tsx';
import { lessonRoutes } from '../screens/lessons/routes.tsx';
import { meaningRoutes } from '../screens/meanings/routes.tsx';
import { recordRoutes } from '../screens/record/routes.tsx';
import { DemoPanel } from './DemoPanel.tsx';
import { paths } from './paths.ts';

function AppLayout() {
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
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
