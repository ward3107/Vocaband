import React, { useState } from 'react';
import { Loader2, CheckCircle2, ArrowRight, Pencil } from 'lucide-react';
import { supabase } from '../core/supabase';
import { readIntendedClassCode, clearIntendedClassCode } from '../utils/oauthIntent';

interface OAuthClassCodeProps {
  email: string;
  authUid: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const OAuthClassCode: React.FC<OAuthClassCodeProps> = ({
  email,
  authUid,
  onSuccess,
  onError
}) => {
  // The class code the student typed on the previous (login) screen is
  // stashed in storage by `writeIntendedClassCode` before the Google
  // redirect.  Pre-fill from there so they don't retype it AND so the
  // submit button isn't left in its empty-input disabled state — the
  // single biggest source of "I clicked Join Class and nothing happened"
  // confusion.  Falling back to '' covers the cleared-storage / typed-
  // URL-directly path, which still shows the input as today.
  const prefilledCode = readIntendedClassCode() || '';
  const [classCode, setClassCode] = useState(prefilledCode);
  // Whether the code came from storage.  When true, render a read-only
  // confirmation chip instead of a text input so the student can't
  // accidentally clear it back to the broken empty state.  Tap-to-edit
  // toggles this off if they really want to change classes here.
  const [codeFromStorage, setCodeFromStorage] = useState(prefilledCode.length > 0);
  const [avatar, setAvatar] = useState(() => {
    // Random fun default so the avatar feels chosen-for-you instead of
    // always-fox.  Students who tap a different one still get the
    // picker; students who don't get a varied class roster instead of
    // 30 identical foxes.
    const pool = ['🦊','🦁','🐯','🐨','🐼','🐸','🐵','🦄','🐻','🐰','🦋','🐙','🦜','🐶','🐱','🦈','🐬','🦅','🐝','🦉','😎','🤓','🥳','🤩','🤠','🤖','🧙','🦸','🥷','🦖','🐉'];
    return pool[Math.floor(Math.random() * pool.length)];
  });
  const [isLoading, setIsLoading] = useState(false);
  // When the code is pre-filled, students only need to confirm the
  // avatar.  Open the picker by default so the affordance is obvious —
  // a single 4xl button labelled with one emoji reads as decoration,
  // not as something tap-able.
  const [showAvatarPicker, setShowAvatarPicker] = useState(prefilledCode.length > 0);

  const avatarCategories = [
    { name: 'Animals', emojis: ['🦊', '🦁', '🐯', '🐨', '🐼', '🐸', '🐵', '🦄', '🐻', '🐰', '🦋', '🐙', '🦜', '🐶', '🐱', '🦈', '🐬', '🦅', '🐝', '🦉'] },
    { name: 'Faces', emojis: ['😎', '🤓', '🥳', '😊', '🤩', '🥹', '😜', '🤗', '🥰', '😇', '🧐', '🤠', '😈', '🤡', '👻', '🤖', '👽', '💀'] },
    { name: 'Fantasy', emojis: ['🧙', '🧛', '🧜', '🧚', '🦸', '🦹', '🧝', '👸', '🤴', '🥷', '🦖', '🐉', '🧞', '🧟', '🎃'] },
    { name: 'Sports', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '⛳', '🏊', '🚴', '🏄'] },
    { name: 'Food', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🥨', '🍦', '🍩', '🍪', '🎂', '🍰', '🍉', '🍇', '🥑'] },
    { name: 'Objects', emojis: ['🎸', '🎹', '🎺', '🎷', '🪕', '🎻', '🎤', '🎧', '📷', '🎮', '🕹️', '💎', '🎨', '🔮', '🏆'] },
    { name: 'Vehicles', emojis: ['🚗', '🚕', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚀', '🛶', '🚲', '🛸', '🚁', '🚂', '⛵', '🛵'] },
    { name: 'Nature', emojis: ['🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '🌲', '🌳', '🌵', '🌴', '🍄', '🌾', '🌈', '❄️', '🌊'] },
    { name: 'Space', emojis: ['🚀', '🛸', '🌙', '⭐', '🌟', '💫', '✨', '☄️', '🪐', '🌍', '🔥', '💧', '🌕', '🌑', '🌌'] },
  ];

  const handleSubmit = async () => {
    const trimmedCode = classCode.trim().toUpperCase();

    if (!trimmedCode) {
      onError('Please enter a class code.');
      return;
    }

    setIsLoading(true);

    try {
      // Validate that the class code actually exists before creating a
      // student profile.  Without this check, a typo creates a "phantom"
      // student_profiles row in a class that doesn't exist — the student
      // never sees any assignments because no real class matches their
      // class_code.
      //
      // Direct .from('classes').select(...) returns an empty array here
      // because the post-20260430 RLS policy on `classes` only allows
      // SELECT for the teacher-owner OR a student already enrolled in
      // the class — and OAuth students mid-signup are neither.  The
      // SECURITY DEFINER RPC `class_lookup_by_code` (migration 20260505)
      // bypasses RLS, is auth-required, and rate-limited 30/min/uid.
      const { data: lookupRows, error: classLookupError } = await supabase
        .rpc('class_lookup_by_code', { p_code: trimmedCode });
      if (classLookupError) {
        console.error('Class code lookup failed:', classLookupError);
        onError('Could not verify class code. Please try again.');
        setIsLoading(false);
        return;
      }
      const classMatch = Array.isArray(lookupRows) && lookupRows.length > 0
        ? lookupRows[0]
        : null;
      if (!classMatch) {
        onError(`Class code "${trimmedCode}" not found. Please check with your teacher.`);
        setIsLoading(false);
        return;
      }

      // Use the Google display name (OAuth always provides one)
      const { data: { user } } = await supabase.auth.getUser();
      const googleDisplayName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];

      // Call OAuth student profile function
      const { data: result, error: rpcError } = await supabase
        .rpc('get_or_create_student_profile_oauth', {
          p_class_code: trimmedCode,
          p_display_name: googleDisplayName,
          p_email: email,
          p_auth_uid: authUid,
          p_avatar: avatar
        });

      if (rpcError) throw rpcError;

      if (!result || result.length === 0) {
        throw new Error('Failed to create student profile');
      }

      const profile = result[0].profile;
      const isNew = result[0].is_new;

      // Clear the stashed code now that it's been consumed.  Without
      // this, a student who logs out and a friend who signs in on the
      // same device would carry the previous student's intended class
      // code through their own OAuth flow.
      clearIntendedClassCode();

      if (profile.status === 'approved') {
        // Auto-approved (shouldn't happen with OAuth, but just in case)
        onSuccess();
      } else if (profile.status === 'pending_approval') {
        const message = isNew
          ? `Account created! Tell your teacher to approve "${googleDisplayName}" in class ${trimmedCode}.`
          : `Your account is pending approval. Please ask your teacher to approve it!`;

        // Show success message
        onError(message);
        setTimeout(() => {
          // Use replace() instead of href= so the OAuth redirect URL is
          // dropped from history.  Otherwise the back button on mobile
          // walks back through Google/Supabase URLs and exits the app.
          window.location.replace('/');
        }, 3000);
      }

    } catch (error) {
      console.error('Signup error:', error);
      onError('Could not create account. Please check your class code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      {/* Welcome Message */}
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-on-surface mb-2">
          Welcome, {email.split('@')[0]}!
        </h2>
        <p className="text-sm text-on-surface-variant">
          Signed in with Google ✅
        </p>
      </div>

      {/* Class Code — chip when pre-filled, input otherwise */}
      <div className="space-y-4">
        {codeFromStorage ? (
          <div>
            <p className="block text-sm font-bold text-on-surface mb-2">
              Joining class:
            </p>
            <div className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="text-lg font-bold tracking-wider text-emerald-800 truncate">
                  {classCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCodeFromStorage(false)}
                disabled={isLoading}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs flex items-center gap-1 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
                aria-label="Change class code"
              >
                <Pencil size={12} />
                Change
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="oauth-class-code" className="block text-sm font-bold text-on-surface mb-2">
              Enter your class code:
            </label>
            <input
              type="text"
              id="oauth-class-code"
              name="classCode"
              autoComplete="off"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="MATH101"
              className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant/20 focus:border-primary focus:outline-none text-lg font-bold text-center uppercase"
              disabled={isLoading}
              maxLength={20}
            />
          </div>
        )}

        {/* Avatar Selection */}
        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">
            Choose your avatar:
          </label>
          <button
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant/20 hover:border-primary focus:outline-none text-center text-4xl transition-all"
            disabled={isLoading}
          >
            {avatar}
          </button>

          {showAvatarPicker && (
            <div className="mt-2 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 max-h-64 overflow-y-auto">
              {avatarCategories.map((category) => (
                <div key={category.name} className="mb-4 last:mb-0">
                  <p className="text-xs font-bold text-on-surface-variant mb-2 uppercase">
                    {category.name}
                  </p>
                  <div className="grid grid-cols-8 gap-2">
                    {category.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setAvatar(emoji);
                          setShowAvatarPicker(false);
                        }}
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          avatar === emoji
                            ? 'bg-primary text-white scale-110'
                            : 'hover:bg-surface-container hover:scale-105'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !classCode}
          className="w-full signature-gradient text-white py-4 rounded-xl text-lg font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Join Class
              <ArrowRight size={20} />
            </>
          )}
        </button>

        {/* Help Text */}
        <p className="text-xs text-center text-on-surface-variant">
          Don't have a class code? Ask your teacher for the code to join your class.
        </p>
      </div>
    </div>
  );
};

export default OAuthClassCode;
