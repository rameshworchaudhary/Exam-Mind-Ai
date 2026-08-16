// app/terms/page.tsx
import { Logo } from "@/components/ui/Logo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center gap-2">
        <Logo size="md" href="/" />
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground mb-8 text-sm">Last updated: 2026</p>
        <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p>By using PadhaiHub, you agree to these terms. If you don&apos;t agree, please don&apos;t use our service.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">2. Access & Use</h2>
            <p>PadhaiHub is provided free of charge for students. All users have access to the platform features without requiring a paid subscription.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">3. Acceptable Use</h2>
            <p>You may not use PadhaiHub for cheating in examinations where AI assistance is prohibited. The AI-generated content is for study and revision assistance only. We are not responsible for academic misconduct.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">4. Intellectual Property</h2>
            <p>Study content and answers belong to you. Our platform, design, and underlying technology are owned by PadhaiHub.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">5. Contact</h2>
            <p>For questions: support@padhaihub.com</p>
          </section>
        </div>
      </main>
    </div>
  );
}
