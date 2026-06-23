import { useEffect, useState } from "react";
import { api, getToken, setToken, User } from "./api";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("radar_user");
    if (getToken() && raw) {
      try {
        const u = JSON.parse(raw) as User;
        api
          .me()
          .then(() => setUser(u))
          .catch(() => {
            setToken(null);
            localStorage.removeItem("radar_user");
          })
          .finally(() => setBooting(false));
        return;
      } catch {
        /* ignora json inválido */
      }
    }
    setBooting(false);
  }, []);

  function onLogin(u: User) {
    localStorage.setItem("radar_user", JSON.stringify(u));
    setUser(u);
  }
  function logout() {
    setToken(null);
    localStorage.removeItem("radar_user");
    setUser(null);
  }

  if (booting) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">Carregando…</div>
    );
  }
  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onLogin={onLogin} />;
}
