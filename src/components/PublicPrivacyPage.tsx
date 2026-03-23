import React from "react";
import { Shield, School, Lock, Mail, Database, Globe, Clock, Download, Trash2, FileOutput, UserX } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";
import {
  DATA_CONTROLLER,
  PRIVACY_POLICY_VERSION,
  HOSTING_REGIONS,
  THIRD_PARTY_REGISTRY,
  DATA_COLLECTION_POINTS,
  RETENTION_PERIODS,
} from "../privacy-config";

interface PublicPrivacyPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
  onGetStarted: () => void;
}

const PublicPrivacyPage: React.FC<PublicPrivacyPageProps> = ({
  onNavigate,
  onGetStarted,
}) => {
  const studentCollectionPoints = DATA_COLLECTION_POINTS.filter(
    (point) => point.role === "student" || point.role === "both"
  );

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <PublicNav
        currentPage="privacy"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0 print:pt-8">
        <section className="mb-12 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Version {PRIVACY_POLICY_VERSION}
            </span>
          </div>
          <h2 className="text-5xl font-black text-on-background tracking-tight mb-4 font-headline print:text-4xl">
            Privacy Policy
          </h2>
          <p className="text-xl text-on-surface-variant font-medium max-w-2xl leading-relaxed">
            We believe your data belongs to you. This policy explains what data we collect, how we use it, and your rights under Israeli PPA Amendment 13.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Student Security Card */}
          <div className="md:col-span-12 lg:col-span-8 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-xl print:bg-gray-100 print:text-gray-900 print:from-transparent print:via-transparent print:to-transparent print:shadow-none">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md print:bg-gray-200 px-4 py-1.5 rounded-full mb-6">
                <Shield size={14} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Student Security
                </span>
              </div>
              <h3 className="text-3xl md:text-4xl font-black mb-4 font-headline">
                Anonymity by Design
              </h3>
              <p className="text-lg text-blue-100 print:text-gray-600 font-medium leading-relaxed mb-8">
                {DATA_CONTROLLER.name} student accounts are built to be anonymous. We only require a display name and class code. No personal emails or phone numbers required for students.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 backdrop-blur-lg print:bg-gray-200 px-5 py-4 rounded-xl flex items-center gap-3">
                  <UserX size={18} className="text-blue-200 print:text-gray-500" />
                  <span className="font-bold print:text-gray-700">No Tracking</span>
                </div>
                <div className="bg-white/10 backdrop-blur-lg print:bg-gray-200 px-5 py-4 rounded-xl flex items-center gap-3">
                  <Lock size={18} className="text-blue-200 print:text-gray-500" />
                  <span className="font-bold print:text-gray-700">Encrypted Storage</span>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl print:hidden" />
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
                Teachers authenticate via Google OAuth. Professional educational emails are used for account management.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-surface-container-high flex items-center gap-2 text-primary font-bold text-sm">
              <Lock size={14} /> Secure Google Authentication
            </div>
          </div>

          {/* Data Collection Points */}
          <section className="md:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-4 font-headline flex items-center gap-3">
              <Database size={20} className="text-primary" />
              What We Collect
            </h3>
            <ul className="space-y-3 text-on-surface-variant text-sm">
              {studentCollectionPoints.slice(0, 6).map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">check_circle</span>
                  <span>
                    <strong className="text-on-surface">{point.location}:</strong>{" "}
                    {point.fields.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Your Rights */}
          <section className="md:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-4 font-headline flex items-center gap-3">
              <Shield size={20} className="text-secondary" />
              Your Rights
            </h3>
            <ul className="space-y-4 text-on-surface-variant text-sm">
              <li className="flex items-start gap-3">
                <Download size={18} className="text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">Access & Export</strong>
                  <p>Request a complete copy of your data in JSON format</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Trash2 size={18} className="text-error flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">Deletion</strong>
                  <p>Request permanent removal of your account and data</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <FileOutput size={18} className="text-tertiary flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">Portability</strong>
                  <p>Export your progress for use elsewhere</p>
                </div>
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="md:col-span-12 bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 border-2 border-surface-container-high">
            <div className="flex items-center gap-3 mb-6">
              <Globe size={20} className="text-secondary" />
              <h3 className="text-2xl font-black font-headline">Third-Party Services</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {THIRD_PARTY_REGISTRY.map((party, index) => (
                <div key={index} className="bg-surface-container-low p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-black text-on-surface">{party.name}</h4>
                    {party.processorOnly && (
                      <span className="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                        Processor
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant mb-2">{party.purpose}</p>
                  <p className="text-xs text-on-surface-variant/60">
                    Region: {party.hostingRegion}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Data Retention */}
          <section className="md:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-4 font-headline flex items-center gap-3">
              <Clock size={20} className="text-primary" />
              Data Retention
            </h3>
            <ul className="space-y-3 text-on-surface-variant text-sm">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">check_circle</span>
                <span>
                  <strong className="text-on-surface">Progress records:</strong>{" "}
                  {RETENTION_PERIODS.progressRecordsDays} days
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">check_circle</span>
                <span>
                  <strong className="text-on-surface">Orphaned accounts:</strong>{" "}
                  {RETENTION_PERIODS.orphanedStudentDays} days
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">check_circle</span>
                <span>
                  <strong className="text-on-surface">Audit logs:</strong>{" "}
                  {RETENTION_PERIODS.auditLogDays / 365} years
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">check_circle</span>
                <span>
                  <strong className="text-on-surface">Consent records:</strong>{" "}
                  {RETENTION_PERIODS.consentLogDays / 365} years
                </span>
              </li>
            </ul>
          </section>

          {/* Hosting Regions */}
          <section className="md:col-span-6 bg-surface-container-low rounded-[2rem] p-8">
            <h3 className="text-xl font-bold mb-4 font-headline flex items-center gap-3">
              <Globe size={20} className="text-tertiary" />
              Hosting Regions
            </h3>
            <ul className="space-y-3 text-on-surface-variant text-sm">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">dns</span>
                <span>
                  <strong className="text-on-surface">Database:</strong>{" "}
                  {HOSTING_REGIONS.supabase} (Supabase)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">cloud</span>
                <span>
                  <strong className="text-on-surface">Web Server:</strong>{" "}
                  {HOSTING_REGIONS.render} (Render)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">login</span>
                <span>
                  <strong className="text-on-surface">Google OAuth:</strong>{" "}
                  {HOSTING_REGIONS.googleAuth}
                </span>
              </li>
            </ul>
          </section>

          {/* Contact Section */}
          <div className="md:col-span-12 bg-surface-container-high/50 rounded-[2rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-black font-headline mb-2">
                Have questions about your privacy?
              </h3>
              <p className="text-on-surface-variant">
                Our privacy team is here to help. Contact us at:
              </p>
            </div>
            <a
              href={`mailto:${DATA_CONTROLLER.contactEmail}`}
              className="inline-flex items-center gap-4 bg-on-background text-background px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all print:bg-gray-200 print:text-gray-900"
            >
              <Mail size={20} /> {DATA_CONTROLLER.contactEmail}
            </a>
          </div>
        </div>
      </main>

      <MobileNav currentPage="privacy" onNavigate={onNavigate} />
    </div>
  );
};

export default PublicPrivacyPage;
