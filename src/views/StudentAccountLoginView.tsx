import { type ReactNode } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react";
import OAuthCallback from "../components/OAuthCallback";
import OAuthClassCode from "../components/OAuthClassCode";
import OAuthButton from "../components/OAuthButton";
import { AvatarPicker } from "../components/AvatarPicker";
import type { View } from "../core/views";

interface ExistingStudent {
  id: string;
  displayName: string;
  xp: number;
  status: string;
  avatar?: string;
}

interface StudentAccountLoginViewProps {
  setView: React.Dispatch<React.SetStateAction<View>>;
  error: string | null;
  setError: (err: string | null) => void;

  // Normal student login state
  studentLoginClassCode: string;
  setStudentLoginClassCode: (v: string) => void;
  studentLoginName: string;
  setStudentLoginName: (v: string) => void;
  existingStudents: ExistingStudent[];
  setExistingStudents: (students: ExistingStudent[]) => void;
  showNewStudentForm: boolean;
  setShowNewStudentForm: (v: boolean) => void;

  // Avatar state (shared with signup API calls in App.tsx)
  studentAvatar: string;
  setStudentAvatar: (avatar: string) => void;

  // OAuth flow state
  isOAuthCallback: boolean;
  setIsOAuthCallback: (v: boolean) => void;
  showOAuthClassCode: boolean;
  setShowOAuthClassCode: (v: boolean) => void;
  oauthEmail: string | null;
  setOauthEmail: (v: string | null) => void;
  oauthAuthUid: string | null;
  setOauthAuthUid: (v: string | null) => void;

  // Handlers
  handleOAuthTeacherDetected: (email: string) => Promise<void>;
  handleOAuthStudentDetected: (email: string) => Promise<void>;
  handleOAuthNewUser: (email: string, authUid: string) => void;
  handleLoginAsStudent: (studentId: string) => Promise<void>;
  handleNewStudentSignup: () => Promise<void>;
  loadStudentsInClass: (classCode: string) => Promise<void>;

  // Global cookie banner passthrough
  cookieBannerOverlay: ReactNode;
}

