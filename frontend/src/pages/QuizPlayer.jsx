import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import { ErrorNote, Spinner } from "../components/ui";
import { errMsg } from "../lib";

export default function QuizPlayer() {
  const { id } = useParams();
  const { isInstructor } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(null); // seconds remaining
  const submitRef = useRef(null);

  useEffect(() => {
    api.get(`/quizzes/${id}/`).then((r) => {
      setQuiz(r.data);
      if (r.data.time_limit_minutes) setLeft(r.data.time_limit_minutes * 60);
    }).catch((e) => setError(errMsg(e)));
  }, [id]);

  const submit = async () => {
    setBusy(true); setError("");
    try { const { data } = await api.post(`/quizzes/${id}/submit/`, { answers }); setResult(data); setLeft(null); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };
  submitRef.current = submit;

  useEffect(() => {
    if (left === null || result) return;
    if (left <= 0) { submitRef.current(); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, result]);

  const retry = () => { setAnswers({}); setResult(null); if (quiz.time_limit_minutes) setLeft(quiz.time_limit_minutes * 60); window.scrollTo(0, 0); };

  if (error && !quiz) return <ErrorNote>{error}</ErrorNote>;
  if (!quiz) return <Spinner />;

  const reviewFor = (qid) => result?.review.find((r) => r.question === qid);
  const answered = Object.keys(answers).length;
  const mm = left !== null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/learn/${quiz.course}`} className="text-sm text-kijani-700 underline">Back to course</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          {quiz.description && <p className="mt-1 text-slate-600">{quiz.description}</p>}
          <p className="mt-1 text-sm text-slate-500">Pass mark {quiz.pass_mark}%</p>
        </div>
        {mm && !result && <p className={`rounded-md px-3 py-1 font-display text-xl font-bold ${left < 60 ? "bg-red-100 text-red-800" : "bg-kijani-100 text-kijani-800"}`} aria-live="off">{mm}</p>}
      </div>

      {result && (
        <div className={`mb-6 rounded-lg border p-5 ${result.passed ? "border-kijani-200 bg-kijani-50" : "border-red-200 bg-red-50"}`} role="status">
          <p className="font-display text-3xl font-bold">{result.percentage}%</p>
          <p className="mt-1">{result.passed ? "You passed." : `Not passed yet. You need ${quiz.pass_mark}%.`} You scored {result.score} of {result.total} points.</p>
          <button className="btn-primary mt-3" onClick={retry}>Try again</button>
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>
      {quiz.questions.length === 0 && <p className="text-slate-600">This quiz has no questions yet.</p>}

      <ol className="space-y-5">
        {quiz.questions.map((q, i) => {
          const rev = reviewFor(q.id);
          return (
            <li key={q.id} className="panel p-5">
              <fieldset disabled={!!result}>
                <legend className="mb-3 font-semibold">{i + 1}. {q.text} <span className="text-xs font-normal text-slate-500">({q.points} pt{q.points > 1 ? "s" : ""})</span></legend>
                <div className="space-y-2">
                  {q.choices.map((c) => {
                    const isCorrect = rev?.correct_choices.includes(c.id);
                    const isChosen = rev?.chosen === c.id;
                    const tone = rev ? (isCorrect ? "border-kijani-500 bg-kijani-50" : isChosen ? "border-red-400 bg-red-50" : "border-slate-200") : answers[q.id] === c.id ? "border-kijani-500 bg-kijani-50" : "border-slate-200 hover:bg-slate-50";
                    return (
                      <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${tone}`}>
                        <input type="radio" name={`q${q.id}`} checked={answers[q.id] === c.id} onChange={() => setAnswers({ ...answers, [q.id]: c.id })} />
                        <span className="flex-1">{c.text}</span>
                        {rev && isCorrect && <span className="text-xs font-semibold text-kijani-700">Correct answer</span>}
                        {rev && isChosen && !isCorrect && <span className="text-xs font-semibold text-red-700">Your answer</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      {!result && quiz.questions.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">{answered} of {quiz.questions.length} answered</p>
          {isInstructor && !quiz.is_published && <span className="chip">Unpublished</span>}
          <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit quiz"}</button>
        </div>
      )}
    </div>
  );
}
