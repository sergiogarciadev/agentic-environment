// Exposing a shared button component from app1 remote microfrontend
export const mountButton = (container) => {
  if (!container) return;

  const btn = document.createElement("button");
  btn.style.background = "linear-gradient(135deg, #ec4899 0%, #d946ef 100%)";
  btn.style.border = "none";
  btn.style.padding = "0.75rem 1.5rem";
  btn.style.borderRadius = "8px";
  btn.style.color = "#fff";
  btn.style.fontWeight = "600";
  btn.style.fontSize = "0.9rem";
  btn.style.cursor = "pointer";
  btn.style.boxShadow = "0 4px 14px 0 rgba(236, 72, 153, 0.3)";
  btn.style.transition = "transform 0.2s, box-shadow 0.2s, filter 0.2s";
  btn.style.fontFamily = "'Inter', sans-serif";

  let remoteCount = 0;
  btn.textContent = `Remote Tap: ${remoteCount}`;

  btn.addEventListener("click", () => {
    remoteCount++;
    btn.textContent = `Remote Tap: ${remoteCount}`;
    btn.style.transform = "scale(0.95)";
    btn.style.boxShadow = "0 2px 6px 0 rgba(236, 72, 153, 0.3)";
    setTimeout(() => {
      btn.style.transform = "none";
      btn.style.boxShadow = "0 4px 14px 0 rgba(236, 72, 153, 0.3)";
    }, 100);
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.filter = "brightness(1.1)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.filter = "none";
  });

  container.innerHTML = "";
  container.appendChild(btn);
};
