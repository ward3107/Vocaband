import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../core/supabase';

interface OAuthCallbackProps {
  onTeacherDetected: (email: string) => void;
  onStudentDetected: (email: string) => void;
  onNewUser: (email: string, authUid: string) => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({
  onTeacherDetected,
  onStudentDetected,
  onNewUser
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your account...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error('No session found');
        }

        const userEmail = session.user.email;
        const authUid = session.user.id;

        if (!userEmail) {
          throw new Error('No email in session');
        }

        // Check if user is a teacher
        const { data: isTeacher, error: teacherError } = await supabase
          .rpc('is_teacher', { p_user_email: userEmail });

        if (teacherError) {
          console.error('Teacher check error:', teacherError);
          // Continue to student check
        }

        if (isTeacher) {
          setStatus('success');
          setMessage('Welcome back, Teacher!');
          setTimeout(() => onTeacherDetected(userEmail), 1000);
          return;
        }

        // Check if user is an existing student
        const { data: studentData, error: studentError } = await supabase
          .from('student_profiles')
          .select('id, email, status')
          .eq('email', userEmail)
          .single();

        if (studentError && studentError.code !== 'PGRST116') {
          // PGRST116 = not found, which is expected for new users
          console.error('Student check error:', studentError);
        }

        if (studentData) {
          setStatus('success');
          setMessage('Welcome back!');
          setTimeout(() => onStudentDetected(userEmail), 1000);
        } else {
          // New user - need class code
          setStatus('success');
          setMessage('Account verified! Please enter your class code.');
          setTimeout(() => onNewUser(userEmail, authUid), 1000);
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('Could not verify your account. Please try again.');
      }
    };

    handleOAuthCallback();
  }, [onTeacherDetected, onStudentDetected, onNewUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      {status === 'loading' && (
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-bold text-on-surface">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-on-surface">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <AlertTriangle size={48} className="text-rose-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-on-surface">{message}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:scale-105 transition-all"
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
};

export default OAuthCallback;
