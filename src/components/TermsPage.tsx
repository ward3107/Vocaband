import React from "react";
import { ArrowLeft, Shield, UserCircle, Scale, CheckCircle, Printer, Database, Globe, Clock, AlertTriangle, Ban, FileText } from "lucide-react";
import MobileNav from "./MobileNav";
import {
  DATA_CONTROLLER,
  TERMS_VERSION,
  THIRD_PARTY_REGISTRY,
  RETENTION_PERIODS,
} from "../privacy-config";

interface TermsPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onNavigate, onGetStarted }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      {/* Header */}
      <header className="bg-stone-100/80 backdrop-blur-md print:bg-white print:shadow-none flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 border-b border-stone-200/50 print:border-none print:static">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-200 transition-colors print:hidden"
          >
            <ArrowLeft className="text-primary" size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-primary font-headline tracking-tight">
              {DATA_CONTROLLER.name}
            </span>
            <span className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant uppercase">
              TERMS OF USE • Version {TERMS_VERSION}
            </span>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto mb-20 md:mb-0 print:pt-8 print:pb-8">
        <div className="relative mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-on-surface mb-4 tracking-tighter leading-none font-headline print:text-4xl">
            Terms of <span className="text-primary italic">Use</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl font-medium">
            Please read these terms carefully before using {DATA_CONTROLLER.name}. By accessing our platform, you agree to these terms and our Privacy Policy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Data Controller Info */}
          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] shadow-xl shadow-stone-900/5 print:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-primary bg-primary/10 p-2 rounded-lg">
                <Database size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight font-headline">
                Data Controller
              </h2>
            </div>
            <div className="space-y-3 text-on-surface-variant">
              <p><strong className="text-on-surface">Organization:</strong> {DATA_CONTROLLER.name}</p>
              <p><strong className="text-on-surface">Location:</strong> {DATA_CONTROLLER.country}</p>
              <p><strong className="text-on-surface">Contact:</strong> <span className="text-primary">{DATA_CONTROLLER.contactEmail}</span></p>
            </div>
          </section>

          {/* Hosting Regions */}
          <section className="md:col-span-6 bg-secondary-container/30 p-8 rounded-[2rem] border-2 border-secondary/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-secondary bg-secondary/10 p-2 rounded-lg">
                <Globe size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight font-headline">
                Data Hosting
              </h2>
            </div>
            <div className="space-y-2 text-on-surface-variant text-sm">
              <p><strong className="text-on-surface">Database:</strong> US East (Supabase)</p>
              <p><strong className="text-on-surface">Web Server:</strong> Oregon (Render)</p>
              <p><strong className="text-on-surface">Authentication:</strong> Global (Google)</p>
            </div>
          </section>

          {/* Acceptance of Terms */}
          <section className="md:col-span-8 bg-surface-container-lowest p-8 md:p-10 rounded-[2rem] shadow-xl shadow-stone-900/5 print:shadow-none">
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
                By accessing or using {DATA_CONTROLLER.name}, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.
              </p>
              <p>
                We reserve the right to modify these terms at any time. Your continued use following the posting of changes constitutes your acceptance of such changes.
              </p>
            </div>
          </section>

          {/* User Accounts */}
          <section className="md:col-span-4 bg-primary text-on-primary p-8 rounded-[2rem] shadow-xl shadow-blue-900/10 flex flex-col justify-between print:bg-gray-100 print:text-gray-900">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="text-on-primary bg-white/20 p-2 rounded-lg print:bg-gray-200">
                  <UserCircle size={20} />
                </div>
                <h2 className="text-xl font-black tracking-tight font-headline">User Accounts</h2>
              </div>
              <p className="text-on-primary/80 font-medium mb-6 leading-snug">
                To access certain features, you must register. You are responsible for maintaining your credentials.
              </p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> Accurate information required
              </li>
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> One user per account
              </li>
              <li className="flex items-start gap-2 text-sm font-bold">
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> Keep credentials secure
              </li>
            </ul>
          </section>

          {/* Code of Conduct */}
          <section className="md:col-span-12 bg-surface-container-low p-8 md:p-10 rounded-[2rem] print:bg-white">
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="md:w-1/3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-tertiary bg-tertiary/10 p-2 rounded-lg">
                    <Scale size={20} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-tertiary font-headline">
                    Code of Conduct
                  </h2>
                </div>
                <p className="text-on-surface-variant font-medium">
                  {DATA_CONTROLLER.name} is a space for educational growth. We maintain high standards of academic integrity and mutual respect.
                </p>
              </div>
              <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="text-error" size={18} />
                    <h3 className="font-black text-on-surface">No Cheating</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant">Automated scripts, bots, or external aids are strictly prohibited.</p>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="text-tertiary" size={18} />
                    <h3 className="font-black text-on-surface">Respect</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant">All interactions must be constructive, kind, and appropriate for an educational setting.</p>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-secondary" size={18} />
                    <h3 className="font-black text-on-surface">Academic Integrity</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant">Complete your own work. Do not share answers or impersonate other users.</p>
                </div>
                <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="text-primary" size={18} />
                    <h3 className="font-black text-on-surface">Privacy</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant">Respect others' privacy. Do not share personal information.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] border-2 border-surface-container-high">
            <h2 className="text-xl font-black mb-4 font-headline flex items-center gap-3">
              <Globe size={20} className="text-secondary" />
              Third-Party Services
            </h2>
            <ul className="space-y-3">
              {THIRD_PARTY_REGISTRY.slice(0, 4).map((party, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <CheckCircle size={16} className="text-tertiary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-on-surface">{party.name}</strong>
                    <p className="text-on-surface-variant">{party.purpose}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Data Retention */}
          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] border-2 border-surface-container-high">
            <h2 className="text-xl font-black mb-4 font-headline flex items-center gap-3">
              <Clock size={20} className="text-primary" />
              Data Retention
            </h2>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              <li className="flex items-start gap-3">
                <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-on-surface">Progress records:</strong> {RETENTION_PERIODS.progressRecordsDays} days</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-on-surface">Orphaned accounts:</strong> {RETENTION_PERIODS.orphanedStudentDays} days</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span><strong className="text-on-surface">Audit logs:</strong> {RETENTION_PERIODS.auditLogDays / 365} years</span>
              </li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="md:col-span-12 bg-surface-container-highest p-8 md:p-10 rounded-[2rem]">
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

          {/* Limitation of Liability & Termination */}
          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] border-2 border-surface-container-high">
            <h2 className="text-xl font-black mb-4 font-headline">
              Limitation of Liability
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              {DATA_CONTROLLER.name} is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from use of the service.
            </p>
          </section>

          <section className="md:col-span-6 bg-surface-container-lowest p-8 rounded-[2rem] border-2 border-surface-container-high">
            <h2 className="text-xl font-black mb-4 font-headline">
              Termination
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior toward other users or the platform.
            </p>
          </section>
        </div>

        <footer className="mt-20 border-t-2 border-surface-container-high pt-12 flex flex-col md:flex-row justify-between items-center gap-8 print:hidden">
          <p className="text-on-surface-variant">
            Questions?{" "}
            <span className="text-primary font-bold">{DATA_CONTROLLER.contactEmail}</span>
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
