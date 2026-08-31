document.querySelector(".menu-toggle")?.addEventListener("click", () => {
  document.querySelector(".nav")?.classList.toggle("is-open");
  document.querySelector(".header-cta")?.classList.toggle("is-open");
});

const slider = document.querySelector("[data-slider]");
if (slider) {
  const track = slider.querySelector(".hero-slider-track");
  const slides = [...track.children];
  const dotsWrap = slider.querySelector(".slider-dots");
  const total = slides.length;
  let index = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `第 ${i + 1} 张`);
    dot.addEventListener("click", () => go(i, true));
    dotsWrap.append(dot);
  });

  const dots = [...dotsWrap.children];

  const render = () => {
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };

  const go = (next, reset) => {
    index = (next + total) % total;
    render();
    if (reset) play();
  };

  const play = () => {
    clearInterval(timer);
    timer = setInterval(() => go(index + 1), 4000);
  };

  slider.querySelector(".is-prev")?.addEventListener("click", () => go(index - 1, true));
  slider.querySelector(".is-next")?.addEventListener("click", () => go(index + 1, true));
  slider.addEventListener("mouseenter", () => clearInterval(timer));
  slider.addEventListener("mouseleave", play);

  let startX = 0;
  slider.addEventListener("touchstart", (e) => {
    startX = e.changedTouches[0].clientX;
    clearInterval(timer);
  }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1), true);
    else play();
  });

  render();
  play();
}
