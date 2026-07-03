import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/index.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Views
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import PosTerminal from './pages/PosTerminal.js';
import Products from './pages/Products.js';
import Inventory from './pages/Inventory.js';
import Customers from './pages/Customers.js';
import Suppliers from './pages/Suppliers.js';
import Purchases from './pages/Purchases.js';
import Expenses from './pages/Expenses.js';
import Employees from './pages/Employees.js';
import Reports from './pages/Reports.js';
import AiInsights from './pages/AiInsights.js';
import Settings from './pages/Settings.js';

// Layout & Protect Guard
import Layout from './components/Layout.js';
import ProtectedRoute from './components/ProtectedRoute.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            {/* Open route */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Application routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PosTerminal />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <Suppliers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <Purchases />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <Expenses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <Employees />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <Layout>
                    <AiInsights />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default fallback redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    </QueryClientProvider>
  );
}
