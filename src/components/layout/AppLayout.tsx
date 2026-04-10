import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import WhatsNewModal from '../WhatsNewModal';
import { useWhatsNew } from '../../hooks/useWhatsNew';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/live-trading': 'Live Trading',
  '/calendar': 'Calendar',
  '/confluences': 'Category Analytics',
  '/category-analytics': 'Category Analytics',
  '/apex-accounts': 'Funded Accounts',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const title = pageTitles[path] || (path.startsWith('/trades/') ? 'Trade Detail' : 'Trading Journal');
  const { show, dismiss } = useWhatsNew();

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <WhatsNewModal open={show} onDismiss={dismiss} unseen={unseen} />
    </div>
  );
}
