function initializeNavigation() {
  const sections = document.querySelectorAll(".page");
  let currentSectionIndex = 0;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = Array.from(sections).indexOf(entry.target);
        if (index !== currentSectionIndex) {
          currentSectionIndex = index;
          console.log('Current section:', currentSectionIndex);
        }
      }
    });
  }, {
    root: null,
    threshold: 0.5,
  });

  sections.forEach((section) => observer.observe(section));

  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowUp":
        if (currentSectionIndex > 0) {
          setTimeout(() => {
            sections[currentSectionIndex - 1]
              .scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
        break;
      case "ArrowDown":
        if (currentSectionIndex < sections.length - 1) {
          setTimeout(() => {
            sections[currentSectionIndex + 1]
              .scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
        break;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeNavigation);
} else {
  initializeNavigation();
}