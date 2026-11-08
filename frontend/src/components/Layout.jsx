import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const linkCls = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-white/15 text-white" : "text-kijani-100 hover:text-white"}`;

export default function Layout() {
  const { user, logout, isInstructor } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="bg-kijani-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-xl font-bold text-white">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="#F2A900" />
              <path d="M7 9h8a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H7zM25 9h-8v12h8z" fill="#0A3836" />
            </svg>
            ElimuHub
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/dashboard" end className={linkCls}>Dashboard</NavLink>
            <NavLink to="/courses" className={linkCls}>Courses</NavLink>
            {isInstructor && <NavLink to="/teach/courses/new" className={linkCls}>New course</NavLink>}
          </nav>
          <div className="flex items-center gap-3 text-sm text-kijani-100">
            <span className="hidden sm:inline">{user.display_name} <span className="chip ml-1">{user.role}</span></span>
            <button className="btn-ghost !py-1" onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
