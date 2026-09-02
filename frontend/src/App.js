import "./App.css";
import Logo from "./assets/logo.png";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import HomePage from "./pages/HomePage";
import ProfileCreation from "./pages/ProfileCreation";
import Dashboard from "./pages/main-dashboard";
import LoginPage from "./pages/LoginPage";
import Footer from "./pages/HomePage/Footer";
import Header from "./pages/HomePage/Header";

function AppInner() {
  const location = useLocation();
  const hideHeaderRoutes = ["/login", "/loginPage"];
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <div className="App flex flex-col min-h-screen">
      {shouldShowHeader && <Header logo={Logo} />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile-creation" element={<ProfileCreation />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* backward compatible routes */}
          <Route path="/loginPage" element={<Navigate to="/login" replace />} />
          <Route path="/profileCreation" element={<Navigate to="/profile-creation" replace />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
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