export default function StudentAccountLoginView({
  setView,
  error,
  setError,
  studentLoginClassCode,
  setStudentLoginClassCode,
  studentLoginName,
  setStudentLoginName,
  existingStudents,
  setExistingStudents,
  showNewStudentForm,
  setShowNewStudentForm,
  studentAvatar,
  setStudentAvatar,
  isOAuthCallback,
  setIsOAuthCallback,
  showOAuthClassCode,
  setShowOAuthClassCode,
  oauthEmail,
  setOauthEmail,
  oauthAuthUid,
  setOauthAuthUid,
  handleOAuthTeacherDetected,
  handleOAuthStudentDetected,
  handleOAuthNewUser,
  handleLoginAsStudent,
  handleNewStudentSignup,
  loadStudentsInClass,
  cookieBannerOverlay,
}: StudentAccountLoginViewProps) {
  return (
    <>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-tertiary/10 to-secondary/10">
        {/* OAuth Callback Handler */}
        {isOAuthCallback && (
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 md:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <OAuthCallback
                onTeacherDetected={handleOAuthTeacherDetected}
                onStudentDetected={handleOAuthStudentDetected}
                onNewUser={handleOAuthNewUser}
              />
            </motion.div>
          </div>
        )}

        {/* OAuth Class Code Entry */}
        {showOAuthClassCode && oauthEmail && oauthAuthUid && (
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 md:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setShowOAuthClassCode(false);
                      setOauthEmail(null);
                      setOauthAuthUid(null);
                    }}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                </div>
                <OAuthClassCode
                  email={oauthEmail}
                  authUid={oauthAuthUid}
                  onSuccess={async () => {
                    setShowOAuthClassCode(false);
                    setOauthEmail(null);
                    setOauthAuthUid(null);
                    // After class code entry, load the student profile and log them in
                    await handleOAuthStudentDetected(oauthEmail!);
                  }}
                  onError={setError}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Normal Student Login (only show if not in OAuth flow) */}
        {!isOAuthCallback && !showOAuthClassCode && (
          <>
            {/* Header */}
            <header className="w-full bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-3 shadow-sm">
              <button
                onClick={() => {
                  setView("public-landing");
                  setStudentLoginClassCode("");
                  setStudentLoginName("");
                  setExistingStudents([]);
                  setShowNewStudentForm(false);
                }}
                className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl signature-gradient flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl sm:text-2xl font-black font-headline italic">V</span>
                </div>
                <span className="text-lg sm:text-xl font-black signature-gradient-text hidden sm:block">Vocaband</span>
              </div>
            </header>

            {/* Main Content - centered and fits in viewport */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4 md:py-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg"
              >
                {/* Student Login Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10">
                  <div className="text-center mb-4 md:mb-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-lg">
                      <span className="text-3xl md:text-4xl">👤</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black font-headline mb-1 md:mb-2">
                      Student Login
                    </h1>
                    <p className="text-base md:text-lg font-bold text-on-surface-variant">
                      Join your class and save your progress!
                    </p>
                  </div>

                  {/* Returning vs New toggle.  Previously the "Request
                      Account" form lived in the code (showNewStudentForm
                      branch) but nothing in the UI flipped that flag to
                      true, so new students had no visible path and the
                      form was effectively dead code.  This segmented
                      control exposes it as a clear, mutually-exclusive
                      choice at the top of the card. */}
                  <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-surface-container-highest rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewStudentForm(false);
                        setError(null);
                      }}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      className={`py-3 px-4 rounded-xl text-sm font-black transition-all ${
                        !showNewStudentForm
                          ? "bg-white shadow-md text-primary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      I'm returning
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewStudentForm(true);
                        setError(null);
                      }}
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      className={`py-3 px-4 rounded-xl text-sm font-black transition-all ${
                        showNewStudentForm
                          ? "bg-white shadow-md text-primary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      I'm new
                    </button>
                  </div>

                  {!showNewStudentForm ? (
                    <>
                      {/* Class Code Input */}
                      <div className="space-y-3 mb-4 md:mb-6">
                        <div>
                          <label
                            htmlFor="student-class-code-input"
                            className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide"
                          >
                            Class Code
                          </label>
                          <input
                            id="student-class-code-input"
                            type="text"
                            value={studentLoginClassCode}
                            onChange={(e) => {
                              setStudentLoginClassCode(e.target.value.toUpperCase());
                              if (e.target.value.length >= 3) {
                                loadStudentsInClass(e.target.value);
                              }
                            }}
                            placeholder="MATH101"
                            maxLength={20}
                            autoFocus
                            aria-describedby={error ? "student-login-error" : undefined}
                            className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 uppercase"
                          />
                        </div>

                        {error && (
                          <motion.div
                            id="student-login-error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2"
                            role="alert"
                          >
                            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                          </motion.div>
                        )}
                      </div>

                      {/* Existing Students List */}
                      {studentLoginClassCode && existingStudents.length > 0 && (
                        <div className="mb-6">
                          <p className="text-sm font-bold mb-3 text-on-surface-variant uppercase tracking-wide">
                            Select your name:
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {existingStudents.map((student) => (
                              <button
                                key={student.id}
                                onClick={() => handleLoginAsStudent(student.id)}
                                className="w-full px-6 py-4 bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary-container rounded-xl text-left font-bold transition-all flex items-center justify-between group border-2 border-surface-container-highest hover:border-primary"
                              >
                                <span className="flex items-center gap-3">
                                  <span className="text-2xl">{student.avatar || '🦊'}</span>
                                  <span className="text-lg">{student.displayName}</span>
                                </span>
                                <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-primary-container">
                                  {student.xp} XP
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Students Found */}
                      {studentLoginClassCode && existingStudents.length === 0 && (
                        <div className="mb-6 p-4 bg-surface-container-highest rounded-xl text-center">
                          <p className="text-sm font-bold text-on-surface-variant">
                            No students found in this class yet.
                          </p>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Be the first to join! 👇
                          </p>
                        </div>
                      )}

                      {/* OAuth Sign In Button */}
                      <OAuthButton
                        onSuccess={(_email, _isNewUser) => {
                          // OAuth callback will handle routing
                          setIsOAuthCallback(true);
                        }}
                        onError={(errorMessage) => {
                          setError(errorMessage);
                        }}
                        beforeSignIn={() => {
                          // Persist the class code the student typed so that after
                          // the OAuth round-trip we can detect if they're trying to
                          // switch classes (existing profile class_code differs).
                          // Write to BOTH sessionStorage (clears at tab close, fast)
                          // and localStorage (survives full browser close so the
                          // switch intent survives the Google redirect even when
                          // sessionStorage is wiped between tabs on mobile).
                          const trimmed = studentLoginClassCode.trim().toUpperCase();
                          try {
                            if (trimmed) {
                              sessionStorage.setItem('oauth_intended_class_code', trimmed);
                              localStorage.setItem('oauth_intended_class_code', trimmed);
                            } else {
                              sessionStorage.removeItem('oauth_intended_class_code');
                              localStorage.removeItem('oauth_intended_class_code');
                            }
                          } catch { /* storage unavailable */ }
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {/* New Student Form */}
                      <div className="space-y-4 mb-6">
                        <div>
                          <label
                            htmlFor="new-student-class-code-input"
                            className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide"
                          >
                            Class Code
                          </label>
                          <input
                            id="new-student-class-code-input"
                            type="text"
                            value={studentLoginClassCode}
                            onChange={(e) => setStudentLoginClassCode(e.target.value.toUpperCase())}
                            placeholder="MATH101"
                            maxLength={20}
                            autoFocus
                            className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50 uppercase"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="new-student-name-input"
                            className="block text-sm font-bold mb-2 text-on-surface-variant uppercase tracking-wide"
                          >
                            Your Full Name
                          </label>
                          <input
                            id="new-student-name-input"
                            type="text"
                            value={studentLoginName}
                            onChange={(e) => setStudentLoginName(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleNewStudentSignup()}
                            placeholder="Sarah Johnson"
                            maxLength={30}
                            aria-describedby={error ? "new-student-error" : undefined}
                            className="w-full px-6 py-4 text-lg font-bold bg-surface-container-lowest rounded-xl border-2 border-surface-container-highest focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/50"
                          />
                        </div>

                        <AvatarPicker
                          value={studentAvatar}
                          onChange={setStudentAvatar}
                          label="Choose Your Avatar"
                        />

                        {error && (
                          <motion.div
                            id="new-student-error"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2"
                            role="alert"
                          >
                            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                          </motion.div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleNewStudentSignup}
                        className="w-full signature-gradient text-white py-5 rounded-xl text-xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mb-4"
                      >
                        Request Account
                        <Check size={24} />
                      </button>

                      {/* Info Notice */}
                      <div className="p-4 bg-tertiary-container text-on-tertiary-container rounded-xl">
                        <p className="text-sm font-bold text-center">
                          ⏳ <strong>Teacher Approval Required</strong>
                        </p>
                        <p className="text-xs text-center mt-1">
                          Tell your teacher to approve your account. Once approved, you can log in and start earning XP!
                        </p>
                      </div>
                    </>
                  )}

                </div>

                {/* Feature Pills */}
                {!showNewStudentForm && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {["✅ Save Progress", "✅ Earn XP", "✅ Assignments", "✅ Live Challenge"].map((feature, i) => (
                      <span
                        key={i}
                        className="px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-xs font-bold text-on-surface-variant shadow-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
        {cookieBannerOverlay}
      </div>
    </>
  );
}
