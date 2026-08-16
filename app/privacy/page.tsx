// app/privacy/page.tsx
import { Logo } from "@/components/ui/Logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-4 flex items-center gap-2">
        <Logo size="md" href="/" />
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8 text-sm">Last updated: 2026</p>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed text-sm">
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly (name, email, academic profile) and syllabus files or queries processed on PadhaiHub.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">2. How We Use Your Information</h2>
            <p>We use your information strictly to provide and improve your study tools, generate academic outputs, and preserve your study progress.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">3. Data Security</h2>
            <p>All data is encrypted in transit and at rest. We use Firebase&apos;s enterprise-grade security infrastructure.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">4. Data Retention</h2>
            <p>We retain your study notes and upload metadata as long as your account is active. You can request deletion at any time by contacting support.</p>
          </section>
          <section>
            <h2 className="text-foreground font-semibold text-base mb-2">5. Contact Us</h2>
            <p>For privacy concerns, contact: privacy@padhaihub.com</p>
          </section>
        </div>
      </main>
    </div>
  );
}
