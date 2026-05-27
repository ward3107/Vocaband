/**
 * server/dreidel.ts — Dreidel live-blitz state machine.
 *
 * One in-memory session per classCode.  Lives, scoring, sudden death,
 * steal-a-life, and word validation all run server-side so clients
 * can't fake answers or hand themselves lives.
 *
 * Phase flow:   lobby → spinning → answering → roundEnd → (next spin)
 *                                                        → finished
 *
 * Power-ups are free-per-game (one each) to avoid round-trip XP debits.
 * If XP costs are desired later, deduct in onPowerUp before applying.
 */

import { randomInt } from "node:crypto";
import englishWords from "an-array-of-english-words";
import {
  DREIDEL_ALL_LETTERS,
  DREIDEL_MIN_WORD_LEN,
  DREIDEL_ROUND_END_MS,
  DREIDEL_SPIN_DURATION_MS,
  DREIDEL_STEAL_WINDOW_MS,
  DREIDEL_SUDDEN_DEATH_LETTERS,
  DREIDEL_SUDDEN_DEATH_SECONDS,
  DREIDEL_LIFE_STREAK,
  DREIDEL_TOPICS,
  pointsForLetter,
} from "../src/core/dreidel";
import type {
  DreidelConfig,
  DreidelPlayer,
  DreidelPowerUpId,
  DreidelRoundResult,
  DreidelState,
} from "../src/core/types";

// 275k common English words. Loaded once at boot into a Set for O(1) lookup.
const DICTIONARY: Set<string> = new Set(
  (englishWords as readonly string[]).map((w) => w.toLowerCase()),
);

