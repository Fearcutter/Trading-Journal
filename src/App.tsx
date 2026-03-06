import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TradeProvider } from './context/TradeContext';
import { SettingsProvider } from './context/SettingsContext';
import { JournalProvider } from './context/JournalContext';
import { PlaybookProvider } from './context/PlaybookContext';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import TradeEntryPage from './pages/TradeEntryPage';
import TradeLogPage from './pages/TradeLogPage';
import TradeDetailPage from './pages/TradeDetailPage';
import CalendarPage from './pages/CalendarPage';
import ConfluencesPage from './pages/ConfluencesPage';
import SettingsPage from './pages/SettingsPage';
import JournalPage from './pages/JournalPage';
import PlaybookPage from './pages/PlaybookPage';

export default function App() {
  return (
    <TradeProvider>
      <JournalProvider>
        <PlaybookProvider>
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
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/playbook" element={<PlaybookPage />} />
              <Route path="/confluences" element={<ConfluencesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
          </SettingsProvider>
        </PlaybookProvider>
      </JournalProvider>
    </TradeProvider>
  );
}
