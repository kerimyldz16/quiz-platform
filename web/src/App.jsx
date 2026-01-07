import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <div className="app-container">
      <div className="top-nav">
        <Link to="/">Home</Link>
        <Link to="/admin">Admin</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}