// Topic → eligible word list (lowercase).  Kept small intentionally:
// when topicMode is on we want hits to feel earned, not trivial.
// Words drawn from the existing Vocaband curriculum + common grade-school
// nouns/verbs.  Append cautiously — repeats across topics are fine, the
// validator only checks membership in the round's topic list.
const TOPIC_WORDS: Record<string, ReadonlySet<string>> = {
  animals: new Set([
    "dog","cat","fish","bird","horse","cow","pig","sheep","goat","duck","chicken","fox","wolf","bear","lion","tiger","elephant","monkey","zebra","giraffe","kangaroo","panda","rabbit","mouse","rat","frog","snake","lizard","turtle","whale","dolphin","shark","octopus","squid","crab","lobster","ant","bee","butterfly","spider","owl","eagle","hawk","parrot","penguin","camel","donkey","deer","squirrel","hedgehog","hippo","rhino","raccoon","skunk","beaver","otter","seal","walrus","jellyfish","starfish","crocodile","alligator","peacock","flamingo","ostrich","swan","goose","turkey","pigeon","sparrow","robin","crow","bat","badger","mole","mongoose","lemur","koala","platypus","jaguar","leopard","cheetah","panther","gorilla","chimp","orangutan","baboon","yak","buffalo","bison","ox","mule","reindeer","moose","antelope","gazelle","wolverine","ferret","weasel","hyena","jackal","lynx","puma","cougar","cobra","viper","python","gecko","iguana","chameleon","newt","salamander","toad","tadpole","sardine","tuna","salmon","trout","cod","perch","carp","eel","ray","seahorse","clam","mussel","oyster","snail","slug","worm","caterpillar","moth","beetle","grasshopper","cricket","mosquito","fly","wasp","hornet","ladybug","scorpion","centipede","dragonfly","earthworm","emu","kiwi","puffin","seagull","heron","stork","pelican","vulture","falcon","raven","magpie","woodpecker","cuckoo","hummingbird","canary","finch","albatross",
  ]),
  food: new Set([
    "apple","banana","orange","grape","lemon","lime","peach","pear","plum","cherry","strawberry","raspberry","blueberry","mango","kiwi","melon","pineapple","watermelon","coconut","papaya","apricot","tomato","potato","carrot","onion","garlic","cabbage","lettuce","spinach","broccoli","cauliflower","celery","cucumber","pepper","corn","peas","beans","mushroom","pumpkin","radish","eggplant","zucchini","bread","butter","cheese","milk","yogurt","cream","egg","eggs","meat","beef","pork","chicken","turkey","duck","fish","tuna","salmon","shrimp","lobster","pasta","rice","noodle","noodles","pizza","burger","sandwich","soup","salad","cake","cookie","cookies","chocolate","candy","sugar","salt","pepper","honey","jam","jelly","syrup","sauce","ketchup","mustard","mayo","mayonnaise","vinegar","oil","flour","cereal","oatmeal","pancake","waffle","donut","muffin","cupcake","pie","tart","pudding","custard","icecream","sorbet","popcorn","chips","pretzel","cracker","nut","nuts","almond","walnut","peanut","cashew","raisin","date","fig","steak","bacon","sausage","ham","tofu","lentil","chickpea","oat","barley","wheat","quinoa","sushi","taco","burrito","wrap","kebab","curry","stew","casserole","omelet","omelette","crepe","pretzel","baguette","croissant","brownie","biscuit","scone","pizza","lasagna","ravioli","spaghetti","macaroni","gnocchi","risotto","paella","gazpacho","hummus","falafel","kebab","gyro","schnitzel","tortilla","quesadilla","enchilada","tamale","empanada","gumbo","jambalaya","goulash","borscht","ramen","udon","miso","wasabi","kimchi",
  ]),
  sports: new Set([
    "football","soccer","basketball","baseball","tennis","volleyball","hockey","rugby","cricket","golf","swim","swimming","running","cycling","biking","skating","skiing","snowboarding","surfing","sailing","rowing","boxing","wrestling","judo","karate","fencing","archery","gymnastics","yoga","pilates","dance","ballet","jogging","walking","hiking","climbing","diving","kayaking","canoeing","fishing","hunting","bowling","billiards","pool","darts","chess","ping","pong","badminton","squash","handball","polo","lacrosse","cheerleading","trampoline","skateboarding","rollerblading","windsurfing","kitesurfing","paragliding","skydiving","bungee","parkour","triathlon","marathon","sprint","hurdles","javelin","shotput","discus","pole","vault","wrestling","sumo","mma","capoeira","aikido","kendo","taekwondo","krav","sailing","yachting","golf","ski","tennis","run","jump","throw","kick","hit","catch","pass","dribble","shoot","score","win","race","game","match","team","coach","player","referee","umpire","field","court","pitch","track","stadium","arena","gym","pool","rink","slope","goal","net","ball","bat","racket","stick","puck","glove","helmet","jersey","trophy","medal","champion",
  ]),
  colors: new Set([
    "red","blue","green","yellow","orange","purple","pink","brown","black","white","gray","grey","violet","indigo","cyan","magenta","turquoise","teal","navy","gold","silver","bronze","beige","tan","cream","ivory","crimson","scarlet","maroon","ruby","coral","salmon","peach","apricot","amber","mustard","olive","emerald","jade","mint","lime","forest","khaki","aqua","azure","sapphire","cobalt","lavender","lilac","plum","mauve","fuchsia","rose","blush","copper","rust","sand","chocolate","mocha","sepia","charcoal","ebony","onyx","pearl","platinum","steel","slate","ash","fawn","chestnut","mahogany","umber","ochre","sienna","cerulean","periwinkle","aquamarine","viridian","celadon","verdigris","seafoam","chartreuse","saffron","vermillion","carmine","burgundy","wine","rouge","blonde","auburn","brunette","redhead","colorful","pale","dark","bright","light","deep","vivid","dull","faded","rainbow",
  ]),
  clothing: new Set([
    "shirt","pants","trousers","jeans","skirt","dress","blouse","tshirt","jacket","coat","sweater","hoodie","cardigan","vest","scarf","hat","cap","beanie","beret","helmet","gloves","mittens","socks","shoes","boots","sandals","slippers","sneakers","heels","flats","tie","bowtie","belt","suspenders","watch","ring","necklace","bracelet","earring","earrings","glasses","sunglasses","backpack","purse","bag","handbag","wallet","raincoat","poncho","cloak","robe","pajamas","pyjamas","nightgown","swimsuit","bikini","shorts","leggings","tights","stockings","tracksuit","uniform","apron","overalls","tuxedo","suit","blazer","gown","kimono","sari","kilt","turban","veil","mask","tutu","leotard","jersey","jumper","pullover","top","bottom","outfit","clothes","clothing","fashion","style","accessory","brooch","cufflinks","barrette","headband","bandana","cape","mantle","shawl",
  ]),
  school: new Set([
    "book","books","pen","pencil","crayon","marker","eraser","ruler","scissors","glue","tape","stapler","notebook","binder","folder","backpack","desk","chair","blackboard","whiteboard","chalk","paper","page","ink","computer","laptop","tablet","calculator","map","globe","clock","bell","library","classroom","gym","cafeteria","hallway","locker","playground","teacher","student","principal","homework","test","exam","quiz","grade","mark","lesson","class","subject","math","science","english","history","geography","music","art","reading","writing","spelling","arithmetic","biology","chemistry","physics","language","grammar","literature","poetry","essay","report","project","assignment","study","learn","teach","read","write","draw","paint","calculate","solve","question","answer","problem","solution","textbook","workbook","dictionary","atlas","encyclopedia","journal","diary","syllabus","timetable","schedule","semester","term","report","card","diploma","certificate","graduation","university","college","kindergarten","preschool","elementary","middle","high","brain","mind","knowledge",
  ]),
  verbs: new Set([
    "run","walk","jump","skip","hop","climb","crawl","swim","fly","drive","ride","sit","stand","lie","sleep","wake","eat","drink","cook","bake","read","write","draw","paint","sing","dance","play","work","study","learn","teach","think","know","remember","forget","like","love","hate","want","need","have","make","do","go","come","leave","arrive","enter","exit","open","close","start","stop","finish","begin","end","try","help","push","pull","throw","catch","kick","hit","punch","carry","hold","drop","pick","take","give","get","find","lose","keep","buy","sell","pay","cost","spend","save","earn","steal","borrow","lend","build","break","fix","cut","tear","fold","tie","untie","wash","clean","dry","brush","comb","wear","dress","undress","look","see","watch","stare","glance","hear","listen","speak","talk","say","tell","ask","answer","whisper","shout","scream","cry","laugh","smile","frown","sneeze","cough","yawn","blink","wink","nod","shake","wave","point","clap","hug","kiss","wash","cook","heat","cool","freeze","melt","burn","light","blow","grow","plant","water","feed","ride","sail","fish","hunt","camp","travel","visit","return","stay","wait","follow","lead","guide","chase","escape","hide","seek","fight","defend","attack","protect","save","rescue","drown","slip","fall","trip","stumble","balance","spin","turn","twist","bend","stretch","lift","lower","raise","reach","grab","grip","release","drop","carry","deliver","send","mail","call","ring","knock","unlock","press","squeeze","tickle","poke","scratch","rub","mix","stir","pour","fill","empty","drain","spill","splash","sprinkle","spray","wipe","sweep","mop","scrub","polish",
  ]),
  feelings: new Set([
    "happy","sad","angry","mad","glad","tired","sleepy","awake","alert","bored","excited","surprised","shocked","scared","afraid","brave","calm","nervous","anxious","worried","stressed","relaxed","peaceful","content","grateful","thankful","proud","ashamed","embarrassed","shy","confident","jealous","envious","lonely","loved","cared","hopeful","hopeless","cheerful","gloomy","grumpy","cranky","cross","irritated","annoyed","frustrated","disappointed","pleased","delighted","thrilled","ecstatic","joyful","miserable","depressed","hurt","heartbroken","crushed","upset","tearful","weepy","grieving","mourning","amazed","astonished","stunned","puzzled","confused","curious","interested","focused","distracted","absent","present","keen","eager","reluctant","willing","unwilling","determined","stubborn","patient","impatient","kind","mean","rude","polite","gentle","rough","tough","sensitive","tender","loving","caring","warm","cold","cool","hot","fiery","bubbly","dull","sharp","quick","slow","sluggish","energetic","weary","exhausted","drained","refreshed","alive","awake","alert","drowsy","dreamy","focused","sad","loved","funny","silly","serious","goofy","wacky","wild","gentle","brave","heroic","cowardly","timid","bold","daring","fearful","fearless","secure","insecure","strong","weak","powerful","helpless","helpful",
  ]),
  nature: new Set([
    "tree","trees","leaf","leaves","branch","root","flower","flowers","rose","tulip","daisy","sunflower","lily","grass","bush","plant","forest","jungle","wood","woods","park","garden","meadow","field","desert","beach","sand","sea","ocean","lake","river","stream","pond","waterfall","mountain","hill","valley","cliff","cave","rock","stone","pebble","boulder","sky","cloud","clouds","sun","moon","star","stars","planet","earth","wind","breeze","storm","rain","snow","hail","sleet","fog","mist","ice","frost","dew","rainbow","lightning","thunder","sunrise","sunset","dawn","dusk","twilight","season","spring","summer","autumn","winter","fall","weather","climate","fire","flame","smoke","ash","mud","soil","dirt","clay","seed","fruit","berry","mushroom","fern","moss","vine","ivy","cactus","palm","oak","pine","maple","birch","willow","elm","beech","cedar","redwood","sequoia","sapling","stump","log","bark","sap","nest","beehive","reef","coral","shell","wave","tide","current","island","peninsula","bay","gulf","strait","ridge","peak","summit","plateau","canyon","gorge","crater","volcano","glacier","iceberg","tundra","savanna","prairie","swamp","marsh","bog","wetland","oasis","spring","geyser","reservoir","creek","brook","tributary",
  ]),
  household: new Set([
    "bed","pillow","blanket","sheet","mattress","table","chair","sofa","couch","cushion","carpet","rug","mat","floor","wall","ceiling","roof","door","window","curtain","blind","shelf","cupboard","drawer","cabinet","closet","wardrobe","mirror","lamp","light","bulb","candle","fan","heater","radiator","stove","oven","fridge","refrigerator","freezer","microwave","kettle","toaster","blender","mixer","dishwasher","washer","dryer","sink","faucet","tap","bathtub","shower","toilet","towel","soap","shampoo","toothbrush","toothpaste","comb","brush","razor","scissors","mirror","clock","calendar","picture","painting","frame","vase","plant","pot","pan","kettle","cup","mug","glass","bowl","plate","dish","spoon","fork","knife","chopsticks","napkin","placemat","tablecloth","tray","platter","bottle","jar","jug","pitcher","tin","can","container","bin","trash","garbage","broom","mop","duster","vacuum","sponge","bucket","bag","basket","hanger","ladder","stool","bench","ottoman","footstool","desk","bookcase","bookshelf","fireplace","mantel","hearth","chimney","stairs","banister","railing","balcony","porch","patio","deck","garage","attic","basement","cellar","pantry","laundry","kitchen","bathroom","bedroom","study","office","den","hallway","entryway","foyer","living","dining","nursery","playroom",
  ]),
  jobs: new Set([
    "teacher","doctor","nurse","dentist","engineer","lawyer","judge","police","officer","firefighter","soldier","sailor","pilot","driver","mechanic","plumber","electrician","carpenter","builder","painter","architect","designer","artist","writer","author","poet","journalist","reporter","editor","publisher","scientist","biologist","chemist","physicist","mathematician","programmer","developer","coder","analyst","accountant","banker","cashier","clerk","secretary","manager","director","ceo","entrepreneur","baker","chef","cook","waiter","waitress","bartender","barber","hairdresser","tailor","seamstress","cobbler","jeweler","florist","gardener","farmer","fisherman","hunter","shepherd","rancher","veterinarian","vet","trainer","coach","athlete","dancer","singer","musician","composer","conductor","actor","actress","director","producer","photographer","cameraman","reporter","anchor","host","comedian","magician","clown","juggler","acrobat","gymnast","wrestler","boxer","racer","jockey","umpire","referee","translator","interpreter","librarian","curator","historian","archaeologist","geologist","astronomer","explorer","sailor","captain","admiral","general","major","colonel","sergeant","private","spy","agent","detective","investigator","guard","watchman","janitor","cleaner","maid","butler","nanny","babysitter","tutor","professor","principal","priest","monk","nun","rabbi","imam","preacher","missionary","monk","politician","mayor","governor","senator","president","minister","ambassador","diplomat","economist","therapist","psychologist","psychiatrist","surgeon","pharmacist","midwife","paramedic","ranger","lifeguard","masseur","masseuse",
  ]),
  transport: new Set([
    "car","truck","bus","van","taxi","cab","minivan","suv","jeep","limo","limousine","tractor","bulldozer","crane","forklift","ambulance","firetruck","police","motorcycle","scooter","moped","bicycle","bike","tricycle","unicycle","skateboard","rollerblades","skis","sled","sleigh","snowmobile","train","tram","streetcar","subway","metro","monorail","locomotive","wagon","carriage","coach","cart","stroller","wheelchair","boat","ship","yacht","canoe","kayak","raft","sailboat","ferry","submarine","tanker","barge","tugboat","cruiser","destroyer","battleship","aircraft","airplane","plane","jet","helicopter","glider","balloon","blimp","rocket","spaceship","shuttle","ufo","satellite","drone","kite","parachute","hovercraft","gondola","cablecar","funicular","escalator","elevator","lift","crane","forklift","tractor","trailer","caravan","camper","rv","motorhome","truck","pickup","convertible","sedan","hatchback","wagon","coupe","roadster","racecar","tricycle","horse","camel","donkey","mule","elephant","sled","cart","wheel","tire","engine","motor","fuel","gas","gasoline","diesel","petrol","road","street","highway","freeway","avenue","lane","alley","bridge","tunnel","station","terminal","airport","port","harbor","dock","pier","platform","track","rail","runway","crossing","intersection","traffic","light","sign","stop","park","drive","ride","fly","sail","row","paddle","steer",
  ]),
};

