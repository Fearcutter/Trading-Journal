import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  BarChart3,
  Target,
  FileText,
  BookMarked,
  FlaskConical,
  Layers,
  Calculator,
  Landmark,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/live-trading', icon: TrendingUp, label: 'Live Trading' },
  { to: '/backtesting', icon: FlaskConical, label: 'Backtesting' },
  { to: '/journal', icon: FileText, label: 'Journal' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/mfe-mae', icon: Target, label: 'MFE / MAE' },
  { to: '/playbook', icon: BookMarked, label: 'Playbook' },
  { to: '/confluences', icon: Layers, label: 'Category Analytics' },
  { to: '/risk-calculator', icon: Calculator, label: 'Risk Calculator' },
  { to: '/apex-accounts', icon: Landmark, label: 'Funded Accounts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="h-14 flex items-center px-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-slate-50 tracking-tight">Trading Journal</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-slate-50'
                  : 'text-slate-400 hover:text-slate-50 hover:bg-slate-700/50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <div className="px-3 py-1 mb-2 text-xs text-slate-500 truncate">{user?.email}</div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-700/50 transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
