import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Calendar,
  BarChart3,
  Target,
  Layers,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: BookOpen, label: 'Trade Log' },
  { to: '/trades/new', icon: PlusCircle, label: 'New Trade' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/mfe-mae', icon: Target, label: 'MFE / MAE' },
  { to: '/confluences', icon: Layers, label: 'Confluences' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-slate-50 tracking-tight">Trading Journal</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/trades'}
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
    </aside>
  );
}
