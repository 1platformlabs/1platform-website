export {};
/** Local illustrative conversation. No network requests or real appointments. */
let active: HTMLElement | null = null;
let cleanup: (() => void) | undefined;

function initSocialAgent() {
  const root = document.querySelector<HTMLElement>('[data-social-demo]');
  if (!root || root === active) return;
  cleanup?.();
  active = root;
  const controller = new AbortController();
  const {signal} = controller;
  const messages = [...root.querySelectorAll<HTMLElement>('[data-message-phase]')];
  const chat = root.querySelector<HTMLElement>('.social-conversation');
  const typing = root.querySelector<HTMLElement>('[data-social-typing]');
  const presence = root.querySelector<HTMLElement>('[data-social-presence]');
  const status = root.querySelector<HTMLElement>('[data-social-status]');
  const button = root.querySelector<HTMLButtonElement>('[data-social-pause]');
  if (!chat || !typing || !presence || !status || !button || !messages.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0;
  let last = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let visible = false;
  let hovered = false;
  let focused = false;
  let manual = false;
  let lastFrame = '';
  const paused = () => manual || hovered || focused || !visible || document.hidden || motion.matches;
  const render = () => {
    const phase = motion.matches ? messages.length - 1 : Math.min(messages.length - 1, Math.floor(elapsed / 2000));
    const isTyping = !motion.matches && phase < messages.length - 1 && messages[phase + 1].classList.contains('social-message--agent') && elapsed % 2000 >= 900;
    const frame = `${phase}:${isTyping}`;
    root.dataset.phase = String(phase);
    root.classList.toggle('is-paused', paused());
    messages.forEach((message, index) => message.classList.toggle('is-shown', index <= phase));
    typing.hidden = !isTyping;
    presence.textContent = (isTyping ? root.dataset.typing : root.dataset.presence) ?? '';
    status.textContent = (motion.matches ? root.dataset.static : paused() ? root.dataset.pausedLabel : root.dataset.hint) ?? '';
    button.textContent = (motion.matches ? root.dataset.noAnimation : manual ? root.dataset.resume : root.dataset.pauseLabel) ?? '';
    button.disabled = motion.matches;
    button.setAttribute('aria-pressed', String(manual));
    if (frame !== lastFrame && !motion.matches) chat.scrollTo({top: phase === 0 && !isTyping ? 0 : chat.scrollHeight, behavior: 'auto'});
    lastFrame = frame;
  };
  const tick = () => {
    timer = undefined;
    const now = performance.now();
    if (!paused()) elapsed = (elapsed + now - last) % (messages.length * 2000 + 4000);
    last = now;
    render();
    if (!paused()) timer = setTimeout(tick, 100);
  };
  const sync = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    last = performance.now();
    render();
    if (!paused()) timer = setTimeout(tick, 100);
  };
  button.hidden = false;
  root.classList.add('is-enhanced');
  root.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { hovered = true; sync(); } }, {signal});
  root.addEventListener('pointerleave', () => { hovered = false; sync(); }, {signal});
  root.addEventListener('focusin', (event) => { focused = event.target !== button; sync(); }, {signal});
  root.addEventListener('focusout', (event) => { focused = event.relatedTarget instanceof Node && root.contains(event.relatedTarget) && event.relatedTarget !== button; sync(); }, {signal});
  chat.addEventListener('touchstart', () => { manual = true; sync(); }, {signal, passive: true});
  button.addEventListener('click', () => { manual = !manual; sync(); }, {signal});
  document.addEventListener('visibilitychange', sync, {signal});
  motion.addEventListener('change', sync, {signal});
  const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting === true; sync(); }, {threshold: 0.15});
  observer.observe(root);
  sync();
  cleanup = () => {
    controller.abort();
    observer.disconnect();
    if (timer) clearTimeout(timer);
    active = null;
  };
}
initSocialAgent();
document.addEventListener('astro:page-load', initSocialAgent);
document.addEventListener('astro:before-swap', () => cleanup?.());
