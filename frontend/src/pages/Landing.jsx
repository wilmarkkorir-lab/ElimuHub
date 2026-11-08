import { Link } from "react-router-dom";

const features = [
  {
    icon: "📚",
    title: "Rich Course Content",
    desc: "Text and video lessons organised into modules, with draft/publish workflow for instructors.",
  },
  {
    icon: "🧠",
    title: "Interactive Quizzes",
    desc: "Timed multiple-choice quizzes with instant feedback and automatic pass-mark grading.",
  },
  {
    icon: "📝",
    title: "Assignments & Grading",
    desc: "File and text submissions with due dates, instructor feedback, and a grading queue.",
  },
  {
    icon: "📊",
    title: "Progress Tracking",
    desc: "Per-student dashboards showing lesson completion, quiz results, and overall course progress.",
  },
];

const steps = [
  { n: "1", label: "Create an account", sub: "Sign up as a student or instructor in seconds." },
  { n: "2", label: "Explore courses", sub: "Browse the catalogue and enrol with one click." },
  { n: "3", label: "Learn & grow", sub: "Complete lessons, ace quizzes, and submit assignments." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-20 border-b border-kijani-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-display text-xl font-bold text-kijani-700">
            Elimu<span className="text-jua-500">Hub</span>
          </span>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Log in</Link>
            <Link to="/register" className="btn-primary text-sm">Get started</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-kijani-700 px-6 py-24 text-center text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-kijani-600 opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-jua-500 opacity-20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-jua-500/20 px-4 py-1 text-sm font-semibold text-jua-400 ring-1 ring-jua-400/40">
            Open Learning Platform
          </span>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Learn anything.<br />
            <span className="text-jua-400">Teach everyone.</span>
          </h1>
          <p className="mt-6 text-lg text-kijani-100">
            ElimuHub brings instructors and students together with courses, quizzes,
            assignments, and real-time progress — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn bg-jua-500 px-6 py-3 text-base font-bold text-ink hover:bg-jua-400">
              Start learning free
            </Link>
            <Link to="/login" className="btn border border-white/30 bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-center text-3xl font-bold">Everything you need to learn</h2>
        <p className="mt-2 text-center text-slate-500">Built for students and instructors alike.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="panel p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 text-4xl">{f.icon}</div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-kijani-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-center text-3xl font-bold">How it works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kijani-700 font-display text-2xl font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-jua-500 px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold text-ink">Ready to start your journey?</h2>
        <p className="mt-2 text-ink/70">Join ElimuHub today — it's free to get started.</p>
        <Link to="/register" className="btn-primary mt-8 inline-block px-8 py-3 text-base">
          Create your account
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} ElimuHub · Built with ❤️ for learners everywhere
      </footer>
    </div>
  );
}
