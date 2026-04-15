import React, { useState } from 'react';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../core/supabase';

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
  const [classCode, setClassCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
      const { data: classMatch, error: classLookupError } = await supabase
        .from('classes')
        .select('id, code')
        .eq('code', trimmedCode)
        .maybeSingle();
      if (classLookupError) {
        console.error('Class code lookup failed:', classLookupError);
        onError('Could not verify class code. Please try again.');
        setIsLoading(false);
        return;
      }
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

      {/* Class Code Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">
            Enter your class code:
          </label>
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="MATH101"
            className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant/20 focus:border-primary focus:outline-none text-lg font-bold text-center uppercase"
            disabled={isLoading}
            maxLength={20}
          />
        </div>

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