// Per-class active sessions.  classCode → state.
const sessions: Map<string, DreidelState> = new Map();
// Timer handles per session (for cleanup on end).
const timers: Map<string, NodeJS.Timeout> = new Map();
// Per-game used-word memory.  Kept off DreidelState so we don't ship it
// to clients (network noise) and so the state object stays serializable.
const usedWords: Map<string, Set<string>> = new Map();
// Power-up uses per (classCode, uid, powerUpId) — capped at 1 per game.
const powerUpsUsed: Map<string, Set<string>> = new Map();
// Tracks when the current answering window opened so steal-a-life can
// measure response time.
const answeringStartedAt: Map<string, number> = new Map();

// Public surface — server.ts wires these into socket events.

export interface DreidelDeps {
  /** Broadcast `state` snapshot to every socket in the class room. */
  emitState: (classCode: string, state: DreidelState) => void;
  /** Send the round result for the lobby reveal. */
  emitResult: (classCode: string, result: DreidelRoundResult) => void;
  /** Push final results and stop the session. */
  emitEnd: (classCode: string, state: DreidelState) => void;
}

export class DreidelEngine {
  constructor(private deps: DreidelDeps) {}

  getState(classCode: string): DreidelState | undefined {
    return sessions.get(classCode);
  }

  /** Teacher created a new game.  Resets any prior state. */
  create(classCode: string, config: DreidelConfig): DreidelState {
    this.cleanup(classCode);
    const state: DreidelState = {
      classCode,
      phase: "lobby",
      config,
      players: {},
      roundNumber: 0,
      currentLetter: null,
      currentTopic: null,
      deadlineMs: null,
      lastResult: null,
      inSuddenDeath: false,
    };
    sessions.set(classCode, state);
    usedWords.set(classCode, new Set());
    powerUpsUsed.set(classCode, new Set());
    this.deps.emitState(classCode, state);
    return state;
  }

