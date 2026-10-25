document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("render-time");
  if (el) el.textContent = new Date().toISOString();
});
