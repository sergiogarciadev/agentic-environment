import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./notebook-cell";
import { CellOutputData } from "./notebook-cell";

interface CellData {
  id?: number;
  code: string;
  order: number;
  outputs: CellOutputData[];
  isRunning?: boolean;
}

@customElement("notebook-editor")
export class NotebookEditor extends LitElement {
  @property({ type: Number, attribute: "notebook-id" }) notebookId!: number;

  @state() private name = "";
  @state() private cells: CellData[] = [];
  @state() private pyodideLoaded = false;
  @state() private pyodideLoadingProgress = "";
  @state() private kernelStatus: "idle" | "busy" | "loading" = "loading";
  @state() private isSaving = false;
  @state() private hasUnsavedChanges = false;

  private pyodide: any = null;

  createRenderRoot() {
    return this; // Render in the Light DOM for seamless global bootstrap styles and modal overlays
  }

  async firstUpdated() {
    await this.fetchNotebook();
    await this.initPyodide();
  }

  private async fetchNotebook() {
    try {
      const response = await fetch(`/api/notebooks/${this.notebookId}/`);
      const data = await response.json();
      this.name = data.name;
      this.cells = data.cells.map((cell: any) => ({
        id: cell.id,
        code: cell.code,
        order: cell.order,
        outputs: cell.outputs || [],
        isRunning: false,
      }));
    } catch (err) {
      console.error("Failed to load notebook data:", err);
    }
  }

