import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "./components/Layout";
import Onboarding from "./pages/Onboarding";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Settings from "./pages/Settings";
import { api } from "./lib/api";

function AppRoutes() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: api.settings.getProfile,
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "var(--text-muted)" }}>Chargement…</span>
      </div>
    );
  }

  const needsOnboarding = !profile?.onboarded;

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      {needsOnboarding ? (
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      ) : (
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