  /** Student joined the lobby.  No-op if game already finished. */
  join(
    classCode: string,
    uid: string,
    name: string,
    isGuest: boolean,
  ): DreidelState | null {
    const state = sessions.get(classCode);
    if (!state || state.phase === "finished") return null;
    if (!state.players[uid]) {
      state.players[uid] = {
        uid,
        name,
        lives: state.config.startingLives,
        score: 0,
        correctStreak: 0,
        totalCorrect: 0,
        eliminated: false,
        isGuest,
      };
      this.deps.emitState(classCode, state);
    }
    return state;
  }

  /** Teacher triggered the next spin. */
  spin(classCode: string): void {
    const state = sessions.get(classCode);
    if (!state) return;
    if (state.phase === "spinning" || state.phase === "answering") return;
    const alive = alivePlayers(state);
    if (alive.length === 0) {
      this.finish(classCode);
      return;
    }
    // Auto-finish if only 1 alive AND we've played at least one round.
    if (alive.length === 1 && state.roundNumber > 0) {
      this.finish(classCode);
      return;
    }

    state.phase = "spinning";
    state.currentLetter = null;
    state.currentTopic = null;
    state.deadlineMs = null;
    state.lastResult = null;
    state.inSuddenDeath = state.config.suddenDeath && alive.length === 2;
    this.deps.emitState(classCode, state);

    const t = setTimeout(() => this.openAnswering(classCode), DREIDEL_SPIN_DURATION_MS);
    timers.set(classCode, t);
  }

