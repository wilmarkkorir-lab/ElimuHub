import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import { Empty, ErrorNote, PageHeader, ProgressBar, Spinner } from "../components/ui";
import { errMsg, fmtDate } from "../lib";

function Stat({ label, value }) {
  return (
    <div className="panel px-5 py-4">
      <p className="font-display text-3xl font-bold text-kijani-700">{value ?? "—"}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/dashboard/").then((r) => setD(r.data)).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!d) return <Spinner />;

  if (d.role === "instructor") {
    return (
      <>
        <PageHeader title={`Hello, ${user.first_name || user.username}`} sub="Here's what needs your attention.">
          <Link to="/teach/courses/new" className="btn-accent">Create course</Link>
        </PageHeader>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Courses" value={d.stats.courses} />
          <Stat label="Students" value={d.stats.students} />
          <Stat label="Submissions to grade" value={d.stats.pending_grading} />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-3 text-xl font-bold">Your courses</h2>
            {d.courses.length === 0 ? <Empty title="No courses yet" hint="Create your first course to get started." action={{ to: "/teach/courses/new", label: "Create course" }} /> : (
              <ul className="panel divide-y">
                {d.courses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <Link className="font-semibold hover:underline" to={`/teach/courses/${c.id}`}>{c.title}</Link>
                      <p className="text-sm text-slate-500">{c.students} student{c.students === 1 ? "" : "s"}</p>
                    </div>
                    <span className={`chip ${c.is_published ? "" : "!bg-jua-100 !text-jua-600"}`}>{c.is_published ? "Published" : "Draft"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">Waiting for grading</h2>
            {d.pending_submissions.length === 0 ? <p className="text-sm text-slate-600">Nothing to grade. You're all caught up.</p> : (
              <ul className="panel divide-y">
                {d.pending_submissions.map((s) => (
                  <li key={s.id} className="px-4 py-3 text-sm">
                    <Link className="font-semibold hover:underline" to={`/assignments/${s.assignment_id}`}>{s.assignment}</Link>
                    <p className="text-slate-600">{s.student} · {fmtDate(s.submitted_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Welcome back, ${user.first_name || user.username}`} sub="Keep going. Every lesson counts.">
        <Link to="/courses" className="btn-accent">Browse courses</Link>
      </PageHeader>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Courses enrolled" value={d.stats.enrolled} />
        <Stat label="Courses completed" value={d.stats.completed} />
        <Stat label="Average quiz score" value={d.stats.quiz_average != null ? `${d.stats.quiz_average}%` : null} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-bold">My courses</h2>
          {d.courses.length === 0 ? <Empty title="You haven't enrolled in anything yet" hint="Find a course that interests you." action={{ to: "/courses", label: "Browse courses" }} /> : (
            <ul className="space-y-3">
              {d.courses.map((c) => (
                <li key={c.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{c.title}</h3>
                      <p className="text-sm text-slate-500">with {c.instructor}</p>
                    </div>
                    <Link to={`/learn/${c.id}`} className="btn-primary">{c.progress.percent === 0 ? "Start" : c.progress.completed ? "Review" : "Continue"}</Link>
                  </div>
                  <ProgressBar value={c.progress.percent} className="mt-4" />
                  <p className="mt-2 text-xs text-slate-600">
                    {c.progress.percent}% · {c.progress.lessons.done}/{c.progress.lessons.total} lessons · {c.progress.quizzes.done}/{c.progress.quizzes.total} quizzes passed · {c.progress.assignments.done}/{c.progress.assignments.total} assignments sent
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-xl font-bold">Due soon</h2>
            {d.upcoming_assignments.length === 0 ? <p className="text-sm text-slate-600">No assignments due.</p> : (
              <ul className="panel divide-y">
                {d.upcoming_assignments.map((a) => (
                  <li key={a.id} className="px-4 py-3 text-sm">
                    <Link className="font-semibold hover:underline" to={`/assignments/${a.id}`}>{a.title}</Link>
                    <p className="text-slate-600">Due {fmtDate(a.due_date)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">Recent quiz results</h2>
            {d.recent_quizzes.length === 0 ? <p className="text-sm text-slate-600">No quizzes taken yet.</p> : (
              <ul className="panel divide-y">
                {d.recent_quizzes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{q.quiz}</span>
                    <span className={`font-semibold ${q.passed ? "text-kijani-700" : "text-red-700"}`}>{q.percentage}% {q.passed ? "passed" : "not passed"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
