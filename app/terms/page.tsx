// app/terms/page.tsx
import { Logo } from "@/components/ui/Logo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center gap-2">
        <Logo size="md" href="/" />
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
            <p>By using ExamMind AI, you agree to these terms. If you don't agree, please don't use our service.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-3">2. Access & Use</h2>
            <p>ExamMind AI is provided free of charge. All users have access to the platform features without requiring a subscription.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-3">4. Acceptable Use</h2>
            <p>You may not use ExamMind AI for cheating in examinations where AI assistance is prohibited. The AI-generated content is for study assistance only. We are not responsible for academic misconduct.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-3">5. Intellectual Property</h2>
            <p>AI-generated content belongs to you. Our platform, design, and underlying technology are owned by ExamMind AI.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-lg mb-3">6. Contact</h2>
            <p>For questions: support@examindai.com</p>
          </section>
        </div>
      </main>
    </div>
  );
}
