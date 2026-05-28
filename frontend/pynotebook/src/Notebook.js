// Dynamic dynamic Monaco Editor and Pyodide WASM Runtime Loader
console.log("🐍 PyNotebook Microfrontend remote active");

let pyodideInstance = null;
let pyodideInitPromise = null;
let monacoPromise = null;

// Dynamic Monaco Editor loader from cdnjs
const loadMonaco = () => {
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }
    const loaderScript = document.createElement("script");
    loaderScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js";
    loaderScript.onload = () => {
      window.require.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
        },
      });
      window.require(
        ["vs/editor/editor.main"],
        () => {
          resolve(window.monaco);
        },
        (err) => reject(err),
      );
    };
    loaderScript.onerror = (err) => reject(err);
    document.head.appendChild(loaderScript);
  });
  return monacoPromise;
};

// Dynamic Pyodide loader from jsDelivr
const loadPyodideScript = () => {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve(window.loadPyodide);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.js";
    script.onload = () => resolve(window.loadPyodide);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

// Orchestrate Pyodide initialization
const getPyodide = (onStatusChange) => {
  if (pyodideInitPromise) return pyodideInitPromise;
  pyodideInitPromise = (async () => {
    onStatusChange("Downloading Pyodide WebAssembly runtime...");
    const loadPyodide = await loadPyodideScript();
    onStatusChange("Initializing Pyodide virtual machine...");
    pyodideInstance = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/",
    });
    onStatusChange("Loading package manager (micropip)...");
    await pyodideInstance.loadPackage("micropip");
    onStatusChange("Loading data-science libraries (matplotlib)...");
    await pyodideInstance.loadPackage("matplotlib");
    onStatusChange("Configuring backend execution contexts...");

    // In-place Matplotlib AGG backend initialization
    await pyodideInstance.runPythonAsync(`
import sys
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
    `);

    onStatusChange("Python 3.12 Kernel (Wasm) Online");
    return pyodideInstance;
  })();
  return pyodideInitPromise;
};

