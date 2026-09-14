((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root?.document) {
    root.hauntedHaikuUi = api;
    api.installHauntedHaikuReceiptObserver(root.document, root.MutationObserver);
  }
})(typeof window === "undefined" ? null : window, () => {
  const STYLE_ID = "hauntedHaikuReceiptStyle";
  const RECEIPT_ID = "hauntedHaikuReceipt";
  const DATA_KEY = "hauntedHaikuReceipt";

  function installHauntedHaikuStyle(document) {
    if (!document || document.querySelector(`#${STYLE_ID}`)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #resultCard { flex-wrap: wrap; }
      .haunted-haiku-receipt {
        box-sizing: border-box;
        flex: 1 0 100%;
        order: 10;
        margin-top: 12px;
        padding: 14px 16px 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.16);
        border-radius: 10px;
      }
      .haunted-haiku-receipt-header {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        justify-content: space-between;
      }
      .haunted-haiku-receipt-heading > span {
        display: block;
        margin-bottom: 5px;
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        opacity: 0.58;
      }
      .haunted-haiku-receipt-heading > strong {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        letter-spacing: 0.04em;
      }
      .haunted-haiku-copy {
        display: inline-grid;
        flex: 0 0 30px;
        width: 30px;
        height: 30px;
        padding: 0;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: inherit;
        background: rgba(255, 255, 255, 0.035);
        cursor: pointer;
        opacity: 0.72;
        transition:
          opacity 120ms ease,
          border-color 120ms ease,
          background 120ms ease,
          transform 120ms ease;
      }
      .haunted-haiku-copy:hover,
      .haunted-haiku-copy:focus-visible {
        border-color: rgba(240, 191, 104, 0.38);
        background: rgba(240, 191, 104, 0.07);
        opacity: 1;
      }
      .haunted-haiku-copy:active {
        transform: translateY(1px);
      }
      .haunted-haiku-copy svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.6;
      }
      .haunted-haiku-copy .copy-check-icon {
        display: none;
      }
      .haunted-haiku-copy[data-copy-state="copied"] .copy-pages-icon {
        display: none;
      }
      .haunted-haiku-copy[data-copy-state="copied"] .copy-check-icon {
        display: block;
      }
      .haunted-haiku-copy[data-copy-state="copied"] {
        border-color: rgba(131, 209, 191, 0.35);
        color: #b8e5da;
        background: rgba(131, 209, 191, 0.07);
        opacity: 1;
      }
      .haunted-haiku-receipt > pre {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        user-select: text;
        font: inherit;
        font-size: 12px;
        line-height: 1.55;
        opacity: 0.88;
      }
    `;
    document.head?.append(style);
  }

  function removeHauntedHaikuReceipt(document) {
    document?.querySelector(`#${RECEIPT_ID}`)?.remove();
  }

  function copyIcon(document) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("copy-pages-icon");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const back = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    back.setAttribute("x", "3");
    back.setAttribute("y", "3");
    back.setAttribute("width", "10");
    back.setAttribute("height", "12");
    back.setAttribute("rx", "1.5");
    const front = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    front.setAttribute("x", "7");
    front.setAttribute("y", "5");
    front.setAttribute("width", "10");
    front.setAttribute("height", "12");
    front.setAttribute("rx", "1.5");
    svg.append(back, front);
    return svg;
  }

  function checkIcon(document) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("copy-check-icon");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const check = document.createElementNS("http://www.w3.org/2000/svg", "path");
    check.setAttribute("d", "M4 10.5 8 14.5 16 6.5");
    svg.append(check);
    return svg;
  }

  async function copyDescription(document, description) {
    const text = String(description || "");
    if (!text) return false;

    const clipboard = document?.defaultView?.navigator?.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      await clipboard.writeText(text);
      return true;
    }

    if (!document?.body || typeof document.execCommand !== "function") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied === true;
  }

  function resetCopyState(button) {
    if (!button) return;
    button.dataset.copyState = "ready";
    button.setAttribute("aria-label", "Copy description");
    button.setAttribute("title", "Copy description");
  }

  function installCopyControl(document, section) {
    const header = section.querySelector(".haunted-haiku-receipt-header");
    if (!header || header.querySelector(".haunted-haiku-copy")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "haunted-haiku-copy";
    resetCopyState(button);
    button.append(copyIcon(document), checkIcon(document));
    button.addEventListener("click", async () => {
      const description = section.querySelector("pre")?.textContent || "";
      let copied = false;
      try {
        copied = await copyDescription(document, description);
      } catch {
        copied = false;
      }
      if (!copied) {
        resetCopyState(button);
        return;
      }

      button.dataset.copyState = "copied";
      button.setAttribute("aria-label", "Copied");
      button.setAttribute("title", "Copied");
      document.defaultView?.setTimeout(() => resetCopyState(button), 1600);
    });
    header.append(button);
  }

  function renderHauntedHaikuReceipt(document, receipt) {
    const witness = receipt?.publication?.hauntedHaiku;
    const description = String(witness?.youtubeDescription || "").trim();
    if (
      !document ||
      witness?.authority !== "descriptive-only" ||
      !description
    ) {
      removeHauntedHaikuReceipt(document);
      return null;
    }

    const resultCard = document.querySelector("#resultCard");
    if (!resultCard) return null;

    installHauntedHaikuStyle(document);
    let section = document.querySelector(`#${RECEIPT_ID}`);
    if (!section) {
      section = document.createElement("section");
      section.id = RECEIPT_ID;
      section.className = "haunted-haiku-receipt";

      const header = document.createElement("div");
      header.className = "haunted-haiku-receipt-header";
      const headingGroup = document.createElement("div");
      headingGroup.className = "haunted-haiku-receipt-heading";
      const kicker = document.createElement("span");
      kicker.textContent = "YouTube description · receipt witness";
      const heading = document.createElement("strong");
      heading.textContent = "Haunted Haiku";
      headingGroup.append(kicker, heading);
      header.append(headingGroup);

      const copy = document.createElement("pre");
      copy.setAttribute("aria-label", "Ready-to-paste YouTube description");
      section.append(header, copy);
      resultCard.append(section);
      installCopyControl(document, section);
    }

    section.dataset.authority = witness.authority;
    section.dataset.schema = String(witness.schema || "haunted-haiku/v1");
    section.querySelector("pre").textContent = description;
    resetCopyState(section.querySelector(".haunted-haiku-copy"));
    return section;
  }

  function receiptFromDataset(resultCard) {
    const raw = resultCard?.dataset?.[DATA_KEY];
    if (!raw) return {};
    try {
      return { publication: { hauntedHaiku: JSON.parse(raw) } };
    } catch {
      return {};
    }
  }

  function installHauntedHaikuReceiptObserver(document, MutationObserverClass) {
    const resultCard = document?.querySelector("#resultCard");
    if (!resultCard) return null;

    const renderCurrent = () =>
      renderHauntedHaikuReceipt(document, receiptFromDataset(resultCard));
    renderCurrent();

    if (typeof MutationObserverClass !== "function") return null;
    const observer = new MutationObserverClass((mutations) => {
      if (
        mutations.some(
          (mutation) => mutation.attributeName === "data-haunted-haiku-receipt",
        )
      ) {
        renderCurrent();
      }
    });
    observer.observe(resultCard, {
      attributes: true,
      attributeFilter: ["data-haunted-haiku-receipt"],
    });
    return observer;
  }

  return {
    copyDescription,
    installHauntedHaikuReceiptObserver,
    installHauntedHaikuStyle,
    renderHauntedHaikuReceipt,
  };
});
