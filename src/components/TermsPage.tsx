import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import MobileNav from "./MobileNav";

interface TermsPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onNavigate, onGetStarted }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-stone-100/80 backdrop-blur-md flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 border-b border-stone-200/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-200 transition-colors"
          >
            <ArrowLeft className="text-primary" size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-primary font-headline tracking-tight">
              Vocaband
            </span>
            <span className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant uppercase">
              TERMS OF USE
            </span>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto mb-20 md:mb-0">
        <div className="relative mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-on-surface mb-4 tracking-tighter leading-none font-headline">
            Terms of <span className="text-primary italic">Use</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl font-medium">
            Last updated: March 2024
          </p>
        </div>

        <div className="space-y-8 text-on-surface-variant leading-relaxed">
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Vocaband, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
            </p>
            <p className="mt-4">
              We reserve the right to modify these terms at any time. Your continued use of the platform following the posting of changes constitutes your acceptance of such changes.
            </p>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">2. User Accounts</h2>
            <p>
              To access certain features, you must register. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
            <ul className="mt-4 space-y-2">
              <li>• You must provide accurate and complete information during registration</li>
              <li>• You may not create more than one account per user</li>
              <li>• You must notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">3. Code of Conduct</h2>
            <p>
              Vocaband is a space for growth. We maintain a high standard of academic integrity and mutual respect. By using our platform, you agree to:
            </p>
            <ul className="mt-4 space-y-2">
              <li>• Not use automated scripts, bots, or external aids to cheat</li>
              <li>• Keep interactions constructive and kind</li>
              <li>• Complete your own work without impersonating others</li>
              <li>• Respect the privacy of other users</li>
            </ul>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">4. Intellectual Property</h2>
            <p>
              All content on Vocaband, including songs, lyrics, educational materials, and the platform itself, is either original or properly licensed for educational use within the Israeli school system.
            </p>
            <p className="mt-4">
              You may not reproduce, distribute, or create derivative works from our content without explicit permission.
            </p>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">5. Limitation of Liability</h2>
            <p>
              Vocaband is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior toward other users or the platform.
            </p>
          </section>

          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline">7. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{" "}
              <span className="text-primary font-bold">hello@vocaband.edu</span>
            </p>
          </section>
        </div>

        <footer className="mt-20 border-t-2 border-surface-container-high pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <button
            onClick={handlePrint}
            className="px-8 py-4 bg-surface-container-high text-on-surface font-black rounded-full flex items-center gap-2 hover:bg-surface-container transition-all"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={onGetStarted}
            className="signature-gradient px-8 py-4 rounded-full font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Accept & Continue
          </button>
        </footer>
      </main>

      <MobileNav currentPage="terms" onNavigate={onNavigate} />
    </div>
  );
};

export default TermsPage;
