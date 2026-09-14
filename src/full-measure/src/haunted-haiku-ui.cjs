const HAUNTED_HAIKU_STYLE_ID = "hauntedHaikuReceiptStyle";

function installHauntedHaikuStyle(document) {
  if (!document || document.querySelector(`#${HAUNTED_HAIKU_STYLE_ID}`)) return;
  const style = document.createElement("style");
  style.id = HAUNTED_HAIKU_STYLE_ID;
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
    .haunted-haiku-receipt > span {
      display: block;
      margin-bottom: 5px;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.58;
    }
    .haunted-haiku-receipt > strong {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      letter-spacing: 0.04em;
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

function renderHauntedHaikuReceipt(document, receipt) {
  const witness = receipt?.publication?.hauntedHaiku;
  const description = String(witness?.youtubeDescription || "").trim();
  if (
    !document ||
    witness?.authority !== "descriptive-only" ||
    !description
  ) {
    return null;
  }

  const resultCard = document.querySelector("#resultCard");
  if (!resultCard) return null;

  installHauntedHaikuStyle(document);
  let section = document.querySelector("#hauntedHaikuReceipt");
  if (!section) {
    section = document.createElement("section");
    section.id = "hauntedHaikuReceipt";
    section.className = "haunted-haiku-receipt";

    const kicker = document.createElement("span");
    kicker.textContent = "YouTube description · receipt witness";
    const heading = document.createElement("strong");
    heading.textContent = "Haunted Haiku";
    const copy = document.createElement("pre");
    copy.setAttribute("aria-label", "Ready-to-paste YouTube description");
    section.append(kicker, heading, copy);
    resultCard.append(section);
  }

  section.dataset.authority = witness.authority;
  section.dataset.schema = String(witness.schema || "haunted-haiku/v1");
  section.querySelector("pre").textContent = description;
  return section;
}

module.exports = {
  installHauntedHaikuStyle,
  renderHauntedHaikuReceipt,
};