  /** Submit a word.  First valid answer wins the round. */
  answer(classCode: string, uid: string, raw: string): void {
    const state = sessions.get(classCode);
    if (!state || state.phase !== "answering") return;
    const player = state.players[uid];
    if (!player || player.eliminated) return;
    const word = (raw || "").trim().toLowerCase();
    if (word.length < DREIDEL_MIN_WORD_LEN) return;
    const letter = state.currentLetter?.toLowerCase();
    if (!letter || !word.startsWith(letter)) return;
    const used = usedWords.get(classCode);
    if (used?.has(word)) return;
    if (!DICTIONARY.has(word)) return;
    if (state.currentTopic) {
      const topicSet = TOPIC_WORDS[state.currentTopic];
      if (!topicSet || !topicSet.has(word)) return;
    }
    // Valid winner.
    used?.add(word);
    this.resolveWin(classCode, uid, word);
  }

  /** Player spent a power-up.  Free, one-per-game per player. */
  powerUp(classCode: string, uid: string, powerUp: DreidelPowerUpId): { ok: boolean; reason?: string; sample?: string } {
    const state = sessions.get(classCode);
    if (!state) return { ok: false, reason: "no_session" };
    const player = state.players[uid];
    if (!player || player.eliminated) return { ok: false, reason: "not_playing" };
    const usageKey = `${uid}:${powerUp}`;
    const used = powerUpsUsed.get(classCode);
    if (used?.has(usageKey)) return { ok: false, reason: "already_used" };
    used?.add(usageKey);

    if (powerUp === "skip") {
      // Force a round-end with no winner, then re-spin.
      if (state.phase !== "answering" && state.phase !== "spinning") {
        return { ok: false, reason: "wrong_phase" };
      }
      const handle = timers.get(classCode);
      if (handle) clearTimeout(handle);
      this.resolveTimeout(classCode);
      return { ok: true };
    }
    if (powerUp === "extraTime") {
      if (state.phase !== "answering" || !state.deadlineMs) {
        return { ok: false, reason: "wrong_phase" };
      }
      state.deadlineMs += 3000;
      // Reset the timeout to the new deadline.
      const handle = timers.get(classCode);
      if (handle) clearTimeout(handle);
      const ms = Math.max(0, state.deadlineMs - Date.now());
      const t = setTimeout(() => this.resolveTimeout(classCode), ms);
      timers.set(classCode, t);
      this.deps.emitState(classCode, state);
      return { ok: true };
    }
    if (powerUp === "peek") {
      if (state.phase !== "answering" || !state.currentLetter) {
        return { ok: false, reason: "wrong_phase" };
      }
      // Find a sample winning word (first 2 letters returned only).
      const letter = state.currentLetter.toLowerCase();
      const sample = sampleWordForLetter(letter, usedWords.get(classCode), state.currentTopic ?? undefined);
      return { ok: true, sample: sample ? sample.substring(0, 2) : letter };
    }
    return { ok: false, reason: "unknown" };
  }

