import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib";

export function AuthShell({ title, sub, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-kijani-800 p-12 text-white lg:flex">
        <p className="font-display text-2xl font-bold">ElimuHub</p>
        <div>
          <p className="font-display text-5xl font-bold leading-tight">Learn something<br />worth knowing.</p>
          <p className="mt-4 max-w-md text-kijani-100">Courses, quizzes and assignments in one place, with progress you can actually see.</p>
        </div>
        <p className="text-sm text-kijani-200">Elimu means education in Swahili.</p>
      </aside>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-slate-600">{sub}</p>
          {children}
          <p className="mt-6 text-sm text-slate-600">{footer}</p>
        </div>
      </section>
    </div>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await login(form.username, form.password); navigate("/dashboard"); }
    catch (err) { setError(err.response?.status === 401 ? "Wrong username or password." : errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Sign in" sub="Welcome back. Pick up where you left off."
      footer={<>New here? <Link className="font-semibold text-kijani-700 underline" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div>
          <label className="label" htmlFor="u">Username or email</label>
          <input id="u" className="input" required autoComplete="username" value={form.username}
                 onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="p">Password</label>
          <input id="p" type="password" className="input" required autoComplete="current-password" value={form.password}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthShell>
  );
}
