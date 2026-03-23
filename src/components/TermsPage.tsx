import React from "react";
import { ArrowLeft, Printer, FileText, Scale, Users, Shield, AlertTriangle, Gavel, Mail } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";
import FloatingButtons from "./FloatingButtons";

const TermsPage: React.FC<TermsPageProps> = ({ onNavigate, onGetStarted }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface">
      <PublicNav
        currentPage="terms"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        {/* Header */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-4 font-headline">
            Terms of <span className="text-primary italic">Service</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant font-medium">
            <span className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Effective: March 2024
            </span>
            <span className="flex items-center gap-2">
              <Scale size={16} className="text-primary" />
              Version 2.0
            </span>
          </div>
          <p className="mt-4 text-lg text-on-surface-variant max-w-2xl">
            Vocaband is an educational vocabulary platform for Israeli schools. Students use anonymous accounts; teachers sign in with Google.
          </p>
        </section>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1: Acceptance */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">1</span>
              Acceptance of Terms
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              By accessing or using Vocaband ("the Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. These Terms constitute a legally binding agreement between you and Vocaband Educational Technologies.
            </p>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              We may modify these Terms at any time. Material changes will be communicated through the Service, and your continued use after such changes constitutes acceptance. As required by Israeli Privacy Protection Law (Amendment 13), significant changes will require your explicit consent.
            </p>
          </section>

          {/* Section 2: Description */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">2</span>
              Description of Service
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              Vocaband is an educational technology platform that helps students practice English vocabulary through interactive games. The Service is:
            </p>
            <ul className="space-y-2 text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Designed for use in Israeli schools under teacher supervision</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Aligned with the Israeli Ministry of Education English curriculum (Band 1, 2, 3)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Built to support anonymous student accounts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Intended for educational purposes only</span>
              </li>
            </ul>
          </section>

          {/* Section 3: User Accounts */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">3</span>
              <Users size={20} className="text-primary" />
              User Accounts
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-surface-container-low p-5 rounded-xl">
                <h3 className="font-bold text-on-surface mb-3">Teacher Accounts</h3>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li>• Sign in with pre-approved Google account</li>
                  <li>• Use official educational email address</li>
                  <li>• Responsible for account security</li>
                  <li>• Responsible for class management</li>
                </ul>
              </div>
              <div className="bg-surface-container-low p-5 rounded-xl">
                <h3 className="font-bold text-on-surface mb-3">Student Accounts</h3>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li>• Anonymous account with display name only</li>
                  <li>• Access via 6-digit class code</li>
                  <li>• No email or personal info required</li>
                  <li>• Should not use real full name</li>
                </ul>
              </div>
            </div>

            <p className="text-on-surface-variant leading-relaxed mt-4">
              <strong>School Authorization:</strong> By providing class codes to students, teachers represent that they have authorization from their educational institution to use Vocaband for educational purposes.
            </p>
          </section>

          {/* Section 4: Acceptable Use */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">4</span>
              <Shield size={20} className="text-primary" />
              Code of Conduct
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-green-600 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
                  You Agree To:
                </h3>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li>• Use for educational purposes only</li>
                  <li>• Maintain academic integrity</li>
                  <li>• Keep interactions respectful</li>
                  <li>• Report bugs and issues</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-red-500 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs">✕</span>
                  You Must NOT:
                </h3>
                <ul className="space-y-2 text-sm text-on-surface-variant">
                  <li>• Use bots or automated scripts</li>
                  <li>• Access others' accounts or data</li>
                  <li>• Use offensive or impersonating names</li>
                  <li>• Harass or bully other users</li>
                  <li>• Share class codes inappropriately</li>
                  <li>• Reverse-engineer the Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Teacher Responsibilities */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">5</span>
              Teacher Responsibilities
            </h2>
            <ul className="space-y-3 text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>Class Code Management:</strong> Keep codes confidential, share only with intended students</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>Supervision:</strong> Appropriately supervise student use</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>Data Management:</strong> Delete classes when no longer needed</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold">•</span>
                <span><strong>School Policies:</strong> Comply with institutional data protection policies</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Intellectual Property */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">6</span>
              Intellectual Property
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              All content on Vocaband—vocabulary lists, game designs, user interface, and software—is the property of Vocaband or its licensors and protected by intellectual property laws.
            </p>
            <p className="text-on-surface-variant leading-relaxed mt-4">
              You receive a limited, non-exclusive, non-transferable license to use the Service for educational purposes. You may not copy, reproduce, distribute, or create derivative works without permission.
            </p>
          </section>

          {/* Section 7: Data and Privacy */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">7</span>
              Data Protection
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Your use of the Service is governed by our <button onClick={() => onNavigate("privacy")} className="text-primary font-bold hover:underline">Privacy Policy</button>, which describes what data we collect, how we use it, your rights under Israeli Privacy Protection Law (Amendment 13), and how to access, correct, or delete your data.
            </p>
          </section>

          {/* Section 8: Limitation of Liability */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">8</span>
              <AlertTriangle size={20} className="text-amber-500" />
              Limitation of Liability
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              The Service is provided "AS IS" without warranties. We are not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed any amount paid for the Service in the preceding 12 months.
            </p>
          </section>

          {/* Section 9: Governing Law */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">9</span>
              <Gavel size={20} className="text-primary" />
              Governing Law
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              These Terms are governed by the laws of the <strong>State of Israel</strong>, including the Privacy Protection Law 5741-1981 (Amendment 13). Disputes shall be resolved in the competent courts of Tel Aviv, Israel.
            </p>
          </section>

          {/* Section 10: Contact */}
          <section className="bg-surface-container-high/50 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black font-headline mb-2">Questions?</h3>
              <p className="text-on-surface-variant">Contact us about these Terms.</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="mailto:legal@vocaband.com"
                className="inline-flex items-center gap-2 bg-on-background text-background px-6 py-3 rounded-xl font-black hover:scale-105 transition-all"
              >
                <Mail size={18} /> legal@vocaband.com
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t-2 border-surface-container-high pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-full flex items-center gap-2 hover:bg-surface-container transition-all"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={onGetStarted}
            className="signature-gradient px-8 py-3 rounded-full font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Accept & Continue
          </button>
        </footer>
      </main>

      <MobileNav currentPage="terms" onNavigate={onNavigate} />
      <FloatingButtons />
    </div>
  );
};

export default TermsPage;
