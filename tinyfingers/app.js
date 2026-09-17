const animals = [
  ["🐶", "Puppy", "Woof! A new friend came to play."], ["🐱", "Kitty", "Meow! Soft paws on the keyboard."],
  ["🐸", "Frog", "Ribbit! Splish, splash, hooray!"], ["🦊", "Fox", "Yip! A clever friend is here."],
  ["🐼", "Panda", "Munch, munch! Bamboo break!"], ["🐯", "Tiger", "Roar! Stripey and proud."],
  ["🦁", "Lion", "Roar! The jungle says hello."], ["🐨", "Koala", "Snuggle time in the gum tree."],
  ["🐵", "Monkey", "Oo oo ah ah! Let's swing!"], ["🐷", "Piglet", "Oink! Mud puddles are fun."],
  ["🐰", "Bunny", "Boing! Bouncy ears say hi."], ["🦄", "Unicorn", "Sparkle power! Magical hello."],
  ["🐙", "Octopus", "Eight wiggly arms wave back."], ["🦋", "Butterfly", "Flutter flutter, pretty wings!"],
  ["🐋", "Whale", "Whoooosh! A gentle giant swims by."], ["🦈", "Shark", "Swish! A speedy sea friend."],
  ["🐬", "Dolphin", "Click click! Let's splash together."], ["🦭", "Seal", "Clap clap! A playful sea pup."],
  ["🦀", "Crab", "Scuttle scuttle, sideways hello!"], ["🪼", "Jellyfish", "Wiggle wiggle through the sea."],
  ["🐧", "Penguin", "Waddle waddle, chilly friend."], ["🦖", "Dino", "Stomp stomp! A tiny dinosaur!"],
  ["🐝", "Bee", "Bzz bzz! Busy little bee."], ["🦜", "Parrot", "Squawk! Colorful feathers."],
  ["🐢", "Turtle", "Slow and steady says hello."], ["🦥", "Sloth", "Helloooo... nice and slow."],
];
const score = document.querySelector("#score");
const animalEl = document.querySelector("#animal");
const nameEl = document.querySelector("#animalName");
const lineEl = document.querySelector("#animalLine");
let count = 0, muted = true, audio;
const playground = document.querySelector(".playground");
let fullscreenRequesting = false;

function sound() { if (muted) return; const Ctx = window.AudioContext || window.webkitAudioContext; audio ??= new Ctx(); const o = audio.createOscillator(), g = audio.createGain(); o.type = "sine"; o.frequency.value = 280 + Math.random() * 330; g.gain.setValueAtTime(.055, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .18); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .19); }
function popAnimal(emoji) { const pop = document.createElement("span"); pop.className = "animal-pop"; pop.textContent = emoji; pop.style.left = `${8 + Math.random() * 82}%`; pop.style.top = `${13 + Math.random() * 68}%`; pop.style.animationDelay = `${Math.random() * .08}s`; playground.append(pop); setTimeout(() => pop.remove(), 2700); }
function celebrate(key, button) { const item = animals[(key.codePointAt(0) + count * 3) % animals.length]; count++; score.textContent = count; animalEl.textContent = item[0]; nameEl.textContent = `${item[1]} says hi!`; lineEl.textContent = item[2]; animalEl.style.animation = "none"; requestAnimationFrame(() => animalEl.style.animation = "hello .55s cubic-bezier(.2,1.4,.55,1) both"); popAnimal(item[0]); button?.classList.add("pressed"); setTimeout(() => button?.classList.remove("pressed"), 120); sound(); }
document.addEventListener("keydown", e => { if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return; startFullscreen(); e.preventDefault(); const label = e.key.length === 1 ? e.key.toUpperCase() : e.key === " " ? "🐾" : "★"; celebrate(label); });
function startFullscreen() { if (fullscreenRequesting || document.fullscreenElement) return; fullscreenRequesting = true; document.documentElement.requestFullscreen().catch(() => {}).finally(() => { fullscreenRequesting = false; }); }
playground.addEventListener("pointerdown", startFullscreen, { capture: true });
playground.addEventListener("pointerdown", e => { if (e.target.closest("button, a")) return; celebrate("🐾"); });
document.addEventListener("dblclick", e => e.preventDefault());
document.querySelector("#sound").addEventListener("click", e => { muted = !muted; e.currentTarget.setAttribute("aria-pressed", String(!muted)); e.currentTarget.innerHTML = muted ? "<span>🔈</span> sound off" : "<span>🔊</span> sound on"; if (!muted) sound(); });
document.querySelector("#fullscreen").addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : startFullscreen());
document.querySelector(".brand").addEventListener("click", e => { e.preventDefault(); count = 0; score.textContent = 0; celebrate("A"); });