  end(classCode: string): void {
    this.finish(classCode);
  }

  cleanup(classCode: string): void {
    const handle = timers.get(classCode);
    if (handle) clearTimeout(handle);
    timers.delete(classCode);
    sessions.delete(classCode);
    usedWords.delete(classCode);
    powerUpsUsed.delete(classCode);
    answeringStartedAt.delete(classCode);
  }

  // ── internals ─────────────────────────────────────────────────────────

  private openAnswering(classCode: string): void {
    const state = sessions.get(classCode);
    if (!state) return;
    // crypto.randomInt — Math.random is predictable enough that a
    // student could (in principle) pre-compute upcoming letters; CodeQL
    // also flags Math.random in a game-decision context as insecure.
    const letterPool = state.inSuddenDeath ? DREIDEL_SUDDEN_DEATH_LETTERS : DREIDEL_ALL_LETTERS;
    const letter = letterPool[randomInt(letterPool.length)];
    state.currentLetter = letter;
    state.currentTopic = state.config.topicMode
      ? DREIDEL_TOPICS[randomInt(DREIDEL_TOPICS.length)]
      : null;
    const seconds = state.inSuddenDeath
      ? DREIDEL_SUDDEN_DEATH_SECONDS
      : state.config.timerSeconds;
    state.deadlineMs = Date.now() + seconds * 1000;
    state.phase = "answering";
    state.roundNumber += 1;
    answeringStartedAt.set(classCode, Date.now());
    this.deps.emitState(classCode, state);

    const t = setTimeout(() => this.resolveTimeout(classCode), seconds * 1000);
    timers.set(classCode, t);
  }

