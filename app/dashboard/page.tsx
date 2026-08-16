// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  BookOpen,
  PenTool,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { EmptyCoursesIllustration } from "@/components/dashboard/EmptyCoursesIllustration";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CourseItem {
  id: string;
  code: string;
  title: string;
  unitsCount: number;
  topicsCount: number;
  lastStudied?: string;
  color: string;
}

const DEFAULT_SAMPLE_COURSES: CourseItem[] = [
  {
    id: "cs201",
    code: "CS201",
    title: "Data Structures & Algorithms",
    unitsCount: 5,
    topicsCount: 24,
    lastStudied: "Yesterday",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
  {
    id: "cs301",
    code: "CS301",
    title: "Operating Systems & Concurrency",
    unitsCount: 6,
    topicsCount: 28,
    lastStudied: "2 days ago",
    color: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    id: "cs304",
    code: "CS304",
    title: "Database Management Systems",
    unitsCount: 4,
    topicsCount: 18,
    lastStudied: "3 days ago",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newUnits, setNewUnits] = useState(5);

  // Load courses from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("padhaihub_courses");
      if (stored) {
        setCourses(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCourses = (updated: CourseItem[]) => {
    setCourses(updated);
    try {
      localStorage.setItem("padhaihub_courses", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a course or subject title");
      return;
    }
    const newCourse: CourseItem = {
      id: Date.now().toString(),
      code: newCode.trim() || "SUBJ",
      title: newTitle.trim(),
      unitsCount: newUnits || 5,
      topicsCount: (newUnits || 5) * 4,
      lastStudied: "Just now",
      color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    };

    const updated = [...courses, newCourse];
    saveCourses(updated);
    setShowAddModal(false);
    setNewCode("");
    setNewTitle("");
    toast.success(`Added course "${newCourse.title}" successfully!`);
  };

  const handleDeleteCourse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = courses.filter((c) => c.id !== id);
    saveCourses(updated);
    toast.info("Course removed");
  };

  const handleLoadSamples = () => {
    saveCourses(DEFAULT_SAMPLE_COURSES);
    toast.success("Loaded sample semester courses!");
  };

  const handleClearAll = () => {
    saveCourses([]);
    toast.info("Reset to clean empty state");
  };

  return (
    <div className="space-y-8 bg-background min-h-[85vh] text-foreground transition-colors">
      {/* Top Header Matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Your Courses
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your semester subjects, upload syllabi, and prepare for exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {courses.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-9 text-muted-foreground border-border hover:bg-muted"
              >
                Reset to Empty State
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Course</span>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSamples}
                className="text-xs h-9 border-border text-foreground hover:bg-muted"
              >
                Load Sample Courses
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Course</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: When Empty -> Screenshot match */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center space-y-5 max-w-lg mx-auto">
          {/* Exact vector illustration matching the screenshot */}
          <div className="relative">
            <EmptyCoursesIllustration className="w-64 h-64 sm:w-72 sm:h-72" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Ready to Start Studying? 🚀
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Add your semester subjects or upload a syllabus PDF to generate instant revision notes, PYQ analysis, and handwritten assignments!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 h-9 rounded-lg"
            >
              + Add a Course
            </Button>
            <Link href="/dashboard/syllabus">
              <Button
                variant="outline"
                className="border-border hover:bg-muted text-foreground text-xs px-4 h-9 rounded-lg"
              >
                Upload Syllabus PDF
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* When courses exist: Clean Course Cards Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-xl border border-border bg-card hover:border-indigo-500/50 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-foreground uppercase border border-border">
                      {course.code}
                    </span>
                    <button
                      onClick={(e) => handleDeleteCourse(course.id, e)}
                      className="text-muted-foreground hover:text-red-500 p-1 transition-colors"
                      title="Delete course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-foreground group-hover:text-indigo-500 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {course.unitsCount} Units • {course.topicsCount} Key Topics
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/dashboard/syllabus?subject=${encodeURIComponent(course.title)}`}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground transition-colors border border-border"
                    >
                      <FileText className="w-3 h-3 text-indigo-500" />
                      <span>Syllabus</span>
                    </Link>
                    <Link
                      href={`/dashboard/pyq?subject=${encodeURIComponent(course.title)}`}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground transition-colors border border-border"
                    >
                      <TrendingUp className="w-3 h-3 text-sky-500" />
                      <span>PYQ Papers</span>
                    </Link>
                    <Link
                      href={`/dashboard/notes?subject=${encodeURIComponent(course.title)}`}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground transition-colors border border-border"
                    >
                      <BookOpen className="w-3 h-3 text-emerald-500" />
                      <span>Notes</span>
                    </Link>
                    <Link
                      href={`/dashboard/assignments?subject=${encodeURIComponent(course.title)}`}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground transition-colors border border-border"
                    >
                      <PenTool className="w-3 h-3 text-amber-500" />
                      <span>Handwritten</span>
                    </Link>
                  </div>

                  <Link
                    href={`/dashboard/chatbot?subject=${encodeURIComponent(course.title)}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors mt-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Doubt for this Course</span>
                  </Link>
                </div>
              </div>
            ))}

            {/* Quick Add Card */}
            <button
              onClick={() => setShowAddModal(true)}
              className="p-6 rounded-xl border border-dashed border-border hover:border-foreground/40 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center text-center transition-all min-h-[220px]"
            >
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <p className="font-semibold text-xs text-foreground">Add Another Course</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Track units, notes, and exam predictions</p>
            </button>
          </div>
        </div>
      )}

      {/* Quick Study Tools Bar */}
      <div className="pt-8 border-t border-border">
        <h2 className="text-sm font-bold text-foreground mb-4">Study Tools & Shortcuts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/syllabus"
            className="p-3.5 rounded-xl border border-border hover:border-indigo-500/40 bg-card hover:bg-muted/30 transition-colors"
          >
            <FileText className="w-4 h-4 text-indigo-500 mb-2" />
            <p className="text-xs font-bold text-foreground">Syllabus Breakdown</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Extract units from PDF</p>
          </Link>
          <Link
            href="/dashboard/pyq"
            className="p-3.5 rounded-xl border border-border hover:border-sky-500/40 bg-card hover:bg-muted/30 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-sky-500 mb-2" />
            <p className="text-xs font-bold text-foreground">Past Exam Questions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Spot repeating patterns</p>
          </Link>
          <Link
            href="/dashboard/assignments"
            className="p-3.5 rounded-xl border border-border hover:border-amber-500/40 bg-card hover:bg-muted/30 transition-colors"
          >
            <PenTool className="w-4 h-4 text-amber-500 mb-2" />
            <p className="text-xs font-bold text-foreground">Handwritten Notes</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Realistic ruled pages</p>
          </Link>
          <Link
            href="/dashboard/chatbot"
            className="p-3.5 rounded-xl border border-border hover:border-emerald-500/40 bg-card hover:bg-muted/30 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500 mb-2" />
            <p className="text-xs font-bold text-foreground">Ask a Doubt</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Instant plain explanations</p>
          </Link>
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-card rounded-xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4 text-card-foreground">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Add New Semester Course</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Course / Subject Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Networks or Engineering Mathematics"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Course Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS204"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newUnits}
                    onChange={(e) => setNewUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-muted/30 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                >
                  Save Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
