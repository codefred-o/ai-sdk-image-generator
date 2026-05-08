export interface Suggestion {
  text: string;
  prompt: string;
}

// YouTube-style thumbnail templates
const youtubeTemplates: { text: string; prompt: string }[] = [
  {
    text: "I Built This in 24 Hours",
    prompt: "I Built This in 24 Hours - Time lapse of construction project with before/after split screen, shocked face expressing disbelief at speed of completion",
  },
  {
    text: "You Won't Believe What Happened",
    prompt: "You Won't Believe What Happened - Dramatic reaction shot with hands covering mouth, explosive background effects, bright yellow bold text",
  },
  {
    text: "This Changed Everything",
    prompt: "This Changed Everything - Before/after transformation comparison, person pointing dramatically at screen, arrow graphics showing progression",
  },
  {
    text: "The Secret They Don't Want You to Know",
    prompt: "The Secret They Don't Want You to Know - Conspiracy theory style with blurred documents, magnifying glass over mysterious symbols, red arrows and circles",
  },
  {
    text: "I Tried It So You Don't Have To",
    prompt: "I Tried It So You Don't Have To - Split screen showing person trying product/service vs disappointed expression, checkmark and X symbols, bold warning text",
  },
  {
    text: "This Is Not Clickbait",
    prompt: "This Is Not Clickbait - Meta humorous thumbnail with person holding 'NOT CLICKBAIT' sign, exaggerated fake shock expression, ironic bright colors",
  },
  {
    text: "The Truth About [Topic]",
    prompt: "The Truth About [Topic] - Serious investigative journalist style with notebook and pen, magnifying glass over documents, dramatic lighting",
  },
  {
    text: "What Happens When You [Action]",
    prompt: "What Happens When You [Action] - Cause and effect visualization, person performing action with exaggerated results, scientific diagram style overlays",
  },
  {
    text: "[Number] Ways to [Achieve Goal]",
    prompt: "[Number] Ways to [Achieve Goal] - List format thumbnail with numbered checklist, person demonstrating each method, trophy or achievement graphics",
  },
  {
    text: "Why [Popular Thing] Is Actually [Controversial Opinion]",
    prompt: "Why [Popular Thing] Is Actually [Controversial Opinion] - Split screen showing popular opinion vs controversial take, debate-style graphics with versus symbol",
  },
  {
    text: "I Spent [Amount] On [Thing]",
    prompt: "I Spent [Amount] On [Thing] - Wallet or piggy bank bursting with money, person holding receipt with shocked expression, luxury items flying around",
  },
  {
    text: "[Number] Days Without [Habit]",
    prompt: "[Number] Days Without [Habit] - Calendar with marked days, person showing willpower struggle, progress bar graphic, achievement badge",
  },
  {
    text: "This [Common Belief] Is Wrong",
    prompt: "This [Common Belief] Is Wrong - Person holding 'WRONG' stamp over textbook, confusion graphics, lightbulb moment with correct information",
  },
  {
    text: "The [Adjective] [Noun] Ever Made",
    prompt: "The [Adjective] [Noun] Ever Made - Trophy or award graphic, person holding exceptional item with pride, sparkling effects and rays",
  },
  {
    text: "[Person/Character] Reacts To [Topic]",
    prompt: "[Person/Character] Reacts To [Topic] - Split screen showing reaction face and topic content, expressive emotions with speech bubbles, trending graphics",
  },
];

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomSuggestions(count: number = 5): Suggestion[] {
  const shuffled = shuffle(youtubeTemplates);
  return shuffled.slice(0, count).map((item) => ({
    text: item.text,
    prompt: item.prompt,
  }));
}