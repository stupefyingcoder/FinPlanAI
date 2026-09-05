import "./App.css";
// The horizontal lockup: icon plus wordmark, sized for a light header bar.
import Logo from "./assets/horizontal_logo_with_FinPlan_written.png";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import ColdStartBanner from "./components/ColdStartBanner";
import HomePage from "./pages/HomePage";
import ProfileCreation from "./pages/ProfileCreation";
import Dashboard from "./pages/main-dashboard";
import LoginPage from "./pages/LoginPage";
import Footer from "./pages/HomePage/Footer";
import Header from "./pages/HomePage/Header";

function AppInner() {
  const location = useLocation();
  // The dashboard has its own sidebar and chrome; the marketing header and
  // footer around it produced two competing navigations on the same screen.
  const bareRoutes = ["/login", "/loginPage", "/dashboard"];
  const isBare = bareRoutes.includes(location.pathname);

  return (
    <div className="App flex flex-col min-h-screen">
      <ColdStartBanner />
      {!isBare && <Header logo={Logo} />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/profile-creation"
            element={
              <RequireAuth>
                <ProfileCreation />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          {/* backward compatible routes */}
          <Route path="/loginPage" element={<Navigate to="/login" replace />} />
          <Route path="/profileCreation" element={<Navigate to="/profile-creation" replace />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isBare && <Footer />}
    </div>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
