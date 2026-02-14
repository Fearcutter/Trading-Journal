import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/trades': 'Trade Log',
  '/trades/new': 'New Trade',
  '/calendar': 'Calendar',
  '/confluences': 'Confluences',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const title = pageTitles[path] || (path.startsWith('/trades/') ? 'Trade Detail' : 'Trading Journal');

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
