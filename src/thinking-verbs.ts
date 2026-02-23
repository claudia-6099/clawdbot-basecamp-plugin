/**
 * Random "thinking" indicator verbs for Basecamp.
 * Instead of always showing "🧠 Thinking...", pick a random fun verb.
 */

const THINKING_VERBS: ReadonlyArray<[string, string]> = [
  // Chemistry
  ['🧪', 'Titrating'],
  ['⚗️', 'Catalyzing'],
  ['🔗', 'Polymerizing'],
  ['🔥', 'Oxidizing'],
  ['⬇️', 'Reducing'],
  ['🪙', 'Electroplating'],
  ['⚖️', 'Buffering'],

  // Biology
  ['🧬', 'Mutating'],
  ['🦎', 'Natural-selecting'],
  ['🧬', 'DNA-sequencing'],
  ['✂️', 'Gene-editing'],
  ['🌿', 'Speciating'],
  ['🦋', 'Adapting'],
  ['🧬', 'CRISPR-editing'],
  ['🔬', 'Meiosis-ing'],
  ['🧩', 'Recombining'],

  // Math
  ['📐', 'Deriving'],
  ['∫', 'Integrating'],
  ['🔢', 'Factorizing'],
  ['λ', 'Eigenvaluing'],
  ['🌀', 'Fractaling'],
  ['〰️', 'Fourier-transforming'],
  ['🔲', 'Matrix-multiplying'],
  ['➡️', 'Vectorizing'],
  ['🕸️', 'Graph-traversing'],
  ['📉', 'Differentiating'],

  // Geology
  ['🌍', 'Tectonicing'],
  ['🏜️', 'Eroding'],
  ['🦴', 'Fossilizing'],
  ['⬇️', 'Subducting'],
  ['📚', 'Stratifying'],
  ['🪨', 'Sedimenting'],
  ['💥', 'Faulting'],
  ['🌋', 'Quaking'],

  // Retro/Fun
  ['🎹', 'Synthwaving'],
  ['🛼', 'Rollerblading'],

  // Detective
  ['🔍', 'Sleuthing'],
  ['🔎', 'Magnifying'],
  ['🕵️', 'Whodunit-ing'],
  ['🧩', 'Case-cracking'],
  ['👀', 'Stakeout-ing'],
  ['🔗', 'Clue-connecting'],
  ['💡', 'Interrogating'],
  ['🌑', 'Shadow-tailing'],
  ['😱', 'Plot-twisting'],

  // Spy
  ['🥷', 'Infiltrating'],
  ['🔓', 'Code-breaking'],
  ['🛠️', 'Gadgeteering'],
  ['📦', 'Dead-dropping'],
  ['🎧', 'Wiretapping'],
  ['🔐', 'Safecracking'],
  ['🕶️', 'Double-agenting'],
  ['📤', 'Exfiltrating'],
  ['🎭', 'Disguise-donning'],
  ['🎞️', 'Microfilm-swapping'],
  ['💣', 'Bomb-defusing'],

  // Coffee
  ['☕', 'Espresso-pulling'],
  ['🎨', 'Latte-arting'],
  ['🫖', 'French-pressing'],
  ['⚙️', 'Bean-grinding'],
  ['💧', 'Pour-overing'],
  ['🥛', 'Milk-steaming'],
  ['🧊', 'Cold-brewing'],
  ['🔽', 'Aeropressing'],
  ['☕', 'Cupping'],
  ['👊', 'Shot-tamping'],
  ['⚖️', 'Dose-weighing'],

  // Wine
  ['🍷', 'Decanting'],
  ['🪵', 'Corking'],
  ['🌬️', 'Aerating'],
  ['📅', 'Vintage-selecting'],
  ['👃', 'Bouquet-sniffing'],
  ['📷', 'Aperturing'],
  ['🍇', 'Tannin-softening'],
  ['🏔️', 'Terroir-tasting'],
  ['🍾', 'Uncorking'],

  // Quantum
  ['🔮', 'Entangling'],
  ['⚛️', 'Superpositing'],
  ['💫', 'Collapsing'],
  ['🕳️', 'Tunneling'],
  ['🐱', 'Schrödinger-catting'],
  ['🔄', 'Qubit-flipping'],
  ['🌊', 'Decohering'],
  ['📊', 'Wavefunctioning'],
  ['❓', 'Uncertainty-principling'],
  ['✨', 'Vacuum-fluctuating'],
  ['🔃', 'Spin-flipping'],

  // Sound effects
  ['⚡', 'Zapping'],
  ['💨', 'Swooshing'],
  ['🖱️', 'Clicking'],
  ['💦', 'Splatting'],
  ['🏀', 'Boinging'],
  ['🫧', 'Fizzing'],
  ['🐝', 'Buzzing'],
  ['🤖', 'Bleeping'],
  ['🔧', 'Clunking'],
  ['🪵', 'Thunking'],
  ['💥', 'Ka-powing'],
  ['🌊', 'Gurgling'],

  // Sci-fi travel
  ['🌀', 'Teleporting'],
  ['🕳️', 'Wormholing'],
  ['🚀', 'Hyperdriving'],
  ['💡', 'Lightspeeding'],
  ['⚡', 'Quantumleaping'],
  ['🗺️', 'Astrogating'],
  ['🌍', 'Planetforming'],
  ['🤖', 'Nanoswarming'],
  ['🌌', 'Warp-driving'],
  ['⚔️', 'Lightsabering'],
  ['👻', 'Phasing'],
  ['🔀', 'Hypershifting'],

  // Whimsical
  ['😄', 'Giggling'],
  ['💭', 'Daydreaming'],
  ['🦄', 'Whimsying'],
  ['✨', 'Twinkling'],
  ['🏐', 'Bouncing'],
  ['🦘', 'Hopscotching'],
  ['🎵', 'Whistling'],
  ['🎻', 'Fiddlesticking'],
  ['🗣️', 'Gibbering'],
  ['🌬️', 'Whiffling'],
  ['🐝', 'Bumbling'],
  ['😍', 'Swooning'],
  ['🌟', 'Glimmering'],
  ['💎', 'Sparkling'],
  ['🃏', 'Jesting'],
  ['🔩', 'Doodad-ing'],
  ['🌠', 'Stargazing'],
  ['🦖', 'Galumphing'],
  ['🎩', 'Bamboozling'],
  ['🪩', 'Discoballing'],
];

/**
 * Returns a random thinking indicator string like "<em>🧬 Mutating...</em>"
 */
export function getRandomThinkingIndicator(): string {
  const idx = Math.floor(Math.random() * THINKING_VERBS.length);
  const [emoji, verb] = THINKING_VERBS[idx];
  return `<em>${emoji} ${verb}...</em>`;
}