  private async initPyodide() {
    this.pyodideLoadingProgress = "Loading Pyodide Wasm Runtime...";
    try {
      // Check if global loadPyodide is available (loaded in notebook_detail.html from CDN)
      if (typeof window !== "undefined" && (window as any).loadPyodide) {
        this.pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/",
        });

        this.pyodideLoaded = true;
        this.kernelStatus = "idle";
        this.pyodideLoadingProgress = "";
      } else {
        throw new Error("Pyodide CDN script load failed or is not ready.");
      }
    } catch (err: any) {
      console.error("Failed to boot Pyodide:", err);
      this.pyodideLoadingProgress = "Failed to launch Wasm kernel: " + err.message;
    }
  }

  private async handleCellRun(e: CustomEvent) {
    const index = e.detail.index;
    const cell = this.cells[index];
    if (!this.pyodideLoaded || cell.isRunning) return;

    this.kernelStatus = "busy";
    cell.isRunning = true;
    cell.outputs = [];
    this.requestUpdate();

    // 1. Check for packages to load (numpy, matplotlib)
    const code = cell.code;
    const packagesToLoad: string[] = [];
    if (code.includes("import numpy") || code.includes("from numpy")) {
      packagesToLoad.push("numpy");
    }
    if (code.includes("import matplotlib") || code.includes("from matplotlib")) {
      packagesToLoad.push("matplotlib");
    }

    if (packagesToLoad.length > 0) {
      this.pyodideLoadingProgress = `Installing dynamic Wasm packages: ${packagesToLoad.join(", ")}...`;
      try {
        await this.pyodide.loadPackage(packagesToLoad);
      } catch (err: any) {
        cell.outputs.push({
          type: "text",
          content: `Kernel Error: Failed to load packages: ${err.message}\n`,
        });
      }
      this.pyodideLoadingProgress = "";
    }

    // 2. Set up stdout capture
    let stdoutBuffer = "";
    this.pyodide.setStdout({
      batched: (text: string) => {
        stdoutBuffer += text + "\n";
      },
    });
    this.pyodide.setStderr({
      batched: (text: string) => {
        stdoutBuffer += text + "\n";
      },
    });

    // 3. Matplotlib Interception Setup
    if (packagesToLoad.includes("matplotlib")) {
      try {
        await this.pyodide.runPythonAsync(`
import sys
import io
import base64
try:
    import matplotlib
    matplotlib.use('Agg') # Render figures to memory
    import matplotlib.pyplot as plt
    
    def _custom_show():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        print(f"__PLOT_IMAGE__:{img_str}")
        plt.close()
        
    plt.show = _custom_show
except Exception as e:
    print(f"Error patching matplotlib: {e}")
`);
      } catch (err) {
        console.error("Failed to patch Matplotlib in Pyodide environment:", err);
      }
    }

    // 4. Execute python code
    try {
      await this.pyodide.runPythonAsync(code);
    } catch (err: any) {
      stdoutBuffer += `\nTraceback (most recent call last):\n${err.message}\n`;
    }

    // 5. Parse stdout for plotting image markers
    const outputsList: CellOutputData[] = [];
    const lines = stdoutBuffer.split("\n");
    let normalStdout = "";

    for (const line of lines) {
      if (line.startsWith("__PLOT_IMAGE__:")) {
        // Output any accumulated stdout text before showing the plot
        if (normalStdout.trim()) {
          outputsList.push({ type: "text", content: normalStdout });
          normalStdout = "";
        }
        const base64Img = line.substring("__PLOT_IMAGE__:".length);
        outputsList.push({ type: "image", content: base64Img });
      } else {
        normalStdout += line + "\n";
      }
    }

    if (normalStdout.trim() || outputsList.length === 0) {
      outputsList.push({
        type: "text",
        content: normalStdout || "Executed successfully (no output)",
      });
    }

    // Clean up empty lines or formatting
    cell.outputs = outputsList;
    cell.isRunning = false;
    this.kernelStatus = "idle";
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  private handleCellCodeUpdate(e: CustomEvent) {
    const { index, code } = e.detail;
    this.cells[index].code = code;
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  private addCell() {
    const newCell: CellData = {
      code: "# Write Python code here\n",
      order: this.cells.length,
      outputs: [],
      isRunning: false,
    };
    this.cells = [...this.cells, newCell];
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  private handleCellDelete(e: CustomEvent) {
    const index = e.detail.index;
    this.cells = this.cells.filter((_, i) => i !== index);
    // Reorder indices
    this.cells.forEach((cell, i) => {
      cell.order = i;
    });
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  private handleCellMoveUp(e: CustomEvent) {
    const index = e.detail.index;
    if (index === 0) return; // Already first cell

    const temp = this.cells[index - 1];
    this.cells[index - 1] = this.cells[index];
    this.cells[index] = temp;

    // Reset order
    this.cells.forEach((cell, i) => {
      cell.order = i;
    });

    this.cells = [...this.cells];
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  private handleCellMoveDown(e: CustomEvent) {
    const index = e.detail.index;
    if (index === this.cells.length - 1) return; // Already last cell

    const temp = this.cells[index + 1];
    this.cells[index + 1] = this.cells[index];
    this.cells[index] = temp;

    // Reset order
    this.cells.forEach((cell, i) => {
      cell.order = i;
    });

    this.cells = [...this.cells];
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  private async saveNotebook() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.requestUpdate();

    try {
      const response = await fetch(`/api/notebooks/${this.notebookId}/save/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.name,
          cells: this.cells.map((cell) => ({
            code: cell.code,
            order: cell.order,
            outputs: cell.outputs,
          })),
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        this.hasUnsavedChanges = false;
      } else {
        alert("Error saving notebook: " + result.error);
      }
    } catch (err: any) {
      alert("Network error saving notebook: " + err.message);
    } finally {
      this.isSaving = false;
      this.requestUpdate();
    }
  }

  private async runAllCells() {
    for (let i = 0; i < this.cells.length; i++) {
      await this.handleCellRun(new CustomEvent("cell-run", { detail: { index: i } }));
    }
  }

  private handleTitleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.name = target.value;
    this.hasUnsavedChanges = true;
    this.requestUpdate();
  }

  render() {
    return html`
      <!-- Workspace Header -->
      <div
        class="workspace-header"
        style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2.5rem;
        flex-wrap: wrap;
        gap: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 1.5rem;
      "
      >
        <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
          <input
            type="text"
            .value="${this.name}"
            @input="${this.handleTitleChange}"
            style="
              background: transparent;
              border: none;
              color: var(--text-main);
              font-size: 2.2rem;
              font-weight: 800;
              font-family: 'Outfit', sans-serif;
              border-bottom: 2px dashed transparent;
              width: 100%;
              max-width: 500px;
              transition: all 0.2s ease;
            "
            @focus="${(e: any) => (e.target.style.borderColor = "var(--primary)")}"
            @blur="${(e: any) => (e.target.style.borderColor = "transparent")}"
          />
          ${this.hasUnsavedChanges
            ? html`
                <span
                  class="unsaved-badge"
                  style="
              font-size: 0.8rem;
              background: rgba(244, 63, 94, 0.15);
              border: 1px solid rgba(244, 63, 94, 0.3);
              color: #f87171;
              padding: 0.2rem 0.5rem;
              border-radius: 6px;
              font-weight: 600;
            "
                  >Unsaved changes</span
                >
              `
            : html`
                <span
                  class="saved-badge"
                  style="
              font-size: 0.8rem;
              background: rgba(16, 185, 129, 0.15);
              border: 1px solid rgba(16, 185, 129, 0.3);
              color: var(--secondary);
              padding: 0.2rem 0.5rem;
              border-radius: 6px;
              font-weight: 600;
            "
                  >Saved</span
                >
              `}
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
          <!-- Kernel status indicator -->
          <div
            style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            color: var(--text-muted);
          "
          >
            <span
              class="status-indicator"
              style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              display: inline-block;
              background-color: ${this.kernelStatus === "loading"
                ? "#f59e0b"
                : this.kernelStatus === "busy"
                  ? "#ef4444"
                  : "#10b981"};
              box-shadow: 0 0 10px ${this.kernelStatus === "loading"
                ? "rgba(245,158,11,0.5)"
                : this.kernelStatus === "busy"
                  ? "rgba(239,68,68,0.5)"
                  : "rgba(16,185,129,0.5)"};
            "
            ></span>
            <span style="font-weight: 600; color: #fff;">
              Kernel:
              ${this.kernelStatus === "loading"
                ? "Loading WASM..."
                : this.kernelStatus === "busy"
                  ? "Busy"
                  : "Idle"}
            </span>
          </div>

          <button
            @click="${this.runAllCells}"
            class="btn"
            ?disabled="${!this.pyodideLoaded || this.kernelStatus === "busy"}"
            style="
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            padding: 0.6rem 1.2rem;
            font-size: 0.95rem;
            box-shadow: none;
          "
          >
            Run All
          </button>

          <button
            @click="${this.saveNotebook}"
            class="btn"
            ?disabled="${this.isSaving}"
            style="
            padding: 0.6rem 1.2rem;
            font-size: 0.95rem;
          "
          >
            ${this.isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <!-- Loader for Wasm Kernel packages -->
      ${this.pyodideLoadingProgress
        ? html`
            <div
              class="loader-banner"
              style="
          background: rgba(139, 92, 246, 0.1);
          border: 1px dashed rgba(139, 92, 246, 0.4);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          color: var(--primary-hover);
          font-weight: 500;
        "
            >
              <!-- Mini pulse indicator -->
              <div
                style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--primary);
            animation: pulse 1.2s infinite ease-in-out;
          "
              ></div>
              <span>${this.pyodideLoadingProgress}</span>
            </div>
          `
        : ""}

      <!-- Cell items list -->
      <div class="cells-list">
        ${this.cells.map(
          (cell, index) => html`
            <notebook-cell
              .index="${index}"
              .cellId="${cell.id || 0}"
              .code="${cell.code}"
              .outputs="${cell.outputs}"
              .isRunning="${cell.isRunning || false}"
              @cell-code-update="${this.handleCellCodeUpdate}"
              @cell-run="${this.handleCellRun}"
              @cell-delete="${this.handleCellDelete}"
              @cell-move-up="${this.handleCellMoveUp}"
              @cell-move-down="${this.handleCellMoveDown}"
            ></notebook-cell>
          `,
        )}
      </div>

      <!-- Add Cell Button -->
      <div
        class="add-cell-container"
        style="
        display: flex;
        justify-content: center;
        margin: 3rem 0;
      "
      >
        <button
          @click="${this.addCell}"
          class="btn"
          style="
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          color: var(--text-muted);
          box-shadow: none;
          padding: 0.8rem 2rem;
          border-radius: 50px;
          transition: all 0.2s ease;
        "
          @mouseover="${(e: any) => {
            e.target.style.borderColor = "var(--primary)";
            e.target.style.color = "#fff";
          }}"
          @mouseout="${(e: any) => {
            e.target.style.borderColor = "rgba(255, 255, 255, 0.15)";
            e.target.style.color = "var(--text-muted)";
          }}"
        >
          + Add New Code Cell
        </button>
      </div>
    `;
  }
}
