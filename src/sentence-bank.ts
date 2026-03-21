// sentence-bank.ts
// Pre-written sentence bank + POS-based templates for Sentence Builder mode.
// Every word gets at least one sentence. Hand-written sentences take priority,
// then POS templates fill in the rest. Can be replaced with AI generation later.

import { Word } from "./vocabulary";

// ============================================================================
// POS-BASED SENTENCE TEMPLATES
// ============================================================================
// {word} is replaced with the english word. Keep sentences 5-10 words.

const NOUN_TEMPLATES = [
  "I can see the {word} from here",
  "The {word} is very important",
  "She told me about the {word}",
];

const VERB_TEMPLATES = [
  "I like to {word} every day",
  "She will {word} tomorrow morning",
  "They {word} together after school",
];

const ADJ_TEMPLATES = [
  "That is a very {word} idea",
  "She felt {word} about the news",
  "The house looks very {word} today",
];

const ADV_TEMPLATES = [
  "She walked {word} to the door",
  "He {word} finished his homework",
  "They spoke {word} during the meeting",
];

const PREP_TEMPLATES = [
  "The book is {word} the table",
  "We walked {word} the park",
  "He stood {word} the door",
];

const CONJ_TEMPLATES = [
  "I want to go {word} I am tired",
  "She smiled {word} she was happy",
];

const DEFAULT_TEMPLATES = [
  "I learned the word {word} today",
  "Can you use {word} in a sentence",
  "The teacher said {word} in class",
];

const TEMPLATES: Record<string, string[]> = {
  n: NOUN_TEMPLATES,
  v: VERB_TEMPLATES,
  adj: ADJ_TEMPLATES,
  adv: ADV_TEMPLATES,
  prep: PREP_TEMPLATES,
  conj: CONJ_TEMPLATES,
  exclam: DEFAULT_TEMPLATES,
  pron: DEFAULT_TEMPLATES,
  default: DEFAULT_TEMPLATES,
};

// ============================================================================
// HAND-WRITTEN SENTENCE BANK
// ============================================================================
// Map<wordId, string[]> — 2-3 quality sentences per word.
// Priority: first 50 words of Band 1 (ids 1-76) and Band 2 (ids 1041-1099).

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
 * Get sentences for a given word.
 * Priority: hand-written bank > inline word.sentences > POS templates.
 */
export function getSentencesForWord(word: Word): string[] {
  // 1. Check hand-written bank
  const handWritten = SENTENCE_BANK.get(word.id);
  if (handWritten && handWritten.length > 0) return handWritten;

  // 2. Check inline sentences on the Word object
  if (word.sentences && word.sentences.length > 0) return word.sentences;

  // 3. Multi-word phrases — use phrase-friendly fallback
  const isPhrase = word.english.includes(" ");
  if (isPhrase) {
    return [
      `She learned to say ${word.english} in English`,
      `The teacher explained ${word.english} to the class`,
    ];
  }

  // 4. Fall back to POS templates
  const primaryPos = (word.pos || "").split(",")[0].trim().toLowerCase();
  const templates = TEMPLATES[primaryPos] || TEMPLATES["default"];
  return templates.map(t => t.replace("{word}", word.english));
}

/**
 * Generate one random sentence per word for an assignment.
 */
export function generateSentencesForAssignment(words: Word[]): string[] {
  return words.map(word => {
    const sentences = getSentencesForWord(word);
    return sentences[Math.floor(Math.random() * sentences.length)];
  });
}
