export function errMsg(e, fallback = "Something went wrong. Please try again.") {
  const d = e?.response?.data;
  if (!d) return e?.message === "Network Error" ? "Can't reach the server. Is the backend running?" : fallback;
  if (typeof d === "string") return d.length < 200 ? d : fallback;
  if (d.detail) return d.detail;
  if (Array.isArray(d)) return d.join(" ");
  const first = Object.entries(d)[0];
  if (!first) return fallback;
  const [k, v] = first;
  const text = Array.isArray(v) ? v.join(" ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return k === "non_field_errors" ? text : `${k.replace(/_/g, " ")}: ${text}`;
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export const toLocalInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};
