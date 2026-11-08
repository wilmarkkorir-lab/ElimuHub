import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import { Empty, ErrorNote, PageHeader, ProgressBar, Spinner } from "../components/ui";
import { errMsg } from "../lib";

export default function Courses() {
  const { isInstructor } = useAuth();
  const [courses, setCourses] = useState(null);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [mine, setMine] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/categories/").then((r) => setCategories(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = {};
      if (q) params.q = q;
      if (category) params.category = category;
      if (mine) params.mine = 1;
      api.get("/courses/", { params }).then((r) => setCourses(r.data.results ?? r.data)).catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, mine]);

  return (
    <>
      <PageHeader title="Courses" sub="Find something to learn next.">
        {isInstructor && <Link to="/teach/courses/new" className="btn-accent">Create course</Link>}
      </PageHeader>
      <div className="mb-6 flex flex-wrap gap-3">
        <input className="input max-w-xs" type="search" placeholder="Search courses" aria-label="Search courses" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[12rem]" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {isInstructor && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only my courses</label>
        )}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!courses && !error && <Spinner />}
      {courses && courses.length === 0 && <Empty title="No courses match" hint="Try a different search or category." />}
      {courses && courses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <li key={c.id} className="panel flex flex-col p-5">
              <div className="mb-2 flex flex-wrap gap-2">
                {c.category_name && <span className="chip">{c.category_name}</span>}
                <span className="chip !bg-slate-100 !text-slate-700">{c.level}</span>
                {!c.is_published && <span className="chip !bg-jua-100 !text-jua-600">Draft</span>}
              </div>
              <h2 className="text-lg font-bold"><Link className="hover:underline" to={`/courses/${c.id}`}>{c.title}</Link></h2>
              <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-600">{c.description}</p>
              <p className="mt-3 text-xs text-slate-500">{c.instructor_name} · {c.lesson_count} lessons · {c.student_count} students</p>
              {c.is_enrolled && c.progress && <ProgressBar value={c.progress.percent} className="mt-3" />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
