import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import EarningsReport from './pages/EarningsReport';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="stock/:ticker" element={<StockDetail />} />
        <Route path="stock/:ticker/earnings/:date" element={<EarningsReport />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