  private resolveWin(classCode: string, winnerUid: string, word: string): void {
    const state = sessions.get(classCode);
    if (!state || !state.currentLetter) return;
    const handle = timers.get(classCode);
    if (handle) clearTimeout(handle);

    const winner = state.players[winnerUid];
    if (!winner) return;
    const points = pointsForLetter(state.currentLetter);
    winner.score += points;
    winner.correctStreak += 1;
    winner.totalCorrect += 1;

    const outcomes: DreidelRoundResult["outcomes"] = {};
    let livesGained = 0;
    if (winner.correctStreak > 0 && winner.correctStreak % DREIDEL_LIFE_STREAK === 0) {
      winner.lives += 1;
      livesGained += 1;
    }

    // Steal-a-life: if the answer landed inside the steal window and the
    // option is enabled, take one life from a random alive opponent.
    const openedAt = answeringStartedAt.get(classCode) ?? Date.now();
    const elapsed = Date.now() - openedAt;
    let stoleFromUid: string | undefined;
    if (state.config.stealOnFast && elapsed <= DREIDEL_STEAL_WINDOW_MS) {
      const targets = Object.values(state.players).filter(
        (p) => p.uid !== winnerUid && !p.eliminated && p.lives > 0,
      );
      if (targets.length > 0) {
        const victim = targets[randomInt(targets.length)];
        victim.lives -= 1;
        if (victim.lives <= 0) victim.eliminated = true;
        winner.lives += 1;
        livesGained += 1;
        stoleFromUid = victim.uid;
        outcomes[victim.uid] = {
          livesLost: 1,
          livesGained: 0,
          pointsEarned: 0,
        };
      }
    }
    outcomes[winnerUid] = {
      livesLost: 0,
      livesGained,
      pointsEarned: points,
      stoleFromUid,
    };

    const result: DreidelRoundResult = {
      letter: state.currentLetter,
      topic: state.currentTopic,
      winnerUid,
      winnerName: winner.name,
      winningWord: word,
      outcomes,
    };
    state.lastResult = result;
    state.phase = "roundEnd";
    this.deps.emitResult(classCode, result);
    this.deps.emitState(classCode, state);
    this.scheduleNextSpin(classCode);
  }

