import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // Restore auth state from localStorage token on first load
  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Nav />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
}
