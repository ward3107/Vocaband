import React from "react";
import { ArrowLeft, Shield, UserCircle, Scale, CheckCircle, Printer } from "lucide-react";
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

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto mb-20 md:mb-0">
        <div className="relative mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-on-surface mb-4 tracking-tighter leading-none font-headline">
            Terms of <span className="text-primary italic">Use</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl font-medium">
            Please read these terms carefully before exploring the digital playground of Vocaband. By using our platform, you're agreeing to the rules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Acceptance of Terms */}
          <section className="md:col-span-8 bg-surface-container-lowest p-8 md:p-12 rounded-[2rem] shadow-xl shadow-stone-900/5 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-primary bg-primary/10 p-2 rounded-lg">
                <Shield size={20} />
              </div>
              <h2 className="text-2xl font-black tracking-tight font-headline">
                Acceptance of Terms
              </h2>
            </div>
            <div className="space-y-4 text-on-surface-variant leading-relaxed">
              <p>
                By accessing or using Vocaband, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
              </p>
              <p>
                We reserve the right to modify these terms at any time. Your continued use of the Digital Playground following the posting of changes constitutes your acceptance of such changes.
              </p>
            </div>
          </section>

          {/* User Accounts */}
          <section className="md:col-span-4 bg-primary text-on-primary p-8 rounded-[2rem] shadow-xl shadow-blue-900/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="text-on-primary bg-white/20 p-2 rounded-lg">
                  <UserCircle size={20} />
                </div>
                <h2 className="text-2xl font-black tracking-tight font-headline">User Accounts</h2>
              </div>
              <p className="text-on-primary/80 font-medium mb-6 leading-snug">
                To access certain features, you must register. You are the guardian of your credentials.
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> Accurate info required
              </li>
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> One user per account
              </li>
            </ul>
          </section>

          {/* Code of Conduct */}
          <section className="md:col-span-12 bg-surface-container-low p-8 md:p-12 rounded-[2rem] flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-1/3">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-secondary bg-secondary/10 p-2 rounded-lg">
                  <Scale size={20} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-secondary font-headline">
                  Code of Conduct
                </h2>
              </div>
              <p className="text-on-surface-variant font-medium">
                Vocaband is a space for growth. We maintain a high standard of academic integrity and mutual respect.
              </p>
            </div>
            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-secondary/5">
                <h3 className="font-black mb-2 text-primary">No Cheating</h3>
                <p className="text-sm text-on-surface-variant">Automated scripts or external aids are prohibited.</p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-secondary/5">
                <h3 className="font-black mb-2 text-primary">Respect</h3>
                <p className="text-sm text-on-surface-variant">Interactions must be constructive and kind.</p>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="md:col-span-12 bg-surface-container-highest p-8 md:p-12 rounded-[2rem]">
            <h2 className="text-2xl font-black tracking-tight mb-6 font-headline">
              Intellectual Property
            </h2>
            <div className="space-y-4 text-on-surface-variant leading-relaxed">
              <p>
                All content, including songs, lyrics, and educational materials, is either original or properly licensed for educational use within the Israeli school system.
              </p>
              <p>
                You may not reproduce, distribute, or create derivative works without explicit permission.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] border-2 border-surface-container-high">
            <h2 className="text-xl font-black mb-4 font-headline">
              Limitation of Liability
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Vocaband is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from use of the service.
            </p>
          </section>

          {/* Termination */}
          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] border-2 border-surface-container-high">
            <h2 className="text-xl font-black mb-4 font-headline">
              Termination
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior toward other users or the platform.
            </p>
          </section>
        </div>

        <footer className="mt-20 border-t-2 border-surface-container-high pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-on-surface-variant">
            Questions?{" "}
            <span className="text-primary font-bold">hello@vocaband.edu</span>
          </p>
          <div className="flex gap-4">
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
          </div>
        </footer>
      </main>

      <MobileNav currentPage="terms" onNavigate={onNavigate} />
    </div>
  );
};

export default TermsPage;
