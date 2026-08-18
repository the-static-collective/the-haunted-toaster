(() => {
  const launch = document.querySelector(".candidate-launch");
  if (!launch) return;

  const MAX_NODES = 24;
  const MAX_EDGES = 36;
  const SVG_NS = "http://www.w3.org/2000/svg";
  let currentTrace = null;

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.id = "thoughtlineOpen";
  openButton.className = "thoughtline-open";
  openButton.textContent = "Thoughtline";
  openButton.disabled = true;
  launch.insertAdjacentElement("afterend", openButton);

  const panel = document.createElement("div");
  panel.id = "thoughtlinePanel";
  panel.className = "thoughtline-panel is-hidden";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "thoughtlineTitle");
  panel.innerHTML = `
    <button class="thoughtline-backdrop" type="button" data-thoughtline-close aria-label="Close Thoughtline"></button>
    <section class="thoughtline-surface">
      <header class="thoughtline-header">
        <div>
          <span>RECORDED INFLUENCE TRACE</span>
          <h2 id="thoughtlineTitle">Thoughtline</h2>
          <p>Why these candidates existed, from explicit local evidence.</p>
        </div>
        <button id="thoughtlineClose" class="thoughtline-close" type="button" aria-label="Close Thoughtline">×</button>
      </header>
      <div class="thoughtline-stage">
        <svg id="thoughtlineGraph" class="thoughtline-graph" viewBox="0 0 720 420" role="img" aria-label="Current toaster influence trace"></svg>
        <aside id="thoughtlineInspector" class="thoughtline-inspector" aria-live="polite">
          <strong>Select a node or edge.</strong>
          <span>Only recorded influence evidence appears here.</span>
        </aside>
      </div>
    </section>
  `;
  document.body.append(panel);

  const graph = panel.querySelector("#thoughtlineGraph");
  const inspector = panel.querySelector("#thoughtlineInspector");
  const closeButton = panel.querySelector("#thoughtlineClose");

  function validTrace(value) {
    return value?.schema === "haunted-toaster/influence-trace/v1" &&
      Array.isArray(value.nodes) &&
      Array.isArray(value.edges);
  }

  function truncate(value, limit = 26) {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  function positions(nodes) {
    const map = new Map();
    const count = Math.max(1, nodes.length);
    for (let index = 0; index < nodes.length; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
      const radiusX = count < 4 ? 185 : 250;
      const radiusY = count < 4 ? 112 : 145;
      map.set(nodes[index].id, {
        x: 360 + Math.cos(angle) * radiusX,
        y: 210 + Math.sin(angle) * radiusY,
      });
    }
    return map;
  }

  function inspectEdge(edge) {
    inspector.replaceChildren();
    const relation = document.createElement("strong");
    relation.textContent = edge.relation || "influence";
    const summary = document.createElement("span");
    summary.textContent = `${edge.from} → ${edge.to}`;
    inspector.append(relation, summary);
    for (const ref of edge.evidenceRefs || []) {
      const code = document.createElement("code");
      code.textContent = ref;
      inspector.append(code);
    }
  }

  function inspectNode(node) {
    inspector.replaceChildren();
    const label = document.createElement("strong");
    label.textContent = node.label || node.type || "trace node";
    const kind = document.createElement("span");
    kind.textContent = node.type || "evidence";
    inspector.append(label, kind);
    if (node.ref) {
      const code = document.createElement("code");
      code.textContent = node.ref;
      inspector.append(code);
    }
  }

  function renderTrace() {
    graph.replaceChildren();
    if (!validTrace(currentTrace)) {
      inspector.innerHTML = "<strong>No current trace.</strong><span>Generate a six-up to reveal accountable influence.</span>";
      return;
    }

    const nodes = currentTrace.nodes.slice(0, MAX_NODES);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = currentTrace.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .slice(0, MAX_EDGES);
    const point = positions(nodes);

    for (const edge of edges) {
      const from = point.get(edge.from);
      const to = point.get(edge.to);
      if (!from || !to) continue;
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(from.x));
      line.setAttribute("y1", String(from.y));
      line.setAttribute("x2", String(to.x));
      line.setAttribute("y2", String(to.y));
      line.setAttribute("class", "thoughtline-edge");
      line.setAttribute("tabindex", "0");
      line.setAttribute("role", "button");
      line.dataset.thoughtlineEdge = `${edge.from}:${edge.to}`;
      line.dataset.relation = String(edge.relation || "recalled");
      line.dataset.evidenceCount = String((edge.evidenceRefs || []).length);
      line.addEventListener("click", () => inspectEdge(edge));
      line.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inspectEdge(edge);
        }
      });
      graph.append(line);
    }

    for (const node of nodes) {
      const position = point.get(node.id);
      if (!position) continue;
      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `thoughtline-node thoughtline-node--${String(node.type || "evidence").replace(/[^a-z0-9-]/gi, "-")}`);
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.dataset.thoughtlineNode = node.id;
      group.dataset.nodeType = String(node.type || "evidence");

      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(position.x));
      circle.setAttribute("cy", String(position.y));
      circle.setAttribute("r", node.type === "candidate" ? "23" : "18");
      const pulse = document.createElementNS(SVG_NS, "circle");
      pulse.setAttribute("cx", String(position.x));
      pulse.setAttribute("cy", String(position.y));
      pulse.setAttribute("r", node.type === "candidate" ? "31" : "26");
      pulse.setAttribute("class", "thoughtline-node-pulse");
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(position.x));
      text.setAttribute("y", String(position.y + 38));
      text.setAttribute("text-anchor", "middle");
      text.textContent = truncate(node.label || node.type || node.id);
      group.append(pulse, circle, text);
      group.addEventListener("click", () => inspectNode(node));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inspectNode(node);
        }
      });
      graph.append(group);
    }
  }

  function openPanel() {
    if (!validTrace(currentTrace)) return;
    renderTrace();
    panel.classList.remove("is-hidden");
    document.body.classList.add("has-thoughtline");
  }

  function closePanel() {
    panel.classList.add("is-hidden");
    document.body.classList.remove("has-thoughtline");
  }

  openButton.addEventListener("click", openPanel);
  closeButton.addEventListener("click", closePanel);
  panel.querySelector("[data-thoughtline-close]").addEventListener("click", closePanel);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.classList.contains("is-hidden")) closePanel();
  });
  window.addEventListener("toaster-influence-trace", (event) => {
    currentTrace = validTrace(event.detail) ? structuredClone(event.detail) : null;
    openButton.disabled = !currentTrace;
    openButton.classList.toggle("has-trace", Boolean(currentTrace));
    if (!currentTrace) closePanel();
    if (!panel.classList.contains("is-hidden")) renderTrace();
  });
})();
