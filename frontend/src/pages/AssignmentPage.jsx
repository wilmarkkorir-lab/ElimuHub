import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import { ErrorNote, Spinner } from "../components/ui";
import { errMsg, fmtDate } from "../lib";

function GradeRow({ sub, max, onGraded }) {
  const [score, setScore] = useState(sub.score ?? "");
  const [feedback, setFeedback] = useState(sub.feedback || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api.post(`/submissions/${sub.id}/grade/`, { score, feedback }); onGraded(); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <li className="panel p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-semibold">{sub.student_name}</p>
        <p className="text-xs text-slate-500">{fmtDate(sub.submitted_at)}</p>
      </div>
      {sub.text_answer && <p className="mt-2 whitespace-pre-line rounded bg-slate-50 p-3 text-sm">{sub.text_answer}</p>}
      {sub.file_url && <a className="mt-2 inline-block text-sm text-kijani-700 underline" href={sub.file_url} target="_blank" rel="noreferrer">Download attachment</a>}
      <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
        <div><label className="label">Score (max {max})</label><input className="input" type="number" min="0" max={max} required value={score} onChange={(e) => setScore(e.target.value)} /></div>
        <div><label className="label">Feedback</label><input className="input" value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
        <button className="btn-primary" disabled={busy}>{sub.graded_at ? "Update grade" : "Save grade"}</button>
      </form>
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
    </li>
  );
}

export default function AssignmentPage() {
  const { id } = useParams();
  const { isInstructor } = useAuth();
  const [a, setA] = useState(null);
  const [subs, setSubs] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/assignments/${id}/`);
      setA(data);
      setText(data.my_submission?.text_answer || "");
      if (isInstructor) {
        try { setSubs((await api.get(`/assignments/${id}/submissions/`)).data); } catch { /* not owner: ignore */ }
      }
    } catch (e) { setError(errMsg(e)); }
  };
  useEffect(() => { load(); }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setOk("");
    const fd = new FormData();
    fd.append("text_answer", text);
    if (file) fd.append("file", file);
    try { await api.post(`/assignments/${id}/submit/`, fd); setOk("Submitted. Your instructor will grade it soon."); setFile(null); await load(); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  if (error && !a) return <ErrorNote>{error}</ErrorNote>;
  if (!a) return <Spinner />;
  const mine = a.my_submission;
  const graded = mine?.graded_at;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/learn/${a.course}`} className="text-sm text-kijani-700 underline">Back to course</Link>
      <h1 className="mt-2 text-3xl font-bold">{a.title}</h1>
      <p className="mt-1 text-sm text-slate-500">Due {fmtDate(a.due_date)} · {a.max_score} points</p>
      <p className="mt-4 whitespace-pre-line leading-relaxed">{a.instructions}</p>

      {!isInstructor && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Your submission</h2>
          {graded && (
            <div className="mb-4 rounded-lg border border-kijani-200 bg-kijani-50 p-4" role="status">
              <p className="font-display text-2xl font-bold">{mine.score} / {a.max_score}</p>
              {mine.feedback && <p className="mt-1 text-sm">{mine.feedback}</p>}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <ErrorNote>{error}</ErrorNote>
            {ok && <p className="rounded-md border border-kijani-200 bg-kijani-50 px-3 py-2 text-sm" role="status">{ok}</p>}
            <div><label className="label" htmlFor="ans">Answer</label>
              <textarea id="ans" rows={7} className="input" value={text} disabled={!!graded} onChange={(e) => setText(e.target.value)} /></div>
            <div><label className="label" htmlFor="file">Attachment (optional, max 10 MB)</label>
              <input id="file" type="file" disabled={!!graded} onChange={(e) => setFile(e.target.files[0] || null)} className="text-sm" />
              {mine?.file_url && <p className="mt-1 text-xs"><a className="underline" href={mine.file_url} target="_blank" rel="noreferrer">Current attachment</a></p>}</div>
            {!graded && <button className="btn-primary" disabled={busy}>{busy ? "Sending…" : mine ? "Update submission" : "Submit assignment"}</button>}
            {mine && <p className="text-xs text-slate-500">Last submitted {fmtDate(mine.submitted_at)}</p>}
          </form>
        </section>
      )}

      {isInstructor && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Submissions ({subs.length})</h2>
          {subs.length === 0 ? <p className="text-sm text-slate-600">No one has submitted yet.</p> : (
            <ul className="space-y-4">{subs.map((s) => <GradeRow key={`${s.id}-${s.graded_at}`} sub={s} max={a.max_score} onGraded={load} />)}</ul>
          )}
        </section>
      )}
    </div>
  );
}
