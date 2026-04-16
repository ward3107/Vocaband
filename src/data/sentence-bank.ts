// sentence-bank.ts
// Pre-written sentence bank + difficulty-leveled POS templates for Sentence Builder mode.
// Every word gets at least one sentence. Hand-written sentences take priority,
// then level-appropriate POS templates fill in the rest.

import { Word } from "./vocabulary";
import { SentenceDifficulty, DIFFICULTY_CONFIG } from "../constants/game";

// Re-export for backward compatibility
export type { SentenceDifficulty } from "../constants/game";
export { DIFFICULTY_CONFIG } from "../constants/game";

// ============================================================================
// POS-BASED SENTENCE TEMPLATES BY DIFFICULTY LEVEL
// ============================================================================

const LEVEL_TEMPLATES: Record<SentenceDifficulty, Record<string, string[]>> = {
  // Level 1: Beginner — 3-5 words, simple present, SVO
  1: {
    n: ["I see the {word}", "The {word} is nice", "I like the {word}"],
    v: ["I {word} every day", "She can {word} well", "We {word} a lot"],
    adj: ["It is very {word}", "She is {word}", "That looks {word}"],
    adv: ["She walks {word}", "He spoke {word}", "Run {word} now"],
    prep: ["It is {word} here", "Stand {word} the door", "Go {word} there"],
    conj: ["Go {word} come back", "Stay {word} he leaves"],
    default: ["I know {word}", "She said {word}", "We use {word}"],
  },
  // Level 2: Elementary — 5-7 words, present/past, simple connectors
  2: {
    n: ["I can see the {word} from here", "The {word} is very important", "She told me about the {word}"],
    v: ["I like to {word} every day", "She will {word} tomorrow morning", "They {word} together after school"],
    adj: ["That is a very {word} idea", "She felt {word} about the news", "The house looks very {word} today"],
    adv: ["She walked {word} to the door", "He {word} finished his homework", "They spoke {word} during the meeting"],
    prep: ["The book is {word} the table", "We walked {word} the park", "He stood {word} the door"],
    conj: ["I want to go {word} I am tired", "She smiled {word} she was happy"],
    default: ["I learned the word {word} today", "Can you use {word} in a sentence", "The teacher said {word} in class"],
  },
  // Level 3: Intermediate — 7-10 words, varied tenses, relative clauses
  3: {
    n: ["The {word} that she found was very interesting", "We need a good {word} because it is important", "He talked about the {word} during the lesson"],
    v: ["She decided to {word} when she got the chance", "They always {word} before the lesson starts in class", "He was trying to {word} but it was not easy"],
    adj: ["The story was so {word} that everyone listened carefully", "He felt very {word} because the test went well", "She said the weather was quite {word} this morning"],
    adv: ["She {word} finished her work before the bell rang", "He spoke {word} so that everyone could hear him", "They walked {word} through the park after lunch"],
    prep: ["The cat jumped {word} the fence and ran away", "She put the book {word} the shelf in her room", "We sat {word} the tree and talked for hours"],
    conj: ["She was happy {word} she got a good grade today", "He stayed home {word} he was not feeling well"],
    default: ["The teacher explained the word {word} to the whole class", "She had to use {word} in her homework assignment", "They learned about {word} during the English lesson today"],
  },
  // Level 4: Advanced — 10-15 words, complex grammar, conditionals, passive
  4: {
    n: ["Although the {word} seemed unusual at first she quickly got used to it", "The teacher explained that a good {word} can make a big difference in life", "Many students were surprised to learn that the {word} had such a long history"],
    v: ["If you {word} consistently every day you will see great improvement over time", "She was encouraged to {word} more often by her teacher and classmates", "He realized that he needed to {word} harder if he wanted to succeed"],
    adj: ["Even though the situation appeared quite {word} at first they managed to find a solution", "It is widely believed that being {word} can open many doors in life", "The teacher told them that being {word} was one of the most important qualities"],
    adv: ["She {word} completed the entire project before anyone else in the class had even started", "He spoke so {word} that the whole audience was completely impressed by his words", "They moved {word} through the crowded market looking for the best deals"],
    prep: ["The students gathered {word} the large table to discuss their group project together", "She carefully placed all her books {word} the shelf before leaving the room", "He stood {word} the window and watched the rain falling on the garden outside"],
    conj: ["She studied very hard for the exam {word} she wanted to get the highest grade possible", "He decided to stay at home {word} the weather outside was too cold and rainy"],
    default: ["The teacher asked the students to explain the meaning of {word} in their own words", "She discovered that understanding {word} was essential for passing the final exam", "After studying for weeks they finally understood how to use {word} correctly in sentences"],
  },
};

