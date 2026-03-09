import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TradeProvider } from './context/TradeContext';
import { SettingsProvider } from './context/SettingsContext';
import { JournalProvider } from './context/JournalContext';
import { BacktestProvider } from './context/BacktestContext';
import { PlaybookProvider } from './context/PlaybookContext';
import { HabitProvider } from './context/HabitContext';
import { ApexAccountProvider } from './context/ApexAccountContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import LiveTradingPage from './pages/LiveTradingPage';
import TradeDetailPage from './pages/TradeDetailPage';
import CalendarPage from './pages/CalendarPage';
import ConfluencesPage from './pages/ConfluencesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MFEMAEPage from './pages/MFEMAEPage';
import SettingsPage from './pages/SettingsPage';
import RiskCalculatorPage from './pages/RiskCalculatorPage';
import PlaybookPage from './pages/PlaybookPage';
import BacktestingPage from './pages/BacktestingPage';
import BacktestSessionPage from './pages/BacktestSessionPage';
import HabitsPage from './pages/HabitsPage';
import ApexAccountsPage from './pages/ApexAccountsPage';

export default function App() {
  return (
    <TradeProvider>
      <BacktestProvider>
      <JournalProvider>
        <PlaybookProvider>
          <HabitProvider>
          <ApexAccountProvider>
          <SettingsProvider>
        <BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
              },
            }}
          />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/live-trading" element={<LiveTradingPage />} />
              <Route path="/trades/:id" element={<TradeDetailPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/mfe-mae" element={<MFEMAEPage />} />
              <Route path="/journal" element={<HabitsPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/playbook" element={<PlaybookPage />} />
              <Route path="/confluences" element={<ConfluencesPage />} />
              <Route path="/category-analytics" element={<ConfluencesPage />} />
              <Route path="/risk-calculator" element={<RiskCalculatorPage />} />
              <Route path="/backtesting" element={<BacktestingPage />} />
              <Route path="/backtesting/:sessionId" element={<BacktestSessionPage />} />
              <Route path="/apex-accounts" element={<ApexAccountsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
          </SettingsProvider>
          </ApexAccountProvider>
          </HabitProvider>
        </PlaybookProvider>
      </JournalProvider>
      </BacktestProvider>
    </TradeProvider>
  );
}
