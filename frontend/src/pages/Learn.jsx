import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { Empty, ErrorNote, ProgressBar, Spinner } from "../components/ui";
import { errMsg, fmtDate } from "../lib";

function embedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
  } catch { /* ignore */ }
  return url;
}

export default function Learn() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCourse = useCallback(async () => {
    try {
      const [c, q, a] = await Promise.all([
        api.get(`/courses/${courseId}/`),
        api.get("/quizzes/", { params: { course: courseId } }),
        api.get("/assignments/", { params: { course: courseId } }),
      ]);
      setCourse(c.data); setQuizzes(q.data); setAssignments(a.data);
    } catch (e) { setError(errMsg(e)); }
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const flat = useMemo(() => (course ? course.modules.flatMap((m) => m.lessons) : []), [course]);

  // Pick the first unfinished lesson if none selected
  useEffect(() => {
    if (course && !lessonId && flat.length) {
      const next = flat.find((l) => !l.completed) || flat[0];
      navigate(`/learn/${courseId}/${next.id}`, { replace: true });
    }
  }, [course, lessonId, flat, courseId, navigate]);

  useEffect(() => {
    if (!lessonId) { setLesson(null); return; }
    setLesson(null);
    api.get(`/lessons/${lessonId}/`).then((r) => setLesson(r.data)).catch((e) => setError(errMsg(e)));
  }, [lessonId]);

  if (error && !course) return <ErrorNote>{error}</ErrorNote>;
  if (!course) return <Spinner />;
  if (!course.is_enrolled && !course.is_owner) {
    return <Empty title="You're not enrolled in this course" action={{ to: `/courses/${courseId}`, label: "View course" }} />;
  }

  const idx = flat.findIndex((l) => String(l.id) === String(lessonId));
  const nextLesson = idx >= 0 ? flat[idx + 1] : null;

  const toggle = async () => {
    setBusy(true); setError("");
    try {
      await api.post(`/lessons/${lessonId}/${lesson.completed ? "uncomplete" : "complete"}/`);
      setLesson({ ...lesson, completed: !lesson.completed });
      await loadCourse();
      if (!lesson.completed && nextLesson) navigate(`/learn/${courseId}/${nextLesson.id}`);
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <div>
          <Link to={`/courses/${courseId}`} className="text-sm text-kijani-700 underline">Course overview</Link>
          <h1 className="mt-1 text-xl font-bold">{course.title}</h1>
          {course.progress && (<><ProgressBar value={course.progress.percent} className="mt-3" /><p className="mt-1 text-xs text-slate-600">{course.progress.percent}% complete</p></>)}
        </div>

        {course.modules.map((m) => (
          <div key={m.id} className="panel">
            <h2 className="border-b px-3 py-2 text-sm font-bold">{m.title}</h2>
            <ul>
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link to={`/learn/${courseId}/${l.id}`}
                    className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-kijani-50 ${String(l.id) === String(lessonId) ? "bg-kijani-50 font-semibold text-kijani-800" : ""}`}>
                    <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${l.completed ? "border-kijani-600 bg-kijani-600 text-white" : "border-slate-300"}`}>{l.completed ? "✓" : ""}</span>
                    <span className="flex-1">{l.title}</span>
                    <span className="text-xs text-slate-500">{l.duration_minutes}m</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {(quizzes.length > 0 || assignments.length > 0) && (
          <div className="panel">
            <h2 className="border-b px-3 py-2 text-sm font-bold">Quizzes and assignments</h2>
            <ul className="divide-y text-sm">
              {quizzes.map((q) => (
                <li key={`q${q.id}`}><Link className="block px-3 py-2 hover:bg-kijani-50" to={`/quiz/${q.id}`}>
                  <span className="font-semibold">{q.title}</span>
                  <span className="block text-xs text-slate-500">Quiz · {q.question_count} questions{q.best_percentage != null ? ` · best ${q.best_percentage}%` : ""}</span>
                </Link></li>
              ))}
              {assignments.map((a) => (
                <li key={`a${a.id}`}><Link className="block px-3 py-2 hover:bg-kijani-50" to={`/assignments/${a.id}`}>
                  <span className="font-semibold">{a.title}</span>
                  <span className="block text-xs text-slate-500">Assignment · {a.my_submission ? (a.my_submission.score != null ? `graded ${a.my_submission.score}/${a.max_score}` : "submitted") : `due ${fmtDate(a.due_date)}`}</span>
                </Link></li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <section>
        <ErrorNote>{error}</ErrorNote>
        {flat.length === 0 && <Empty title="No lessons yet" hint="The instructor hasn't published any lessons." />}
        {lessonId && !lesson && !error && <Spinner />}
        {lesson && (
          <article className="panel p-6">
            <h2 className="text-3xl font-bold">{lesson.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{lesson.duration_minutes} min</p>
            {lesson.video_url && (
              <div className="mt-5 aspect-video overflow-hidden rounded-md bg-black">
                <iframe title={lesson.title} src={embedUrl(lesson.video_url)} className="h-full w-full" allowFullScreen />
              </div>
            )}
            <div className="mt-5 max-w-prose whitespace-pre-line leading-relaxed">{lesson.content || "No written content for this lesson."}</div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              {course.is_enrolled ? (
                <button className={lesson.completed ? "btn-ghost" : "btn-primary"} onClick={toggle} disabled={busy}>
                  {lesson.completed ? "Mark as not done" : nextLesson ? "Mark done and continue" : "Mark done"}
                </button>
              ) : <span className="text-sm text-slate-500">Preview mode (you teach this course)</span>}
              {nextLesson && <Link className="btn-ghost" to={`/learn/${courseId}/${nextLesson.id}`}>Next: {nextLesson.title}</Link>}
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
