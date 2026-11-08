import { Link } from "react-router-dom";

export function ProgressBar({ value = 0, className = "" }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-kijani-100 ${className}`}
         role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-kijani-600 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return <p className="py-16 text-center text-sm text-slate-500" role="status">{label}</p>;
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{children}</p>;
}

export function Empty({ title, hint, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-600">{hint}</p>}
      {action && <Link to={action.to} className="btn-primary mt-4">{action.label}</Link>}
    </div>
  );
}

export function PageHeader({ title, children, sub }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-slate-600">{sub}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