// Expose the mount method for Module Federation consumption
export const mountNotebook = async (container) => {
  if (!container) return;

  // Render premium HTML shell container
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; font-family: 'Inter', sans-serif;">
      <!-- Dashboard header controls -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 1rem;">
        <div>
          <h2 style="margin: 0; font-size: 1.5rem; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 0.5rem;">
            <span>🐍</span> Jupyter-Wasm Python REPL
          </h2>
          <p style="margin: 0.25rem 0 0; color: #9ca3af; font-size: 0.875rem;">Run full python scripts and plot matplotlib graphics purely in-browser</p>
        </div>
        <!-- Kernel Status Badge -->
        <div id="kernel-badge" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; color: #f59e0b; font-weight: 600; transition: all 0.3s ease;">
          Kernel: Offline
        </div>
      </div>

      <!-- Toolbar -->
      <div style="display: flex; gap: 1rem; align-items: center; background: rgba(255, 255, 255, 0.02); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.04);">
        <button id="add-cell-btn" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border: none; padding: 0.5rem 1rem; border-radius: 6px; color: #fff; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.85rem;">
          <span>+</span> Add Code Cell
        </button>
        <button id="clear-all-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.5rem 1rem; border-radius: 6px; color: #f3f4f6; font-weight: 500; cursor: pointer; font-size: 0.85rem;">
          Clear All Outputs
        </button>
        <div style="flex-grow: 1;"></div>
        <span style="font-size: 0.8rem; color: #6b7280;">Runtime: Pyodide WASM</span>
      </div>

      <!-- Notebook cells mount container -->
      <div id="notebook-cells" style="display: flex; flex-direction: column; gap: 1.5rem;"></div>
    </div>
  `;

  const cellsContainer = document.getElementById("notebook-cells");
  const kernelBadge = document.getElementById("kernel-badge");
  const addCellBtn = document.getElementById("add-cell-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");

  let pyodide = null;
  let cellCount = 0;
  const monacoInstances = {};

  const updateKernelStatus = (message, status = "loading") => {
    if (!kernelBadge) return;
    kernelBadge.textContent = `Kernel: ${message}`;
    if (status === "loading") {
      kernelBadge.style.background = "rgba(245, 158, 11, 0.1)";
      kernelBadge.style.borderColor = "rgba(245, 158, 11, 0.3)";
      kernelBadge.style.color = "#f59e0b";
    } else if (status === "success") {
      kernelBadge.style.background = "rgba(16, 185, 129, 0.1)";
      kernelBadge.style.borderColor = "rgba(16, 185, 129, 0.3)";
      kernelBadge.style.color = "#34d399";
    } else {
      kernelBadge.style.background = "rgba(239, 68, 68, 0.1)";
      kernelBadge.style.borderColor = "rgba(239, 68, 68, 0.3)";
      kernelBadge.style.color = "#f87171";
    }
  };

  // Initialize Kernels and Editors proactively
  let monaco = null;
  try {
    monaco = await loadMonaco();
    updateKernelStatus("Monaco Loaded, Initializing Pyodide...");
    pyodide = await getPyodide(updateKernelStatus);
    updateKernelStatus("Python VM Ready", "success");
  } catch (err) {
    updateKernelStatus("Error loading VM", "error");
    console.error("VM initialization error:", err);
  }

  // Create a new Notebook code cell
  const createCell = (initialCode = "") => {
    cellCount++;
    const cellId = `cell-${cellCount}`;
    const cellDiv = document.createElement("div");
    cellDiv.id = cellId;
    cellDiv.style.background = "rgba(15, 23, 42, 0.6)";
    cellDiv.style.border = "1px solid rgba(255, 255, 255, 0.05)";
    cellDiv.style.borderRadius = "10px";
    cellDiv.style.padding = "1.25rem";
    cellDiv.style.display = "flex";
    cellDiv.style.flexDirection = "column";
    cellDiv.style.gap = "1rem";
    cellDiv.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.2)";

    cellDiv.innerHTML = `
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <!-- Cell number indicator -->
        <div class="cell-index" style="color: #6366f1; font-family: monospace; font-weight: 600; font-size: 0.9rem; width: 45px; padding-top: 0.5rem; text-align: right;">
          In [ ]:
        </div>

        <!-- Monaco Editor container -->
        <div style="flex-grow: 1; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; overflow: hidden; background: #1e1e1e;">
          <div id="${cellId}-editor" style="height: 140px; width: 100%;"></div>
        </div>

        <!-- Run button container -->
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <button class="run-cell-btn" style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); border: none; padding: 0.5rem 1rem; border-radius: 6px; color: #fff; font-weight: 600; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; transition: filter 0.2s;">
            ▶ Run
          </button>
          <button class="delete-cell-btn" style="background: transparent; border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.35rem 0.5rem; border-radius: 6px; color: #f87171; font-weight: 500; font-size: 0.75rem; cursor: pointer; transition: background 0.2s;">
            Delete
          </button>
        </div>
      </div>

      <!-- Cell output logs block -->
      <div class="cell-output-block" style="display: none; border-left: 3px solid #6366f1; padding-left: 1rem; margin-left: 55px; background: rgba(0, 0, 0, 0.2); border-radius: 0 6px 6px 0; padding: 1rem;">
        <div class="cell-stdout" style="font-family: monospace; font-size: 0.875rem; white-space: pre-wrap; color: #e2e8f0;"></div>
        <div class="cell-plots" style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem;"></div>
      </div>
    `;

    cellsContainer.appendChild(cellDiv);

    // Instantiate Monaco Editor inside container
    const editorDiv = document.getElementById(`${cellId}-editor`);
    if (editorDiv && monaco) {
      const editor = monaco.editor.create(editorDiv, {
        value: initialCode,
        language: "python",
        theme: "vs-dark",
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbersMinChars: 3,
        padding: { top: 8, bottom: 8 },
      });
      monacoInstances[cellId] = editor;
    }

    // Attach control element listeners
    const runBtn = cellDiv.querySelector(".run-cell-btn");
    const deleteBtn = cellDiv.querySelector(".delete-cell-btn");
    const indexDiv = cellDiv.querySelector(".cell-index");
    const outputBlock = cellDiv.querySelector(".cell-output-block");
    const stdoutDiv = cellDiv.querySelector(".cell-stdout");
    const plotsDiv = cellDiv.querySelector(".cell-plots");

    // Run cell script click event
    runBtn.addEventListener("click", async () => {
      if (!pyodide) {
        alert("Pyodide Kernel is loading, please wait...");
        return;
      }

      const code = monacoInstances[cellId].getValue().trim();
      if (!code) return;

      // Update state to running
      indexDiv.textContent = "In [*]:";
      runBtn.textContent = "⏳ ...";
      runBtn.style.pointerEvents = "none";

      // Reset cell console output
      stdoutDiv.innerHTML = "";
      plotsDiv.innerHTML = "";
      outputBlock.style.display = "none";

      try {
        // Core in-Vm execution wrapper: captures stdout, stderr, execution stack, and plots base64 strings
        const wrappedCode = `
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()

# Reset matplotlib figures to capture new ones
import matplotlib.pyplot as plt
plt.close('all')

# Execute user code
_exec_error = None
try:
    _user_code_compiled = compile(${JSON.stringify(code)}, '<string>', 'exec')
    exec(_user_code_compiled, globals())
