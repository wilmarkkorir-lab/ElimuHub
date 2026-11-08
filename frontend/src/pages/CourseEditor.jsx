import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { Empty, ErrorNote, PageHeader, ProgressBar, Spinner } from "../components/ui";
import { errMsg, fmtDate } from "../lib";

/* ---------- Details ---------- */
function DetailsTab({ course, onSaved }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [f, setF] = useState({
    title: course?.title || "", description: course?.description || "", category: course?.category || "",
    level: course?.level || "beginner", is_published: course?.is_published || false,
  });
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/categories/").then((r) => setCategories(r.data)); }, []);

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const { data } = await api.post("/categories/", { name: newCat.trim() });
      setCategories([...categories, data]); setF({ ...f, category: data.id }); setNewCat("");
    } catch (e) { setError(errMsg(e)); }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setOk("");
    const payload = { ...f, category: f.category || null };
    try {
      if (course) { const { data } = await api.patch(`/courses/${course.id}/`, payload); onSaved(data); setOk("Saved."); }
      else { const { data } = await api.post("/courses/", payload); navigate(`/teach/courses/${data.id}`); }
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("Delete this course and everything in it? This can't be undone.")) return;
    try { await api.delete(`/courses/${course.id}/`); navigate("/courses"); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <form onSubmit={save} className="panel max-w-2xl space-y-4 p-6">
      <ErrorNote>{error}</ErrorNote>
      {ok && <p className="text-sm text-kijani-700" role="status">{ok}</p>}
      <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label className="label" htmlFor="d">Description</label><textarea id="d" rows={5} className="input" required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c">Category</label>
          <select id="c" className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            <option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="mt-2 flex gap-2"><input className="input" placeholder="New category" aria-label="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} /><button type="button" className="btn-ghost" onClick={addCategory}>Add</button></div>
        </div>
        <div><label className="label" htmlFor="l">Level</label>
          <select id="l" className="input" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Published (visible to students)</label>
      <div className="flex gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : course ? "Save changes" : "Create course"}</button>
        {course && <button type="button" className="btn-danger" onClick={remove}>Delete course</button>}
      </div>
    </form>
  );
}

