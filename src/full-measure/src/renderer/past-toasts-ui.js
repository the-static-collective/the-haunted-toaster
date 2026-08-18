(() => {
  const api = window.fullMeasure;
  if (!api?.listPastToasts) return;

  const openButton = document.querySelector("#pastToastsOpen");
  const drawer = document.querySelector("#pastToastsDrawer");
  const list = document.querySelector("#pastToastsList");
  const status = document.querySelector("#pastToastsStatus");
  const badge = document.querySelector("#retoastBadge");
  const badgeText = document.querySelector("#retoastBadgeText");
  const clearReToast = document.querySelector("#retoastClear");
  if (!openButton || !drawer || !list || !status || !badge || !badgeText || !clearReToast) return;

  let loading = false;

  function shortDate(value) {
    const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "Unknown date";
  }

  function closeDrawer() {
    drawer.classList.add("is-hidden");
    document.body.classList.remove("has-past-toasts");
  }

  function openDrawer() {
    drawer.classList.remove("is-hidden");
    document.body.classList.add("has-past-toasts");
  }

  function setStatus(message) {
    status.textContent = String(message || "");
  }

  function visualSummary(toast) {
    const identity = toast.visualIdentity || {};
    return [identity.topology, identity.toastFeelId, identity.garmentId]
      .filter(Boolean)
      .join(" · ");
  }

  function artifactButton(toast, kind, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.toastArtifact = kind;
    const available = toast.availability?.[kind] === true;
    button.disabled = !available;
    button.textContent = kind === "video" && !available ? "Video unavailable" : label;
    if (available) {
      button.addEventListener("click", async () => {
        try {
          await api.openPastToastArtifact({
            receiptSha256: toast.receiptSha256,
            kind,
            reveal: false,
          });
        } catch (error) {
          setStatus(error?.message || String(error));
        }
      });
    }
    return button;
  }

  function chooseRating(card, rating) {
    card.dataset.selectedRating = String(rating);
    for (const button of card.querySelectorAll("[data-toast-rating]")) {
      const active = Number(button.dataset.toastRating) === Number(rating);
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function chooseDisposition(card, disposition) {
    const current = card.dataset.selectedDisposition || "";
    const next = current === disposition ? "" : disposition;
    card.dataset.selectedDisposition = next;
    for (const button of card.querySelectorAll("[data-toast-disposition]")) {
      const active = button.dataset.toastDisposition === next;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function renderCard(toast) {
    const card = document.createElement("article");
    card.className = "past-toast-card";
    card.dataset.pastToast = toast.receiptSha256;
    const verdict = toast.latestVerdict || null;
    card.dataset.selectedRating = verdict?.rating ? String(verdict.rating) : "";
    card.dataset.selectedDisposition = verdict?.disposition || "";

    const heading = document.createElement("div");
    heading.className = "past-toast-heading";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = toast.title || "Untitled toast";
    const meta = document.createElement("small");
    meta.textContent = [
      shortDate(toast.createdAt),
      verdict?.rating ? `${verdict.rating}/5` : null,
      visualSummary(toast) || null,
    ].filter(Boolean).join(" · ");
    copy.append(title, meta);
    const retoast = document.createElement("button");
    retoast.type = "button";
    retoast.dataset.toastRet oast = "";
    retoast.removeAttribute("data-toast-ret-oast");
    retoast.setAttribute("data-toast-retoast", "");
    retoast.textContent = "Re-toast";
    heading.append(copy, retoast);

    const artifacts = document.createElement("div");
    artifacts.className = "past-toast-artifacts";
    artifacts.append(
      artifactButton(toast, "receipt", "Receipt"),
      artifactButton(toast, "score", "Score"),
      artifactButton(toast, "timeline", "Timeline"),
      artifactButton(toast, "video", "Video"),
    );

    const verdictEditor = document.createElement("div");
    verdictEditor.className = "past-toast-verdict";
    const rating = document.createElement("div");
    rating.className = "past-toast-rating";
    rating.setAttribute("aria-label", "Rate this toast from one to five");
    for (let value = 1; value <= 5; value += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.toastRating = String(value);
      button.textContent = String(value);
      button.setAttribute("aria-pressed", verdict?.rating === value ? "true" : "false");
      button.classList.toggle("is-selected", verdict?.rating === value);
      button.addEventListener("click", () => chooseRating(card, value));
      rating.append(button);
    }

    const dispositions = document.createElement("div");
    dispositions.className = "past-toast-dispositions";
    for (const [value, label] of [["keep", "KEEP"], ["weird", "WEIRD"], ["compost", "COMPOST"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.toastDisposition = value;
      button.textContent = label;
      button.setAttribute("aria-pressed", verdict?.disposition === value ? "true" : "false");
      button.classList.toggle("is-selected", verdict?.disposition === value);
      button.addEventListener("click", () => chooseDisposition(card, value));
      dispositions.append(button);
    }

    const retoastIntent = document.createElement("label");
    retoastIntent.className = "past-toast-intent";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.toastWouldRet oast = "";
    checkbox.removeAttribute("data-toast-would-ret-oast");
    checkbox.setAttribute("data-toast-would-retoast", "");
    checkbox.checked = verdict?.wouldReToast === true;
    retoastIntent.append(checkbox, document.createTextNode(" would re-toast"));

    const save = document.createElement("button");
    save.type = "button";
    save.dataset.toastSaveVerdict = "";
    save.textContent = "Save verdict";
    save.addEventListener("click", async () => {
      const selectedRating = Number(card.dataset.selectedRating);
      if (!Number.isInteger(selectedRating) || selectedRating < 1 || selectedRating > 5) {
        setStatus("Choose a rating from 1 to 5 first.");
        return;
      }
      save.disabled = true;
      try {
        await api.submitToastVerdict({
          renderReceiptSha256: toast.receiptSha256,
          rating: selectedRating,
          disposition: card.dataset.selectedDisposition || null,
          wouldReToast: checkbox.checked,
        });
        const refreshed = await api.getPastToast(toast.receiptSha256);
        card.replaceWith(renderCard(refreshed));
        setStatus("Verdict added to memory.");
      } catch (error) {
        setStatus(error?.message || String(error));
      } finally {
        save.disabled = false;
      }
    });

    retoast.addEventListener("click", async () => {
      retoast.disabled = true;
      try {
        await api.armReToast(toast.receiptSha256);
        badgeText.textContent = `Re-toast armed · ${toast.title || "Untitled toast"}`;
        badge.classList.remove("is-hidden");
        closeDrawer();
        window.dispatchEvent(new CustomEvent("toaster-retoast-armed", {
          detail: {
            receiptSha256: toast.receiptSha256,
            title: toast.title || "Untitled toast",
          },
        }));
      } catch (error) {
        setStatus(error?.message || String(error));
      } finally {
        retoast.disabled = false;
      }
    });

    verdictEditor.append(rating, dispositions, retoastIntent, save);
    card.append(heading, artifacts, verdictEditor);
    return card;
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    list.replaceChildren();
    setStatus("Reading local receipt history…");
    try {
      const toasts = await api.listPastToasts();
      if (!toasts.length) {
        const empty = document.createElement("div");
        empty.className = "past-toasts-empty";
        empty.innerHTML = "<strong>No past toasts yet.</strong><span>Finished renders will appear here with their receipts.</span>";
        list.append(empty);
        setStatus("Nothing archived yet.");
        return;
      }
      for (const toast of toasts.slice().reverse()) list.append(renderCard(toast));
      setStatus(`${toasts.length} past toast${toasts.length === 1 ? "" : "s"}.`);
    } catch (error) {
      const failure = document.createElement("div");
      failure.className = "past-toasts-empty";
      failure.textContent = error?.message || String(error);
      list.append(failure);
      setStatus("Receipt history could not be read.");
    } finally {
      loading = false;
    }
  }

  openButton.addEventListener("click", async () => {
    openDrawer();
    await refresh();
  });
  for (const closer of drawer.querySelectorAll("[data-past-toasts-close]")) {
    closer.addEventListener("click", closeDrawer);
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawer.classList.contains("is-hidden")) closeDrawer();
  });
  clearReToast.addEventListener("click", async () => {
    try {
      await api.clearReToast();
      badge.classList.add("is-hidden");
      badgeText.textContent = "";
      window.dispatchEvent(new CustomEvent("toaster-retoast-cleared"));
    } catch (error) {
      setStatus(error?.message || String(error));
    }
  });
})();