// ============================================================================
// HAND-WRITTEN SENTENCE BANK
// ============================================================================
// Map<wordId, string[]> — 2-3 quality sentences per word.
// Priority: first 50 words of Set 1 (ids 1-76) and Set 2 (ids 1041-1099).

const SENTENCE_BANK: Map<number, string[]> = new Map([
  // --- BAND 1 (first ~50 entries) ---
  [1, ["I know a little bit about cooking", "She speaks a little bit of French"]],
  [2, ["It is a pity that he left early", "What a pity we missed the show"]],
  [3, ["It is a shame you cannot come", "What a shame he lost the game"]],
  [4, ["There is a variety of food here", "She tried a variety of sports"]],
  [5, ["She traveled abroad last summer", "He wants to study abroad next year"]],
  [6, ["She speaks English with a French accent", "His accent is easy to understand"]],
  [7, ["I accept your kind invitation", "She will accept the job offer"]],
  [8, ["There was an accident on the road", "He had a small accident at home"]],
  [9, ["She will accompany me to the store", "He always accompanies his sister to school"]],
  [10, ["According to the news it will rain", "According to my teacher we have a test"]],
  [11, ["I have an ache in my back", "The ache in his leg got worse"]],
  [12, ["She wants to achieve her dream", "He will achieve great things one day"]],
  [13, ["The cat ran across the street", "We walked across the bridge together"]],
  [14, ["My favorite activity is swimming", "There is a fun activity after school"]],
  [15, ["The food was adequate for everyone", "His answer was adequate but not perfect"]],
  [16, ["An adjective describes a noun", "Can you find the adjective in this sentence"]],
  [17, ["She needs to adjust the mirror", "He will adjust to the new school"]],
  [18, ["I admire my mother very much", "They admire her courage and strength"]],
  [19, ["He will admit he was wrong", "She had to admit the truth"]],
  [20, ["One advantage of this is the price", "He has an advantage in the race"]],
  [21, ["They went on a big adventure", "The adventure was exciting and fun"]],
  [22, ["An adverb tells us how something happens", "She used an adverb in her sentence"]],
  [23, ["They advertise the new product on TV", "She wants to advertise her small shop"]],
  [24, ["The rain will affect the game", "Noise can affect your sleep"]],
  [26, ["She is afraid of the dark", "He was afraid to speak in class"]],
  [27, ["We went to the park afterwards", "She felt better afterwards"]],
  [28, ["His aim is to become a doctor", "She took aim at the target"]],
  [29, ["We arrived at the airport early", "The airport was very busy today"]],
  [30, ["She bought a new photo album", "His music album is very popular"]],
  [31, ["The fish was still alive", "She felt alive after the run"]],
  [32, ["I wish you all the best", "All the best for your new job"]],
  [33, ["We walked along the river", "The trees are along the road"]],
  [34, ["She read the story aloud in class", "He laughed aloud at the joke"]],
  [35, ["She had to alter the dress", "They will alter the plan today"]],
  [36, ["Although it rained we had fun", "She went outside although it was cold"]],
  [38, ["The sunset was truly amazing", "She had an amazing time at the party"]],
  [39, ["He was popular among his friends", "She sat among the other students"]],
  [40, ["A large amount of water was spilled", "She saved a small amount of money"]],
  [42, ["They will announce the winner soon", "She wanted to announce the good news"]],
  [43, ["We anticipate good weather tomorrow", "She did not anticipate the problem"]],
  [44, ["I do not live there anymore", "She does not play piano anymore"]],
  [45, ["Anyway I have to go now", "She was tired but came anyway"]],
  [46, ["They live in a small apartment", "The apartment has two bedrooms"]],
  [47, ["He gave her a sincere apology", "She wrote an apology to her friend"]],
  [48, ["I have an appointment at three", "She made an appointment with the doctor"]],
  [49, ["There are approximately fifty students here", "It takes approximately one hour to drive"]],
  [51, ["This area is known for its parks", "She lives in a quiet area"]],
  [52, ["His brother is in the army", "The army helped after the flood"]],
  [53, ["We looked around the room", "She walked around the block"]],
  [55, ["We waited for the arrival of the bus", "Her arrival surprised everyone"]],
  [56, ["She read an article about space", "The article was very interesting"]],
  [58, ["I will call you as soon as I can", "As soon as she arrived she called me"]],
  [60, ["He wants to ask a question", "She will ask her mother for help"]],
  [65, ["Please pay attention to the teacher", "The movie got my attention right away"]],
  [67, ["She has a positive attitude about school", "His attitude changed after the talk"]],
  [68, ["The audience clapped at the end", "There was a large audience in the hall"]],
  [69, ["The author wrote many famous books", "She is my favorite author"]],
  [70, ["The tickets are still available", "She is not available on Monday"]],
  [71, ["I was awake all night long", "She is always awake before sunrise"]],
  [72, ["He walked away from the door", "The bird flew far away"]],
  [73, ["She will come back tomorrow", "He put the book back on the shelf"]],
  [75, ["The weather is very bad today", "She had a bad day at school"]],
  [76, ["The baker made fresh bread today", "My uncle is a baker in town"]],

  // --- BAND 2 (first ~50 entries) ---
  [1041, ["A sense of humor makes people like you", "She has a great sense of humor"]],
  [1042, ["She has the ability to sing well", "His ability in math is impressive"]],
  [1043, ["He was absent from school today", "Two students were absent yesterday"]],
  [1044, ["I absolutely agree with you", "That is absolutely the right answer"]],
  [1045, ["The painting is very abstract", "She wrote an abstract for her paper"]],
  [1046, ["He wants an academic career", "Her academic results are excellent"]],
  [1047, ["She will accept the invitation", "They accept students from all countries"]],
  [1048, ["We found good accommodation near the beach", "The accommodation was clean and nice"]],
  [1049, ["Her information is always accurate", "The map was not very accurate"]],
  [1050, ["She wants to act in a play", "He will act as team leader"]],
  [1051, ["She is very active in class", "He leads an active lifestyle"]],
  [1052, ["The actual cost was much higher", "What is the actual time right now"]],
  [1053, ["She had to adapt to a new city", "Animals adapt to their environment"]],
  [1054, ["Please add some sugar to my tea", "She will add more details later"]],
  [1055, ["They decided to adopt a new rule", "She wants to adopt a pet cat"]],
  [1056, ["He made the same mistake again and again", "She tried again and again until she won"]],
  [1057, ["The team played against the champions", "She spoke against the new plan"]],
  [1058, ["He works at a travel agency", "The agency helps people find jobs"]],
  [1059, ["I agree with your idea completely", "They agree on most things"]],
  [1060, ["She looked ahead and saw the park", "We need to plan ahead"]],
  [1061, ["The country received aid after the storm", "She gave first aid to the boy"]],
  [1062, ["Her aim is to become a nurse", "He took careful aim at the ball"]],
  [1063, ["The aircraft landed safely at noon", "She saw a military aircraft above"]],
  [1064, ["He does not drink alcohol at all", "Alcohol is bad for your health"]],
  [1065, ["The two sisters look very alike", "All the houses here look alike"]],
  [1066, ["She studied all day long for the test", "We played outside all day long"]],
  [1067, ["They do not allow pets in the hotel", "The teacher will allow extra time"]],
  [1068, ["The names are in alphabetical order", "Please sort them in alphabetical order"]],
  [1069, ["She found an alternative solution", "Is there an alternative route"]],
  [1070, ["They visited an ancient castle in Europe", "The ancient city had beautiful ruins"]],
  [1071, ["She likes music and art and so on", "We bought fruit and vegetables and so on"]],
  [1072, ["The angel in the story was kind", "She drew a beautiful angel"]],
  [1073, ["She was angry about the broken toy", "He felt angry after the argument"]],
  [1074, ["She hurt her ankle while running", "His ankle is still sore today"]],
  [1076, ["They celebrated their wedding anniversary", "It is the anniversary of the school"]],
  [1077, ["The annual meeting is in March", "She won the annual science award"]],
  [1079, ["Anyhow I will try my best", "She was late but came anyhow"]],
  [1080, ["They live far apart from each other", "She stood apart from the group"]],
  [1081, ["Apart from math she likes all subjects", "Apart from the rain we had fun"]],
  [1082, ["A rainbow will appear after the rain", "She did not appear at the meeting"]],
  [1083, ["She filled out the job application", "The application was easy to complete"]],
  [1084, ["She will apply for the new job", "He decided to apply to the school"]],
  [1085, ["I really appreciate your kind help", "She will appreciate the flowers"]],
  [1086, ["She took a creative approach to the task", "We need a new approach"]],
  [1087, ["The committee will approve the plan", "She hopes they approve her request"]],
  [1088, ["The architect designed a modern house", "She wants to become an architect"]],
  [1090, ["This area has many good restaurants", "She knows the area very well"]],
  [1091, ["They always argue about small things", "She did not want to argue"]],
  [1092, ["She will arrange the flowers nicely", "He had to arrange a meeting"]],
  [1093, ["The police made an arrest last night", "They will arrest the thief soon"]],
  [1098, ["She studied every aspect of the problem", "One important aspect is the cost"]],
  [1099, ["The teacher will assess your writing", "They need to assess the damage"]],
]);

