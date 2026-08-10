import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AdminLogin from './admin/AdminLogin.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import ProtectedRoute from './admin/ProtectedRoute.jsx'
import Dashboard from './admin/Dashboard.jsx'
import Customers from './admin/Customers.jsx'
import Content from './admin/Content.jsx'
import Showcase from './admin/Showcase.jsx'
import ServiceLines from './admin/ServiceLines.jsx'
import Problems from './admin/Problems.jsx'
import Leads from './admin/Leads.jsx'
import Testimonials from './admin/Testimonials.jsx'
import Policies from './admin/Policies.jsx'
import Integrations from './admin/Integrations.jsx'
import PolicyPage from './PolicyPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Main website */}
        <Route path="/" element={<App />} />

        {/* Legal pages */}
        <Route path="/privacy" element={<PolicyPage which="privacy" />} />
        <Route path="/terms" element={<PolicyPage which="terms" />} />

        {/* Admin auth */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin panel (protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="customers" element={<Customers />} />
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="problems" element={<Problems />} />
          <Route path="service-lines" element={<ServiceLines />} />
          <Route path="content" element={<Content />} />
          <Route path="policies" element={<Policies />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="showcase" element={<Showcase />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