/* ---------- Content (modules + lessons) ---------- */
function LessonForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ title: "", content: "", video_url: "", duration_minutes: 10, ...initial });
  return (
    <form className="space-y-3 rounded-md border bg-slate-50 p-4" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div><label className="label">Lesson title</label><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><label className="label">Content</label><textarea rows={5} className="input" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div><label className="label">Video link (YouTube or any embeddable URL)</label><input type="url" className="input" value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} /></div>
        <div><label className="label">Minutes</label><input type="number" min="1" className="input" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button className="btn-primary">Save lesson</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function ContentTab({ course, reload }) {
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(null); // {moduleId, lesson|null}
  const [error, setError] = useState("");
  const run = async (fn) => { setError(""); try { await fn(); await reload(); } catch (e) { setError(errMsg(e)); } };

  const addModule = (e) => { e.preventDefault(); run(async () => { await api.post("/modules/", { course: course.id, title, order: course.modules.length + 1 }); setTitle(""); }); };
  const saveLesson = (moduleId, lesson, f) => run(async () => {
    if (lesson?.id) await api.patch(`/lessons/${lesson.id}/`, f);
    else { const m = course.modules.find((x) => x.id === moduleId); await api.post("/lessons/", { ...f, module: moduleId, order: m.lessons.length + 1 }); }
    setEditing(null);
  });
  const editLesson = async (moduleId, l) => { try { const { data } = await api.get(`/lessons/${l.id}/`); setEditing({ moduleId, lesson: data }); } catch (e) { setError(errMsg(e)); } };

  return (
    <div className="max-w-3xl space-y-4">
      <ErrorNote>{error}</ErrorNote>
      {course.modules.length === 0 && <Empty title="No modules yet" hint="Add a module, then fill it with lessons." />}
      {course.modules.map((m) => (
        <div key={m.id} className="panel">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-bold">{m.title}</h3>
            <button className="btn-danger !py-1" onClick={() => window.confirm(`Delete module "${m.title}" and its lessons?`) && run(() => api.delete(`/modules/${m.id}/`))}>Delete module</button>
          </div>
          <ul className="divide-y">
            {m.lessons.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{l.title} <span className="text-slate-500">· {l.duration_minutes} min</span></span>
                <span className="flex gap-2">
                  <button className="btn-ghost !py-1" onClick={() => editLesson(m.id, l)}>Edit</button>
                  <button className="btn-danger !py-1" onClick={() => window.confirm(`Delete lesson "${l.title}"?`) && run(() => api.delete(`/lessons/${l.id}/`))}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="p-4">
            {editing?.moduleId === m.id ? (
              <LessonForm initial={editing.lesson} onSave={(f) => saveLesson(m.id, editing.lesson, f)} onCancel={() => setEditing(null)} />
            ) : (
              <button className="btn-ghost" onClick={() => setEditing({ moduleId: m.id, lesson: null })}>Add lesson</button>
            )}
          </div>
        </div>
      ))}
      <form onSubmit={addModule} className="flex gap-2">
        <input className="input" required placeholder="New module title" aria-label="New module title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn-primary whitespace-nowrap">Add module</button>
      </form>
    </div>
  );
}

/* ---------- Assessments ---------- */
const blankQuestion = () => ({ text: "", points: 1, choices: [0, 1, 2, 3].map(() => ({ text: "", is_correct: false })) });

function QuizBuilder({ courseId, onDone, onCancel }) {
  const [f, setF] = useState({ title: "", description: "", pass_mark: 60, time_limit_minutes: "", is_published: true });
  const [questions, setQuestions] = useState([{ ...blankQuestion(), choices: blankQuestion().choices.map((c, i) => ({ ...c, is_correct: i === 0 })) }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setQ = (qi, patch) => setQuestions(questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const setChoice = (qi, ci, patch) => setQ(qi, { choices: questions[qi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });
  const markCorrect = (qi, ci) => setQ(qi, { choices: questions[qi].choices.map((c, i) => ({ ...c, is_correct: i === ci })) });

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const cleaned = questions.filter((q) => q.text.trim()).map((q) => ({ ...q, choices: q.choices.filter((c) => c.text.trim()) }));
    if (cleaned.length === 0) return setError("Add at least one question.");
    for (const [i, q] of cleaned.entries()) {
      if (q.choices.length < 2) return setError(`Question ${i + 1} needs at least two choices.`);
      if (!q.choices.some((c) => c.is_correct)) return setError(`Question ${i + 1}: mark the correct answer (the correct choice must have text).`);
    }
    setBusy(true);
    try {
      await api.post("/quizzes/", { ...f, course: courseId, time_limit_minutes: f.time_limit_minutes || null, questions: cleaned });
      onDone();
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <form onSubmit={save} className="panel space-y-5 p-5">
      <h3 className="text-xl font-bold">New quiz</h3>
      <ErrorNote>{error}</ErrorNote>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><label className="label">Title</label><input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="sm:col-span-3"><label className="label">Description</label><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div><label className="label">Pass mark (%)</label><input type="number" min="0" max="100" className="input" value={f.pass_mark} onChange={(e) => setF({ ...f, pass_mark: e.target.value })} /></div>
        <div><label className="label">Time limit (minutes, optional)</label><input type="number" min="1" className="input" value={f.time_limit_minutes} onChange={(e) => setF({ ...f, time_limit_minutes: e.target.value })} /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Published</label>
      </div>

      {questions.map((q, qi) => (
        <fieldset key={qi} className="space-y-2 rounded-md border p-4">
          <legend className="px-1 text-sm font-semibold">Question {qi + 1}</legend>
          <input className="input" placeholder="Question text" aria-label={`Question ${qi + 1} text`} value={q.text} onChange={(e) => setQ(qi, { text: e.target.value })} />
          {q.choices.map((c, ci) => (
            <div key={ci} className="flex items-center gap-2">
              <input type="radio" name={`correct${qi}`} checked={c.is_correct} onChange={() => markCorrect(qi, ci)} aria-label={`Mark choice ${ci + 1} correct`} />
              <input className="input" placeholder={`Choice ${ci + 1}`} aria-label={`Question ${qi + 1} choice ${ci + 1}`} value={c.text} onChange={(e) => setChoice(qi, ci, { text: e.target.value })} />
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm">Points <input type="number" min="1" className="input !w-20" value={q.points} onChange={(e) => setQ(qi, { points: Number(e.target.value) || 1 })} /></label>
            {questions.length > 1 && <button type="button" className="btn-danger !py-1" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>Remove question</button>}
          </div>
        </fieldset>
      ))}
      <button type="button" className="btn-ghost" onClick={() => setQuestions([...questions, blankQuestion()])}>Add question</button>
      <div className="flex gap-2 border-t pt-4"><button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save quiz"}</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function AssessmentsTab({ course }) {
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [building, setBuilding] = useState(false);
  const [af, setAf] = useState({ title: "", instructions: "", due_date: "", max_score: 100 });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [q, a] = await Promise.all([api.get("/quizzes/", { params: { course: course.id } }), api.get("/assignments/", { params: { course: course.id } })]);
    setQuizzes(q.data); setAssignments(a.data);
  }, [course.id]);
  useEffect(() => { load().catch((e) => setError(errMsg(e))); }, [load]);

  const addAssignment = async (e) => {
    e.preventDefault(); setError("");
    try {
      await api.post("/assignments/", { ...af, course: course.id, due_date: af.due_date ? new Date(af.due_date).toISOString() : null });
      setAf({ title: "", instructions: "", due_date: "", max_score: 100 }); load();
    } catch (err) { setError(errMsg(err)); }
  };
  const del = async (url, label) => { if (!window.confirm(`Delete ${label}?`)) return; try { await api.delete(url); load(); } catch (e) { setError(errMsg(e)); } };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ErrorNote>{error}</ErrorNote>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Quizzes</h2>{!building && <button className="btn-primary" onClick={() => setBuilding(true)}>New quiz</button>}</div>
        {building && <QuizBuilder courseId={course.id} onCancel={() => setBuilding(false)} onDone={() => { setBuilding(false); load(); }} />}
        {quizzes.length === 0 && !building && <p className="text-sm text-slate-600">No quizzes yet.</p>}
        <ul className="panel divide-y">
          {quizzes.map((q) => (
            <li key={q.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span><Link className="font-semibold hover:underline" to={`/quiz/${q.id}`}>{q.title}</Link><span className="block text-slate-500">{q.question_count} questions · pass {q.pass_mark}%{q.is_published ? "" : " · unpublished"}</span></span>
              <button className="btn-danger !py-1" onClick={() => del(`/quizzes/${q.id}/`, `quiz "${q.title}"`)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Assignments</h2>
        <form onSubmit={addAssignment} className="panel space-y-3 p-4">
          <div><label className="label">Title</label><input className="input" required value={af.title} onChange={(e) => setAf({ ...af, title: e.target.value })} /></div>
          <div><label className="label">Instructions</label><textarea rows={3} className="input" required value={af.instructions} onChange={(e) => setAf({ ...af, instructions: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Due date</label><input type="datetime-local" className="input" value={af.due_date} onChange={(e) => setAf({ ...af, due_date: e.target.value })} /></div>
            <div><label className="label">Max score</label><input type="number" min="1" className="input" value={af.max_score} onChange={(e) => setAf({ ...af, max_score: e.target.value })} /></div>
          </div>
          <button className="btn-primary">Add assignment</button>
        </form>
        <ul className="panel divide-y">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span><Link className="font-semibold hover:underline" to={`/assignments/${a.id}`}>{a.title}</Link><span className="block text-slate-500">Due {fmtDate(a.due_date)} · {a.submission_count} submitted</span></span>
              <button className="btn-danger !py-1" onClick={() => del(`/assignments/${a.id}/`, `assignment "${a.title}"`)}>Delete</button>
            </li>
          ))}
          {assignments.length === 0 && <li className="px-4 py-3 text-sm text-slate-600">No assignments yet.</li>}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Students ---------- */
function StudentsTab({ course }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get(`/courses/${course.id}/students/`).then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))); }, [course.id]);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!rows) return <Spinner />;
  if (rows.length === 0) return <Empty title="No students yet" hint="Publish the course so students can enroll." />;
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Enrolled</th><th className="px-4 py-2">Progress</th><th className="px-4 py-2">Quiz average</th></tr></thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2"><span className="font-semibold">{r.name}</span><span className="block text-xs text-slate-500">{r.email}</span></td>
              <td className="px-4 py-2">{fmtDate(r.enrolled_at)}</td>
              <td className="w-48 px-4 py-2"><ProgressBar value={r.progress} /><span className="text-xs text-slate-600">{r.progress}%</span></td>
              <td className="px-4 py-2">{r.quiz_average != null ? `${r.quiz_average}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Page ---------- */
export default function CourseEditor() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState("details");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setCourse((await api.get(`/courses/${id}/`)).data); } catch (e) { setError(errMsg(e)); }
  }, [id]);
  useEffect(() => { if (id) load(); }, [id, load]);

  if (!id) return (<><PageHeader title="Create a course" sub="Start with the basics. You can add lessons next." /><DetailsTab course={null} /></>);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!course) return <Spinner />;
  if (!course.is_owner) return <ErrorNote>You can only manage your own courses.</ErrorNote>;

  const tabs = [["details", "Details"], ["content", "Lessons"], ["assess", "Quizzes and assignments"], ["students", "Students"]];
  return (
    <>
      <PageHeader title={course.title} sub={course.is_published ? "Published" : "Draft: students can't see this yet"}>
        <Link to={`/courses/${id}`} className="btn-ghost">View as student</Link>
      </PageHeader>
      <div className="mb-6 flex gap-1 border-b" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? "border-kijani-700 text-kijani-800" : "border-transparent text-slate-500 hover:text-ink"}`}>{label}</button>
        ))}
      </div>
      {tab === "details" && <DetailsTab course={course} onSaved={load} />}
      {tab === "content" && <ContentTab course={course} reload={load} />}
      {tab === "assess" && <AssessmentsTab course={course} />}
      {tab === "students" && <StudentsTab course={course} />}
    </>
  );
}
