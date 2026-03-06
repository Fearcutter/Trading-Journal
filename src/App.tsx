import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TradeProvider } from './context/TradeContext';
import { SettingsProvider } from './context/SettingsContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import TradeEntryPage from './pages/TradeEntryPage';
import TradeLogPage from './pages/TradeLogPage';
import TradeDetailPage from './pages/TradeDetailPage';
import CalendarPage from './pages/CalendarPage';
import ConfluencesPage from './pages/ConfluencesPage';
import SettingsPage from './pages/SettingsPage';
import RiskCalculatorPage from './pages/RiskCalculatorPage';

export default function App() {
  return (
    <TradeProvider>
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
              <Route path="/trades" element={<TradeLogPage />} />
              <Route path="/trades/new" element={<TradeEntryPage />} />
              <Route path="/trades/:id" element={<TradeDetailPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/confluences" element={<ConfluencesPage />} />
              <Route path="/risk-calculator" element={<RiskCalculatorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </TradeProvider>
  );
}
