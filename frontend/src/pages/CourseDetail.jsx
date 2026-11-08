import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { ErrorNote, ProgressBar, Spinner } from "../components/ui";
import { errMsg } from "../lib";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/courses/${id}/`).then((r) => setCourse(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, [id]);

  const enroll = async () => {
    setBusy(true);
    try { await api.post(`/courses/${id}/enroll/`); navigate(`/learn/${id}`); }
    catch (e) { setError(errMsg(e)); setBusy(false); }
  };

  if (error && !course) return <ErrorNote>{error}</ErrorNote>;
  if (!course) return <Spinner />;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-3 flex flex-wrap gap-2">
          {course.category_name && <span className="chip">{course.category_name}</span>}
          <span className="chip !bg-slate-100 !text-slate-700">{course.level}</span>
        </div>
        <h1 className="text-4xl font-bold">{course.title}</h1>
        <p className="mt-1 text-slate-600">Taught by {course.instructor_name}</p>
        <p className="mt-5 whitespace-pre-line leading-relaxed text-slate-800">{course.description}</p>

        <h2 className="mb-3 mt-10 text-2xl font-bold">What you'll cover</h2>
        {course.modules.length === 0 ? <p className="text-slate-600">The instructor hasn't added lessons yet.</p> : (
          <div className="space-y-3">
            {course.modules.map((m) => (
              <div key={m.id} className="panel">
                <h3 className="border-b px-4 py-3 font-bold">{m.title}</h3>
                <ul className="divide-y">
                  {m.lessons.map((l) => (
                    <li key={l.id} className="flex justify-between px-4 py-2 text-sm">
                      <span>{l.completed ? "✓ " : ""}{l.title}</span>
                      <span className="text-slate-500">{l.duration_minutes} min</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="panel space-y-4 p-5">
          <ErrorNote>{error}</ErrorNote>
          {course.is_enrolled ? (
            <>
              <ProgressBar value={course.progress?.percent || 0} />
              <p className="text-sm text-slate-600">{course.progress?.percent || 0}% complete</p>
              <Link to={`/learn/${id}`} className="btn-primary w-full">Go to course</Link>
            </>
          ) : course.is_owner ? (
            <Link to={`/teach/courses/${id}`} className="btn-primary w-full">Manage this course</Link>
          ) : (
            <button className="btn-accent w-full" onClick={enroll} disabled={busy}>{busy ? "Enrolling…" : "Enroll for free"}</button>
          )}
          {course.is_owner && course.is_enrolled === false && !course.is_published && <p className="text-xs text-slate-500">This course is a draft. Students can't see it yet.</p>}
          <dl className="grid grid-cols-2 gap-2 border-t pt-4 text-sm">
            <dt className="text-slate-500">Lessons</dt><dd className="text-right font-semibold">{course.lesson_count}</dd>
            <dt className="text-slate-500">Students</dt><dd className="text-right font-semibold">{course.student_count}</dd>
          </dl>
        </div>
      </aside>
    </div>
  );
}