  private resolveTimeout(classCode: string): void {
    const state = sessions.get(classCode);
    if (!state || !state.currentLetter) return;

    // Everyone alive loses a life on timeout.
    const outcomes: DreidelRoundResult["outcomes"] = {};
    for (const player of Object.values(state.players)) {
      if (player.eliminated) continue;
      player.lives -= 1;
      player.correctStreak = 0;
      if (player.lives <= 0) player.eliminated = true;
      outcomes[player.uid] = { livesLost: 1, livesGained: 0, pointsEarned: 0 };
    }
    const result: DreidelRoundResult = {
      letter: state.currentLetter,
      topic: state.currentTopic,
      winnerUid: null,
      winnerName: null,
      winningWord: null,
      outcomes,
    };
    state.lastResult = result;
    state.phase = "roundEnd";
    this.deps.emitResult(classCode, result);
    this.deps.emitState(classCode, state);
    this.scheduleNextSpin(classCode);
  }

  private scheduleNextSpin(classCode: string): void {
    const state = sessions.get(classCode);
    if (!state) return;
    const t = setTimeout(() => {
      const alive = alivePlayers(state);
      if (alive.length <= 1) {
        this.finish(classCode);
        return;
      }
      this.spin(classCode);
    }, DREIDEL_ROUND_END_MS);
    timers.set(classCode, t);
  }

  private finish(classCode: string): void {
    const state = sessions.get(classCode);
    if (!state) return;
    const handle = timers.get(classCode);
    if (handle) clearTimeout(handle);
    state.phase = "finished";
    state.currentLetter = null;
    state.currentTopic = null;
    state.deadlineMs = null;
    this.deps.emitEnd(classCode, state);
    // Don't cleanup() — keep state around briefly so reconnecting students
    // can see the final result.  server.ts can call cleanup() on END_PAYLOAD
    // or session timeout.
  }
}

function alivePlayers(state: DreidelState): DreidelPlayer[] {
  return Object.values(state.players).filter((p) => !p.eliminated);
}

function sampleWordForLetter(
  letter: string,
  used: Set<string> | undefined,
  topic: string | undefined,
): string | null {
  const pool = topic ? Array.from(TOPIC_WORDS[topic] ?? []) : null;
  if (pool) {
    for (const w of pool) {
      if (w.startsWith(letter) && !(used?.has(w))) return w;
    }
    return null;
  }
  // Random scan through dictionary for a word starting with letter.
  const all = Array.from(DICTIONARY);
  for (let i = 0; i < 50; i++) {
    const candidate = all[randomInt(all.length)];
    if (candidate.startsWith(letter) && !(used?.has(candidate))) return candidate;
  }
  return null;
}
