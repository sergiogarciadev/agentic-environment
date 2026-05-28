import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./monaco-editor";

// Configure marked to render mermaid blocks correctly as <pre class="mermaid"> and code blocks with syntax highlighting
if (typeof window !== "undefined" && (window as any).marked) {
  try {
    (window as any).marked.use({
      renderer: {
        code(code: any, lang?: string) {
          const codeText = typeof code === "object" ? code.text : code;
          const codeLang = (typeof code === "object" ? code.lang : lang) || "";

          if (codeLang === "mermaid") {
            return `<pre class="mermaid">${codeText}</pre>`;
          }

          // Dynamic code syntax highlighting via Highlight.js during parse phase
          if ((window as any).hljs && codeLang) {
            try {
              const highlighted = (window as any).hljs.highlight(codeText, {
                language: codeLang,
              }).value;
              return `<pre><code class="hljs language-${codeLang}">${highlighted}</code></pre>`;
            } catch (err) {
              try {
                const highlighted = (window as any).hljs.highlightAuto(codeText).value;
                return `<pre><code class="hljs">${highlighted}</code></pre>`;
              } catch (e) {
                // Fallback to plaintext
              }
            }
          }

          return `<pre><code class="language-${codeLang || "plaintext"}">${codeText}</code></pre>`;
        },
      },
    });
  } catch (err) {
    console.error("Failed to configure marked code renderer:", err);
  }
}

// Unified helper to render LaTeX and Mermaid diagrams inside a DOM container
export function renderMarkdownExtensions(container: HTMLElement) {
  if (!container) return;

  // 1. KaTeX LaTeX Math rendering
  if ((window as any).renderMathInElement) {
    try {
      (window as any).renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      });
    } catch (err) {
      console.error("KaTeX rendering error:", err);
    }
  }

  // 2. Mermaid diagrams
  if ((window as any).mermaid) {
    try {
      const mermaidNodes = container.querySelectorAll(".mermaid");
      if (mermaidNodes.length > 0) {
        // Run mermaid on these specific nodes
        (window as any).mermaid.run({
          nodes: Array.from(mermaidNodes),
        });
      }
    } catch (err) {
      console.error("Mermaid render error:", err);
    }
  }
}

@customElement("markdown-editor")
export class MarkdownEditor extends LitElement {
  @property({ type: String }) value = "";

  @state() private parsedHtml = "";

  createRenderRoot() {
    return this; // Render in the Light DOM
  }

  firstUpdated() {
    this.updatePreview();
  }

  async updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("value")) {
      this.updatePreview();
      await this.updateComplete;

      // Perform math and diagram parses in real-time
      const previewPane = this.querySelector(".preview-pane");
      if (previewPane) {
        renderMarkdownExtensions(previewPane as HTMLElement);
      }
    }
  }

  private handleCodeChange(e: CustomEvent) {
    this.value = e.detail.value;
    this.updatePreview();

    this.dispatchEvent(
      new CustomEvent("markdown-change", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updatePreview() {
    if (typeof window !== "undefined" && (window as any).marked) {
      try {
        this.parsedHtml = (window as any).marked.parse(this.value || "");
      } catch (err) {
        console.error("Failed to parse Markdown:", err);
        this.parsedHtml = '<p style="color: var(--accent);">Failed to parse markdown content.</p>';
      }
    } else {
      this.parsedHtml = '<p style="color: var(--text-muted);">Markdown parser loading...</p>';
    }
  }

  render() {
    return html`
      <div
        class="markdown-split-container"
        style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        width: 100%;
        min-height: 250px;
        margin-top: 0.5rem;
      "
      >
        <!-- Left Side: Monaco Editor -->
        <div class="editor-pane" style="display: flex; flex-direction: column;">
          <monaco-editor
            .value="${this.value}"
            language="markdown"
            @code-change="${this.handleCodeChange}"
          ></monaco-editor>
        </div>

        <!-- Right Side: Live Compiled HTML Preview -->
        <div
          class="preview-pane markdown-body"
          style="
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 1.2rem;
          height: 200px;
          overflow-y: auto;
          color: #e5e7eb;
          line-height: 1.6;
        "
        >
          <!-- Inject compiled HTML safely -->
          <div .innerHTML="${this.parsedHtml}"></div>
        </div>
      </div>
    `;
  }
}
