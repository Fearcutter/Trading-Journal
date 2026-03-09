import Modal from '../ui/Modal';
import { useSettings } from '../../context/SettingsContext';

const WIDGET_GROUPS: { label: string; widgets: { key: string; label: string }[] }[] = [
  {
    label: 'Trading Analytics',
    widgets: [
      { key: 'cumulativePL', label: 'Cumulative P&L' },
      { key: 'dailyPL', label: 'Daily P&L' },
      { key: 'winLoss', label: 'Win / Loss' },
      { key: 'plBySetup', label: 'P&L by Setup' },
      { key: 'plByEmotion', label: 'P&L by Emotion' },
      { key: 'winRateByConfluences', label: 'Win Rate by Confluences' },
      { key: 'timeOfDay', label: 'Time of Day' },
      { key: 'rrDistribution', label: 'R:R Distribution' },
    ],
  },
  {
    label: 'Journal & Habits',
    widgets: [
      { key: 'todayCheckIn', label: "Today's Check-In" },
      { key: 'streakSummary', label: 'Streak Summary' },
      { key: 'recentReflections', label: 'Recent Reflections' },
      { key: 'dayRatingTrend', label: 'Day Rating & Adherence Trend' },
    ],
  },
];

interface WidgetCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WidgetCustomizer({ open, onOpenChange }: WidgetCustomizerProps) {
  const { dashboardWidgets, updateSettings } = useSettings();

  const toggle = (key: string) => {
    updateSettings({
      dashboardWidgets: {
        ...dashboardWidgets,
        [key]: !dashboardWidgets[key],
      },
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Customize Dashboard">
      <div className="space-y-6">
        {WIDGET_GROUPS.map(group => (
          <div key={group.label}>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{group.label}</h4>
            <div className="space-y-2">
              {group.widgets.map(widget => (
                <label
                  key={widget.key}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <span className="text-sm text-slate-200">{widget.label}</span>
                  <button
                    type="button"
                    onClick={() => toggle(widget.key)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      dashboardWidgets[widget.key] !== false ? 'bg-blue-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        dashboardWidgets[widget.key] !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
