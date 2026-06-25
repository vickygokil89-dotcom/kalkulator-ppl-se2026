import { useEffect } from "react";
import "@/App.css";

/**
 * Aplikasi sebenarnya adalah file HTML statis (Asisten Petugas SE2026) yang
 * berdiri sendiri & offline-ready. Untuk preview / deployment Emergent kita
 * redirect root URL ke file HTML tersebut yang di-serve dari folder public/.
 *
 * File asli editable: /app/se2026-app-editable.html
 * Versi yang disajikan preview: /app/frontend/public/se2026-app.html
 */
function App() {
  useEffect(() => {
    window.location.replace("/se2026-app.html");
  }, []);

  return (
    <div
      data-testid="redirect-loader"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1d6b2e",
        background: "#f3f7f1",
      }}
    >
      Memuat Asisten Petugas SE2026…
    </div>
  );
}

export default App;
