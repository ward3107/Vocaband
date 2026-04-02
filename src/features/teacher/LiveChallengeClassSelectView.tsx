import React from "react";
import { Zap, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import * as authService from "../../services/authService";
import TopAppBar from "../../shared/components/TopAppBar";
import { SOCKET_EVENTS } from "../../core/types";
import type { ClassData } from "../../shared/types";
import type { Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LiveChallengeClassSelectViewProps {
  classes: ClassData[];
  socket: Socket | null;
  setView: (view: string) => void;
  setSelectedClass: (cls: ClassData) => void;
  setIsLiveChallenge: (v: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LiveChallengeClassSelectView: React.FC<LiveChallengeClassSelectViewProps> = ({
  classes,
  socket,
  setView,
  setSelectedClass,
  setIsLiveChallenge,
}) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopAppBar
        title="Live Mode for Classes"
        subtitle="SELECT A CLASS TO START"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => authService.signOut()}
      />

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 rounded-2xl p-6 mb-8 text-center shadow-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 shadow-lg">
              <Zap className="text-white" size={32} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Select a Class</h2>
            <p className="text-white/90 font-medium">Choose which class to start the Live Challenge for</p>
          </motion.div>
        </div>

        {/* Class Selection */}
        <div className="grid gap-4">
          {classes.map((cls, idx) => (
            <motion.button
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => {
                setSelectedClass(cls);
                setView("live-challenge");
                setIsLiveChallenge(true);
                if (socket) {
                  authService.getSession().then(({ data: { session } }) => {
                    const token = session?.access_token ?? "";
                    socket.emit(SOCKET_EVENTS.OBSERVE_CHALLENGE, { classCode: cls.code, token });
                  });
                }
              }}
              className="bg-surface-container-lowest rounded-xl p-6 border-2 border-surface-container hover:border-primary/50 hover:shadow-xl transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Zap className="text-on-primary-container" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-on-surface">{cls.name}</h3>
                    <p className="text-on-surface-variant text-sm font-medium">
                      Code: <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-mono font-bold ml-1">{cls.code}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all" size={24} />
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
};
