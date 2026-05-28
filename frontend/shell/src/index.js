// Bootstrapping the Microfrontend Shell Host
console.log("⚡ Microfrontend Shell Host is active");

const mountApp = async () => {
  const container = document.getElementById("app");
  if (!container) return;

  // Clear loading spinner
  container.innerHTML = "";

  // Render Shell Dashboard
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 1rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.5rem; font-family: 'Outfit', sans-serif;">Workspace Control Center</h2>
          <p style="margin: 0.25rem 0 0; color: #9ca3af; font-size: 0.875rem;">Orchestrating microservices and frontend fragments</p>
        </div>
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; color: #34d399; font-weight: 600;">
          Django Connected
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Local Fragment Section -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 1.5rem;">
          <h3 style="margin-top: 0; font-family: 'Outfit', sans-serif; font-size: 1.15rem; color: #a5b4fc;">Local Shell Instance</h3>
          <p style="color: #9ca3af; font-size: 0.85rem; line-height: 1.5;">This section is rendered directly by the Host Shell. It holds local application state.</p>
          <div style="margin-top: 1.5rem;">
            <button id="local-counter" style="background: #6366f1; border: none; padding: 0.5rem 1rem; border-radius: 6px; color: #fff; font-weight: 500; cursor: pointer; transition: background 0.2s;">
              Count: 0
            </button>
          </div>
        </div>

        <!-- Remote Fragment Section -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column;">
          <h3 style="margin-top: 0; font-family: 'Outfit', sans-serif; font-size: 1.15rem; color: #f472b6;">Remote Component (app1)</h3>
          <p style="color: #9ca3af; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">This component is loaded dynamically at runtime via Module Federation from app1.</p>
          <div id="remote-container" style="flex-grow: 1; display: flex; align-items: center; justify-content: center;">
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem 1rem; border-radius: 6px; text-align: center; max-width: 250px;">
              <p style="margin: 0; font-size: 0.8rem; color: #f87171; font-weight: 600;">Remote component offline</p>
              <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: #fca5a5;">Start frontend/app1 to federate assets dynamically</p>
            </div>
          </div>
        </div>
      </div>

      <!-- PyNotebook Section -->
      <div id="notebook-shell-container" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 2rem; display: flex; flex-direction: column; gap: 1rem;">
        <div id="notebook-mount">
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 1rem 1.5rem; border-radius: 8px; text-align: center; max-width: 400px; margin: 0 auto;">
            <p style="margin: 0; font-size: 0.85rem; color: #f87171; font-weight: 600;">Interactive Wasm Notebook offline</p>
            <p style="margin: 0.25rem 0 0; font-size: 0.75rem; color: #fca5a5;">Start frontend/pynotebook workspace to activate local REPL</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Local state counter handler
  let count = 0;
  const localBtn = document.getElementById("local-counter");
  if (localBtn) {
    localBtn.addEventListener("click", () => {
      count++;
      localBtn.textContent = `Count: ${count}`;
      localBtn.style.transform = "scale(0.97)";
      setTimeout(() => {
        localBtn.style.transform = "none";
      }, 100);
    });
    // Add simple hover effect
    localBtn.addEventListener("mouseenter", () => {
      localBtn.style.background = "#4f46e5";
    });
    localBtn.addEventListener("mouseleave", () => {
      localBtn.style.background = "#6366f1";
    });
  }

  // Attempt to load the remote Button module dynamically
  try {
    const remoteModule = await import("app1/Button");
    if (remoteModule && remoteModule.default) {
      const remoteButton = remoteModule.default;
      const remoteContainer = document.getElementById("remote-container");
      if (remoteContainer) {
        remoteContainer.innerHTML = "";
        remoteButton.mountButton(remoteContainer);
      }
    }
  } catch (error) {
    console.warn(
      '⚠️ Could not mount remote component "app1/Button":',
      error.message,
    );
  }

  // Attempt to load the remote Notebook module dynamically
  try {
    const notebookModule = await import("pynotebook/Notebook");
    if (notebookModule && notebookModule.default) {
      const remoteNotebook = notebookModule.default;
      const notebookMount = document.getElementById("notebook-mount");
      if (notebookMount) {
        notebookMount.innerHTML = "";
        remoteNotebook.mountNotebook(notebookMount);
      }
    }
  } catch (error) {
    console.warn(
      '⚠️ Could not mount remote component "pynotebook/Notebook":',
      error.message,
    );
  }
};

mountApp();
