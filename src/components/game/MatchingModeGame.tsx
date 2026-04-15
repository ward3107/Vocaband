import { motion, AnimatePresence } from "framer-motion";

type MatchItem = { id: number; text: string; type: 'english' | 'arabic' };
type MatchSelection = { id: number; type: 'english' | 'arabic' };

interface MatchingModeGameProps {
  matchingPairs: MatchItem[];
  matchedIds: number[];
  selectedMatch: MatchSelection | null;
  isMatchingProcessing: boolean;
  onMatchClick: (item: MatchSelection) => void;
}

export default function MatchingModeGame({
  matchingPairs, matchedIds, selectedMatch, isMatchingProcessing, onMatchClick,
}: MatchingModeGameProps) {
  return (
    <motion.div
      key="matching"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-3"
    >
      <AnimatePresence>
        {matchingPairs.filter(item => !matchedIds.includes(item.id)).map((item, idx) => {
          const key = `${item.id}-${item.type}-${idx}`;
          return (
            <motion.button
              key={key}
              initial={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
              whileHover={{ scale: isMatchingProcessing ? 1 : 1.05 }}
              whileTap={{ scale: isMatchingProcessing ? 1 : 0.95 }}
              onClick={() => onMatchClick(item)}
              onTouchStart={(e) => { if (!isMatchingProcessing && !matchedIds.includes(item.id)) e.currentTarget.click(); }}
              disabled={isMatchingProcessing}
              dir="auto"
              style={{ touchAction: 'manipulation' }}
              className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm font-black text-lg sm:text-2xl h-20 sm:h-32 flex items-center justify-center transition-all duration-200 ${
                selectedMatch?.id === item.id && selectedMatch?.type === item.type
                  ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-200"
                  : "bg-white text-stone-800 hover:shadow-md"
              } ${isMatchingProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {item.text}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
