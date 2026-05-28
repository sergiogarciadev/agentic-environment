import { mountButton } from "./Button.js";

console.log("⚡ App1 Remote Instance is active");

const appDiv = document.createElement("div");
appDiv.id = "app";
appDiv.style.fontFamily = "'Inter', sans-serif";
appDiv.style.background = "#0b0f19";
appDiv.style.color = "#f3f4f6";
appDiv.style.padding = "2rem";
appDiv.style.minHeight = "100vh";
appDiv.style.display = "flex";
appDiv.style.flexDirection = "column";
appDiv.style.alignItems = "center";
appDiv.style.justifyContent = "center";

appDiv.innerHTML = `
  <h1 style="font-family: 'Outfit', sans-serif; margin-bottom: 0.5rem; font-size: 2rem;">App1 Standalone Preview</h1>
  <p style="color: #9ca3af; margin-bottom: 2rem; font-size: 0.95rem;">Exposing shared components to the federated shell</p>
  <div id="btn-container" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 2rem; border-radius: 12px;"></div>
`;

document.body.appendChild(appDiv);
const btnContainer = document.getElementById("btn-container");
mountButton(btnContainer);
