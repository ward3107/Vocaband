import React from "react";
import { Shield, School, Lock, Mail, Database, Gavel, Globe, Clock, Users, AlertTriangle, FileText, ExternalLink } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface PublicPrivacyPageProps {
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
}

const PublicPrivacyPage: React.FC<PublicPrivacyPageProps> = ({
  onNavigate,
  onGetStarted,
}) => {
  return (
    <div className="min-h-screen bg-surface">
      <PublicNav
        currentPage="privacy"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        {/* Header */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-4 font-headline">
            Privacy <span className="text-primary italic">Policy</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant font-medium">
            <span className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Effective: March 2024
            </span>
            <span className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Version 2.0
            </span>
          </div>
          <p className="mt-4 text-lg text-on-surface-variant max-w-2xl">
            <strong>Legal Basis:</strong> Privacy Protection Law, 5741-1981 (Israel), Amendment 13
          </p>
        </section>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-4">
              <Shield size={14} />
              <span className="text-xs font-black uppercase tracking-wider">Summary</span>
            </div>
            <p className="text-lg text-blue-100 font-medium leading-relaxed">
              Vocaband is designed for Israeli schools. Student accounts are <strong>anonymous</strong>—no email or personal identification required. Teachers sign in with Google. We don't sell data, show ads, or track users for marketing.
            </p>
          </div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1: Data Controller */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">1</span>
              Data Controller (בעל המאגר)
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              Under the Israeli Privacy Protection Law (Amendment 13), the data controller for Vocaband is:
            </p>
            <ul className="space-y-2 text-on-surface-variant">
              <li><strong>Entity:</strong> Vocaband Educational Technologies</li>
              <li><strong>Address:</strong> Israel</li>
              <li><strong>Privacy Contact:</strong> <span className="text-primary">privacy@vocaband.com</span></li>
              <li><strong>Database Registration:</strong> As required under Section 18 of the Privacy Protection Law</li>
            </ul>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              For privacy inquiries, data access requests, or complaints, contact us at the email above. We will respond within <strong>30 days</strong> as required by law.
            </p>
          </section>

          {/* Section 2: What We Collect */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">2</span>
              <Database size={20} className="text-primary" />
              Data We Collect
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-surface-container-low p-5 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={18} className="text-primary" />
                  <h3 className="font-bold text-on-surface">For Students</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Anonymous</span>
                </div>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li>• <strong>Display name</strong> — chosen by student</li>
                  <li>• <strong>Avatar</strong> — emoji selection</li>
                  <li>• <strong>Class code</strong> — 6-digit code</li>
                  <li>• <strong>Progress</strong> — scores, streaks, XP</li>
                  <li>• <strong>Badges</strong> — achievements earned</li>
                </ul>
                <p className="text-xs text-red-500 mt-3 font-medium">
                  We do NOT collect: email, phone, address, photos, IDs
                </p>
              </div>

              <div className="bg-surface-container-low p-5 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <School size={18} className="text-primary" />
                  <h3 className="font-bold text-on-surface">For Teachers</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Google OAuth</span>
                </div>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li>• <strong>Email</strong> — for verification</li>
                  <li>• <strong>Display name</strong> — from Google</li>
                  <li>• <strong>Classes</strong> — created class codes</li>
                  <li>• <strong>Assignments</strong> — vocabulary lists</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: How We Use Data */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">3</span>
              How We Use Your Data
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className="text-left py-2 pr-4 font-bold text-on-surface">Purpose</th>
                    <th className="text-left py-2 pr-4 font-bold text-on-surface">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface-variant">
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4">Provide vocabulary games</td>
                    <td className="py-2 pr-4">Contract performance</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4">Show teachers student progress</td>
                    <td className="py-2 pr-4">Contract performance</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4">Authenticate teachers</td>
                    <td className="py-2 pr-4">Contract + Security</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Prevent abuse</td>
                    <td className="py-2 pr-4">Legitimate interest</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-red-50 rounded-xl">
              <p className="text-sm text-red-700 font-medium">
                We do NOT: Sell data • Show ads • Create profiles • Share with brokers • Use tracking cookies
              </p>
            </div>
          </section>

          {/* Section 4: Third Parties */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">4</span>
              <Globe size={20} className="text-primary" />
              Third-Party Processors
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className="text-left py-2 pr-4 font-bold text-on-surface">Service</th>
                    <th className="text-left py-2 pr-4 font-bold text-on-surface">Purpose</th>
                    <th className="text-left py-2 pr-4 font-bold text-on-surface">Location</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface-variant">
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Supabase</td>
                    <td className="py-2 pr-4">Database, authentication</td>
                    <td className="py-2 pr-4">EU (Frankfurt) / US</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google OAuth</td>
                    <td className="py-2 pr-4">Teacher sign-in only</td>
                    <td className="py-2 pr-4">US</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Render</td>
                    <td className="py-2 pr-4">Application hosting</td>
                    <td className="py-2 pr-4">US</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Retention */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">5</span>
              <Clock size={20} className="text-primary" />
              Data Retention
            </h2>
            <ul className="space-y-3 text-on-surface-variant">
              <li className="flex items-center justify-between py-2 border-b border-surface-container/50">
                <span>Student progress data</span>
                <span className="font-bold text-on-surface">365 days</span>
              </li>
              <li className="flex items-center justify-between py-2 border-b border-surface-container/50">
                <span>Orphaned student accounts</span>
                <span className="font-bold text-on-surface">90 days</span>
              </li>
              <li className="flex items-center justify-between py-2 border-b border-surface-container/50">
                <span>Teacher accounts</span>
                <span className="font-bold text-on-surface">Active + 2 years</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span>Audit logs</span>
                <span className="font-bold text-on-surface">2 years</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Your Rights */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">6</span>
              <Gavel size={20} className="text-primary" />
              Your Rights (Data Subject Rights)
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              Under Israeli Privacy Protection Law (Amendment 13), you have the right to:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-surface-container-low p-4 rounded-xl text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Database size={18} className="text-primary" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">Access</h4>
                <p className="text-xs text-on-surface-variant mt-1">Request a copy of your data</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock size={18} className="text-primary" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">Deletion</h4>
                <p className="text-xs text-on-surface-variant mt-1">Request permanent removal</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FileText size={18} className="text-primary" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">Portability</h4>
                <p className="text-xs text-on-surface-variant mt-1">Export your progress</p>
              </div>
            </div>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              Exercise these rights via <strong>Privacy Settings</strong> in the app or email <span className="text-primary">privacy@vocaband.com</span>. We respond within 30 days.
            </p>
          </section>

          {/* Section 7: Children's Privacy */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">7</span>
              <Users size={20} className="text-primary" />
              Children's Privacy
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              Vocaband is designed for students in Israeli schools. The educational institution (school) authorizes student use. By providing a class code, the teacher (on behalf of the school) authorizes student access.
            </p>
            <div className="bg-green-50 p-4 rounded-xl">
              <p className="text-sm text-green-800 font-medium">
                We minimize data collection from students: No email required • No real name required • No location tracking • No behavioral advertising
              </p>
            </div>
          </section>

          {/* Section 8: Security */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">8</span>
              <Lock size={20} className="text-primary" />
              Security Measures
            </h2>
            <ul className="grid md:grid-cols-2 gap-3 text-on-surface-variant">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Encryption in transit (HTTPS/TLS 1.3)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Encryption at rest
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Row-Level Security (RLS)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Secure Google OAuth
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Teacher pre-approval
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Rate limiting
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Audit logging
              </li>
            </ul>
          </section>

          {/* Section 9: Complaints */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">9</span>
              <AlertTriangle size={20} className="text-amber-500" />
              Complaints
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              If you believe your privacy rights have been violated, you may:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-on-surface-variant">
              <li>Contact us at <span className="text-primary font-medium">privacy@vocaband.com</span></li>
              <li>
                File a complaint with the Israeli Privacy Protection Authority (הרשות להגנת הפרטיות):
                <a
                  href="https://www.gov.il/he/departments/the_privacy_protection_authority"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline ml-2 inline-flex items-center gap-1"
                >
                  www.gov.il <ExternalLink size={12} />
                </a>
              </li>
            </ol>
          </section>

          {/* Section 10: Contact */}
          <section className="bg-surface-container-high/50 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black font-headline mb-2">Have Questions?</h3>
              <p className="text-on-surface-variant">Our privacy team responds within 30 days.</p>
            </div>
            <a
              href="mailto:privacy@vocaband.com"
              className="inline-flex items-center gap-3 bg-on-background text-background px-6 py-3 rounded-xl font-black hover:scale-105 transition-all"
            >
              <Mail size={18} /> privacy@vocaband.com
            </a>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t-2 border-surface-container-high pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-on-surface-variant">
            <strong>Related:</strong>{" "}
            <button onClick={() => onNavigate("terms")} className="text-primary hover:underline">
              Terms of Service
            </button>
          </p>
          <button
            onClick={onGetStarted}
            className="signature-gradient px-8 py-3 rounded-full font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Accept & Continue
          </button>
        </footer>
      </main>

      <MobileNav currentPage="privacy" onNavigate={onNavigate} />
    </div>
  );
};

export default PublicPrivacyPage;
