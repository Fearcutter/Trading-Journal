import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PageErrorBoundary from './PageErrorBoundary';
import WhatsNewModal from '../WhatsNewModal';
import { useWhatsNew } from '../../hooks/useWhatsNew';
import { useView } from '../../context/ViewContext';
import { canViewPath, firstSharedPath } from '../../constants/coachSections';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/live-trading': 'Live Trading',
  '/calendar': 'Calendar',
  '/confluences': 'Category Analytics',
  '/category-analytics': 'Category Analytics',
  '/apex-accounts': 'Funded Accounts',
  '/prop-ev': 'Prop Firm EV',
  '/settings': 'Settings',
};

export default function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const title = pageTitles[path] || (path.startsWith('/trades/') ? 'Trade Detail' : 'Trading Journal');
  const { show, dismiss, unseen } = useWhatsNew();
  const view = useView();
  const allowed = canViewPath(path, view.mode, view.sharedSections);
  if (!allowed && path === '/') {
    const home = firstSharedPath(view.sharedSections);
    if (home) return <Navigate to={home} replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {view.mode === 'coach' && (
          <div className="flex items-center gap-2 px-6 py-2 bg-amber-500/10 border-b border-amber-500/30 text-sm text-amber-300">
            <Eye size={16} /> Viewing {view.ownerLabel}'s journal — read-only
          </div>
        )}
        <TopBar title={title} />
        <main className="flex-1 p-6 overflow-auto">
          {allowed ? <PageErrorBoundary key={path}><Outlet /></PageErrorBoundary> : (
            <div className="py-24 text-center text-sm text-slate-400">This section isn't shared with you.</div>
          )}
        </main>
      </div>
      {view.mode === 'owner' && <WhatsNewModal open={show} onDismiss={dismiss} unseen={unseen} />}
    </div>
  );
}
