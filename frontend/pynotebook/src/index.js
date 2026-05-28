import { mountNotebook } from "./Notebook.js";

console.log("⚡ PyNotebook Standalone Preview is active");

// Style page background
document.body.style.margin = "0";
document.body.style.background = "#0b0f19";
document.body.style.color = "#f3f4f6";

const appDiv = document.createElement("div");
appDiv.id = "app";
appDiv.style.fontFamily = "'Inter', sans-serif";
appDiv.style.padding = "2rem";
appDiv.style.minHeight = "100vh";
appDiv.style.boxSizing = "border-box";
appDiv.style.display = "flex";
appDiv.style.flexDirection = "column";
appDiv.style.alignItems = "center";
appDiv.style.justifyContent = "center";

appDiv.innerHTML = `
  <div id="notebook-container" style="width: 100%; max-width: 1000px; background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.7);">
  </div>
`;

document.body.appendChild(appDiv);
const notebookContainer = document.getElementById("notebook-container");
mountNotebook(notebookContainer);