except Exception as e:
    import traceback
    _exec_error = traceback.format_exc()

# Read stdout / stderr
_stdout_val = sys.stdout.getvalue()
_stderr_val = sys.stderr.getvalue()

# Capture any matplotlib figure generated
_base64_plots = []
try:
    figs = plt.get_fignums()
    if figs:
        for fignum in figs:
            buf = io.BytesIO()
            plt.figure(fignum).savefig(buf, format='png', bbox_inches='tight', dpi=120)
            buf.seek(0)
            _base64_plots.append(base64.b64encode(buf.read()).decode('utf-8'))
        plt.close('all')
except Exception as plot_err:
    _stderr_val += f"\\nPlot error: {plot_err}"

# Return structure
[_stdout_val, _stderr_val, _exec_error, _base64_plots]
        `;

        const pyRes = await pyodide.runPythonAsync(wrappedCode);
        const [stdout, stderr, errStack, base64Plots] = pyRes.toJs();

        let hasOutput = false;

        // Print Standard Outputs
        if (stdout && stdout.trim()) {
          stdoutDiv.innerHTML += `<div>${escapeHtml(stdout)}</div>`;
          hasOutput = true;
        }

        // Print Standard Errors
        if (stderr && stderr.trim()) {
          stdoutDiv.innerHTML += `<div style="color: #f87171;">${escapeHtml(stderr)}</div>`;
          hasOutput = true;
        }

        // Render Stack Errors
        if (errStack) {
          stdoutDiv.innerHTML += `<div style="color: #ef4444; border-top: 1px solid rgba(239, 68, 68, 0.2); padding-top: 0.5rem; margin-top: 0.5rem; white-space: pre;">${escapeHtml(errStack)}</div>`;
          hasOutput = true;
        }

        // Draw Matplotlib Rendered Plots
        if (base64Plots && base64Plots.length > 0) {
          base64Plots.forEach((b64Img) => {
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${b64Img}`;
            img.style.maxWidth = "100%";
            img.style.borderRadius = "6px";
            img.style.border = "1px solid rgba(255, 255, 255, 0.1)";
            img.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.3)";
            plotsDiv.appendChild(img);
          });
          hasOutput = true;
        }

        if (hasOutput) {
          outputBlock.style.display = "block";
        }
      } catch (err) {
        stdoutDiv.innerHTML = `<div style="color: #ef4444; font-weight: 600;">Pyodide Virtual Machine execution failure:</div><div style="color: #f87171; white-space: pre-wrap; font-size: 0.8rem; margin-top: 0.25rem;">${escapeHtml(err.message)}</div>`;
        outputBlock.style.display = "block";
      } finally {
        // Reset button states and indices
        indexDiv.textContent = `In [${cellCount}]:`;
        runBtn.textContent = "▶ Run";
        runBtn.style.pointerEvents = "auto";
      }
    });

    // Delete cell logic
    deleteBtn.addEventListener("click", () => {
      if (monacoInstances[cellId]) {
        monacoInstances[cellId].dispose();
        delete monacoInstances[cellId];
      }
      cellDiv.remove();
    });
  };

  // Add default cells on initialization
  addCellBtn.addEventListener("click", () => createCell());

  clearAllBtn.addEventListener("click", () => {
    const outputs = cellsContainer.querySelectorAll(".cell-output-block");
    outputs.forEach((out) => {
      out.style.display = "none";
      const stdout = out.querySelector(".cell-stdout");
      const plots = out.querySelector(".cell-plots");
      if (stdout) stdout.innerHTML = "";
      if (plots) plots.innerHTML = "";
    });
  });

  // Render initial code cells with rich Matplotlib and mathematical code blocks
  createCell(`import numpy as np
import matplotlib.pyplot as plt

# Generate high-frequency sine waves
t = np.linspace(0, 2*np.pi, 200)
y = np.sin(5 * t) * np.exp(-0.3 * t)

plt.figure(figsize=(7, 3.5))
plt.plot(t, y, label="Decaying Sine", color="#a855f7", linewidth=2.5)
plt.title("Wasm Matplotlib Graphics Render", color="white", fontsize=11)
plt.xlabel("Time", color="#9ca3af")
plt.ylabel("Amplitude", color="#9ca3af")
plt.grid(True, color="red")
plt.legend(facecolor="#1e293b", edgecolor="blue", labelcolor="white")
plt.tight_layout()

# Run this cell to generate and render this plot purely in your browser!
plt.show()`);

  createCell(`print("Hello, Django + Microfrontend developer!")
print("Here is some standard text outputs:")
print("2 + 2 =", 2 + 2)`);
};

// Simple HTML escaping helper to avoid layout injecting
const escapeHtml = (text) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