// ============================================================================
// SENTENCE GENERATION FUNCTIONS
// ============================================================================

/**
 * Get sentences for a given word at a specific difficulty level.
 * Priority: hand-written bank (filtered by word count) > inline word.sentences > level templates.
 */
export function getSentencesForWord(word: Word, difficulty: SentenceDifficulty = 2): string[] {
  const config = DIFFICULTY_CONFIG[difficulty];

  // 1. Check hand-written bank — filter by word count for the target level
  const handWritten = SENTENCE_BANK.get(word.id);
  if (handWritten && handWritten.length > 0) {
    const fitting = handWritten.filter(s => {
      const wc = s.split(/\s+/).length;
      return wc >= config.minWords && wc <= config.maxWords;
    });
    if (fitting.length > 0) return fitting;
    // If no hand-written sentence fits this level, still return them for levels 2-3
    // (most hand-written sentences are 5-9 words)
    if (difficulty === 2 || difficulty === 3) return handWritten;
  }

  // 2. Check inline sentences on the Word object
  if (word.sentences && word.sentences.length > 0) {
    const fitting = word.sentences.filter(s => {
      const wc = s.split(/\s+/).length;
      return wc >= config.minWords && wc <= config.maxWords;
    });
    if (fitting.length > 0) return fitting;
    if (difficulty === 2 || difficulty === 3) return word.sentences;
  }

  // 3. Multi-word phrases — use phrase-friendly fallback at appropriate length
  const isPhrase = word.english.includes(" ");
  if (isPhrase) {
    const phraseTemplates: Record<SentenceDifficulty, string[]> = {
      1: [`I say ${word.english}`, `She knows ${word.english}`],
      2: [`She learned to say ${word.english} in English`, `The teacher explained ${word.english} to the class`],
      3: [`The students practiced how to say ${word.english} correctly in class`, `She explained what ${word.english} means to her younger brother`],
      4: [`Although ${word.english} is not easy to understand she managed to use it correctly in her essay`, `The teacher asked everyone to write a paragraph using ${word.english} in at least two different sentences`],
    };
    return phraseTemplates[difficulty];
  }

  // 4. Fall back to level-appropriate POS templates
  const primaryPos = (word.pos || "").split(",")[0].trim().toLowerCase();
  const levelTemplates = LEVEL_TEMPLATES[difficulty];
  const templates = levelTemplates[primaryPos] || levelTemplates["default"];
  return templates.map(t => t.replace("{word}", word.english));
}

/**
 * Generate one random sentence per word for an assignment at a given difficulty.
 */
export function generateSentencesForAssignment(words: Word[], difficulty: SentenceDifficulty = 2): string[] {
  return words.map(word => {
    const sentences = getSentencesForWord(word, difficulty);
    return sentences[Math.floor(Math.random() * sentences.length)];
  });
}
