import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ErrorNote } from "../components/ui";
import { errMsg } from "../lib";
import { AuthShell } from "./Login";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ first_name: "", last_name: "", username: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await register(f); navigate("/dashboard"); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" sub="It takes under a minute."
      footer={<>Already registered? <Link className="font-semibold text-kijani-700 underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="fn">First name</label><input id="fn" className="input" required value={f.first_name} onChange={set("first_name")} /></div>
          <div><label className="label" htmlFor="ln">Last name</label><input id="ln" className="input" required value={f.last_name} onChange={set("last_name")} /></div>
        </div>
        <div><label className="label" htmlFor="un">Username</label><input id="un" className="input" required autoComplete="username" value={f.username} onChange={set("username")} /></div>
        <div><label className="label" htmlFor="em">Email</label><input id="em" type="email" className="input" required value={f.email} onChange={set("email")} /></div>
        <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" minLength={8} className="input" required autoComplete="new-password" value={f.password} onChange={set("password")} />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters, not a common password.</p></div>
        <div>
          <label className="label" htmlFor="role">I want to</label>
          <select id="role" className="input" value={f.role} onChange={set("role")}>
            <option value="student">Learn (student)</option>
            <option value="instructor">Teach (instructor)</option>
          </select>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
    </AuthShell>
  );
}
