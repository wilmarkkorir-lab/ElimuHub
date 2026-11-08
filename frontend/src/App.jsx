import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Learn from "./pages/Learn";
import QuizPlayer from "./pages/QuizPlayer";
import AssignmentPage from "./pages/AssignmentPage";
import CourseEditor from "./pages/CourseEditor";

function Protected({ children, instructorOnly }) {
  const { user, loading, isInstructor } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  if (instructorOnly && !isInstructor) return <Navigate to="/dashboard" replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="learn/:courseId" element={<Learn />} />
        <Route path="learn/:courseId/:lessonId" element={<Learn />} />
        <Route path="quiz/:id" element={<QuizPlayer />} />
        <Route path="assignments/:id" element={<AssignmentPage />} />
        <Route path="teach/courses/new" element={<Protected instructorOnly><CourseEditor /></Protected>} />
        <Route path="teach/courses/:id" element={<Protected instructorOnly><CourseEditor /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
