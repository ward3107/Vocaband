import React from "react";
import { Shield, School, Lock, Mail } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";

interface PublicPrivacyPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
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

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        <section className="mb-12 text-center md:text-left">
          <h2 className="text-5xl font-black text-on-background tracking-tight mb-4 font-headline">
            Privacy Policy
          </h2>
          <p className="text-xl text-on-surface-variant font-medium max-w-2xl leading-relaxed">
            We believe your data belongs to you. Our commitment is to provide a safe, transparent learning environment.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Student Security Card */}
          <div className="md:col-span-12 lg:col-span-8 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-6">
                <Shield size={14} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Student Security
                </span>
              </div>
              <h3 className="text-3xl md:text-4xl font-black mb-4 font-headline">
                Anonymity by Design
              </h3>
              <p className="text-lg text-blue-100 font-medium leading-relaxed mb-8">
                Vocaband student accounts are built to be anonymous. We only require a name and class code. No personal emails or phone numbers required for students.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-lg px-5 py-4 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-200">
                    no_accounts
                  </span>
                  <span className="font-bold">No Tracking</span>
                </div>
                <div className="bg-white/10 backdrop-blur-lg px-5 py-4 rounded-xl flex items-center gap-3">
                  <Lock size={18} className="text-blue-200" />
                  <span className="font-bold">End-to-End Encrypted</span>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl" />
          </div>

          {/* Educator Accounts Card */}
          <div className="md:col-span-6 lg:col-span-4 bg-surface-container-lowest rounded-[2rem] p-8 shadow-md border-2 border-primary/5 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <School size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 font-headline">
                Educator Accounts
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                We use Google OAuth for teachers to securely manage accounts via professional educational emails.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-surface-container-high flex items-center gap-2 text-primary font-bold text-sm">
              <Lock size={14} /> Secure Google Authentication
            </div>
          </div>

          {/* Data Collection */}
          <section className="md:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-4 font-headline flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">
                database
              </span>
              What We Collect
            </h3>
            <ul className="space-y-3 text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Learning Progress</strong> - scores, streaks, completed exercises</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Account Info</strong> - name, class code, avatar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Usage Analytics</strong> - time spent, feature usage</span>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="md:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-4 font-headline flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">
                gavel
              </span>
              Your Rights
            </h3>
            <ul className="space-y-3 text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-lg mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Access</strong> - request a copy of your data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-lg mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Deletion</strong> - request permanent removal</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-lg mt-0.5">check_circle</span>
                <span><strong className="text-on-surface">Portability</strong> - export your progress</span>
              </li>
            </ul>
          </section>

          {/* Contact Section */}
          <div className="md:col-span-12 bg-surface-container-high/50 rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-black font-headline mb-2">
                Have questions?
              </h3>
              <p className="text-on-surface-variant">
                Our privacy team is here to help.
              </p>
            </div>
            <a
              href="mailto:support@vocaband.edu"
              className="inline-flex items-center gap-4 bg-on-background text-background px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
            >
              <Mail size={20} /> support@vocaband.edu
            </a>
          </div>
        </div>
      </main>

      <MobileNav currentPage="privacy" onNavigate={onNavigate} />
    </div>
  );
};

export default PublicPrivacyPage;
