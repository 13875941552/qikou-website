document.querySelector(".menu-toggle")?.addEventListener("click", () => {
  document.querySelector(".nav")?.classList.toggle("is-open");
  document.querySelector(".header-cta")?.classList.toggle("is-open");
});

const verifyCenter = document.querySelector("[data-verify-center]");
if (verifyCenter) {
  const apiBase = "https://www.7kou.com.cn/verification-api";
  const maxCertificateBytes = 8 * 1024 * 1024;
  const files = { origin: null, stamp: null, chain: null, copyright: null };
  const referenceRow = verifyCenter.querySelector("[data-reference]");
  const referenceInput = referenceRow.querySelector("input");
  const progressEl = verifyCenter.querySelector("[data-progress]");
  const errorEl = verifyCenter.querySelector("[data-error]");
  const resultEl = verifyCenter.querySelector("[data-result]");
  let busy = false;
  let referenceRequired = false;

  const reasons = {
    COPYRIGHT_FILE_NOT_FOUND: "该文件与此版权证明签发时收录的文件不匹配，请确认文件和证明是否对应",
    MATCHED: "核验通过",
    RESOLVED: "已定位存证记录",
    RECORD_NOT_FOUND: "未找到匹配的已签发记录，请检查核验材料及平台证明原件",
    AMBIGUOUS_RECORD: "存在多条存证，请补充证明编号",
    FILE_HASH_MISMATCH: "源文件摘要与该存证不一致",
    FILE_SIZE_MISMATCH: "源文件大小与该存证不一致",
    CERTIFICATE_MISMATCH: "上传的证明与已签发原件不一致",
    RECORD_INCONSISTENT: "存证关联不完整或不一致，暂无法确认",
    MATERIAL_INSUFFICIENT: "核验材料不足，暂无法确认",
    TIMESTAMP_INVALID: "时间戳签名或摘要关联未通过核验",
    TIMESTAMP_UNCONFIRMED: "时间戳服务未能确认结果，请稍后重试",
    CHAIN_RECORD_NOT_FOUND: "实时查询未找到已确认的链上记录",
    CHAIN_CONTENT_MISMATCH: "链上内容与该存证不一致",
    SERVICE_UNAVAILABLE: "核验服务暂不可用，请稍后重试"
  };
  const errors = {
    INVALID_HASH: "请输入 64 位电子证据 SHA256 值；交易 Hash 不能代替源文件摘要。",
    INVALID_CERTIFICATE: "请选择平台下载的 .tsa 或 .pdf 证明原件。",
    CERTIFICATE_SIZE: "证明文件不能为空，且不能超过 8 MB。",
    NEED_ORIGINAL: "请先选择要核验的源文件。",
    NEED_HASH: "请选择源文件，或输入电子证据 SHA256 值。",
    NEED_COPYRIGHT: "请先选择需要核验的版权存证证明 PDF。",
    HASH_FAILED: "文件摘要计算失败，请重新选择文件后重试。",
    INVALID_RESPONSE: "核验服务未返回有效结果，请稍后重试。",
    INVALID_MATERIAL: "材料格式或核验标识无效，请检查平台证明原件及输入内容。",
    RATE_LIMITED: "核验请求较多，请稍后重试。",
    SERVICE_UNAVAILABLE: "暂时无法连接核验服务，请稍后重试。"
  };
  const labels = {
    resultFileHash: "文件 Hash",
    evidenceSha256: "电子证据 SHA256 值",
    resultTxHash: "交易 Hash",
    resultTime: "上链时间（UTC）",
    timestampDigest: "时间戳存证内容摘要",
    timestampSerial: "时间戳令牌序列号",
    signerSerial: "签名证明序列号",
    timestampTime: "时间戳授时时间（UTC）",
    queriedAt: "本次查询时间（UTC）",
    manifestHash: "作品证据清单 SHA256"
  };
  const notes = {
    success: "证明该文件自申请时间起已存在且内容保存完整、未被篡改",
    chain: "证明该数据电子文件自上链之日起未经篡改。",
    copyright: "该版权存证证明与平台签发记录及链上存证信息一致。",
    memberTimestamp: "该文件已收录于此版权证明签发时的作品证据清单，文件内容一致，关联时间戳签名及信任链核验通过。",
    memberChain: "该文件已收录于此版权证明签发时的作品证据清单，文件内容一致，关联链上存证实时核验通过。"
  };

  const showError = (key) => {
    errorEl.hidden = false;
    errorEl.textContent = errors[key] || errors.SERVICE_UNAVAILABLE;
  };
  const clearFeedback = () => {
    errorEl.hidden = true;
    resultEl.hidden = true;
    resultEl.innerHTML = "";
    progressEl.hidden = true;
  };

  const setFile = (key, file, card) => {
    files[key] = file;
    if (!card) return;
    card.classList.toggle("has-file", Boolean(file));
    const text = card.querySelector(".drop-text");
    if (text && key !== "stamp") text.textContent = file ? file.name : text.dataset.empty;
  };

  verifyCenter.querySelectorAll(".drop-text").forEach((text) => {
    text.dataset.empty = text.textContent;
  });

  const bindDrop = (name) => {
    const card = verifyCenter.querySelector(`[data-drop="${name}"]`);
    const input = card.querySelector("input[type=file]");
    input.addEventListener("click", (event) => event.stopPropagation());
    card.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file || busy) return;
      if (name === "chain") {
        files.chain = file;
        verifyCenter.querySelector("[data-chain-hash]").value = "";
      }
      if (name === "copyright" && !/\.pdf$/i.test(file.name)) {
        showError("INVALID_CERTIFICATE");
        return;
      }
      setFile(name, file, card);
      clearFeedback();
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("is-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("is-over"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("is-over");
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file || busy) return;
      if (name === "copyright" && !/\.pdf$/i.test(file.name)) {
        showError("INVALID_CERTIFICATE");
        return;
      }
      if (name === "chain") verifyCenter.querySelector("[data-chain-hash]").value = "";
      setFile(name, file, card);
      clearFeedback();
    });
  };
  ["origin", "chain", "copyright"].forEach(bindDrop);

  const stampTitle = verifyCenter.querySelector(".stamp-title");
  const stampEmpty = stampTitle.textContent;
  const acceptStamp = (file) => {
    if (!file || busy) return;
    clearFeedback();
    if (!/\.(tsa|pdf)$/i.test(file.name) || !file.size || file.size > maxCertificateBytes) {
      files.stamp = null;
      stampTitle.textContent = stampEmpty;
      showError(!file.size || file.size > maxCertificateBytes ? "CERTIFICATE_SIZE" : "INVALID_CERTIFICATE");
      return;
    }
    files.stamp = file;
    stampTitle.textContent = file.name;
  };
  verifyCenter.querySelectorAll("[data-pick]").forEach((button) => {
    const input = verifyCenter.querySelector(`[data-file="${button.dataset.pick}"]`);
    button.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.value = "";
      acceptStamp(file);
    });
  });

  verifyCenter.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (busy) return;
      verifyCenter.querySelectorAll("[data-tab]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      verifyCenter.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== button.dataset.tab;
      });
      clearFeedback();
    });
  });

  const sha256 = async (file) => {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  };

  const stampCard = verifyCenter.querySelector(".stamp-card");
  stampCard.addEventListener("dragover", (event) => {
    event.preventDefault();
    stampCard.classList.add("is-over");
  });
  stampCard.addEventListener("dragleave", () => stampCard.classList.remove("is-over"));
  stampCard.addEventListener("drop", (event) => {
    event.preventDefault();
    stampCard.classList.remove("is-over");
    acceptStamp(event.dataTransfer.files && event.dataTransfer.files[0]);
  });

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));

  const renderResult = (tab, data) => {
    const reason = reasons[data.verification_reason] || reasons.SERVICE_UNAVAILABLE;
    const member = data.verification_scope === "COPYRIGHT_MEMBER_FILE";
    const note = member
      ? (tab === "chain" ? notes.memberChain : notes.memberTimestamp)
      : tab === "copyright" ? notes.copyright : tab === "chain" ? notes.chain : notes.success;
    const fields = tab === "copyright"
      ? [["file_hash", "evidenceSha256"], ["chain_tx_hash", "resultTxHash"], ["message_imprint", "timestampDigest"], ["generated_at", "timestampTime"], ["chain_time", "resultTime"], ["verified_at", "queriedAt"]]
      : [["file_hash", "resultFileHash"]];
    if (tab !== "copyright" && member) fields.push(["manifest_sha256", "manifestHash"]);
    if (tab === "tsa") {
      fields.push(["message_imprint", "timestampDigest"], ["timestamp_serial", "timestampSerial"], ["signer_certificate_serial", "signerSerial"], ["generated_at", "timestampTime"]);
    }
    if (tab === "chain") {
      fields.push(["chain_tx_hash", "resultTxHash"], ["chain_time", "resultTime"], ["verified_at", "queriedAt"]);
    }
    resultEl.hidden = false;
    resultEl.classList.toggle("is-passed", data.verified === true);
    const rows = data.verified === true
      ? `<p>${escapeHtml(note)}</p><dl>${fields.map(([key, label]) => `<div><dt>${escapeHtml(labels[label])}</dt><dd>${escapeHtml(data[key] || "链服务未提供")}</dd></div>`).join("")}</dl>`
      : "";
    resultEl.innerHTML = `<h3>核验结果</h3><p>${escapeHtml(reason)}</p>${rows}`;
  };

  const submit = async (tab) => {
    if (busy) return;
    clearFeedback();
    const origin = tab === "tsa" ? files.origin : tab === "chain" ? files.chain : files.copyright;
    if (tab === "tsa" && !origin) return showError("NEED_ORIGINAL");
    if (tab === "tsa" && !files.stamp) return showError("INVALID_CERTIFICATE");
    if (tab === "chain" && !origin && !verifyCenter.querySelector("[data-chain-hash]").value.trim()) return showError("NEED_HASH");
    if (tab === "copyright" && !origin) return showError("NEED_COPYRIGHT");
    if (tab === "copyright" && (!/\.pdf$/i.test(origin.name) || !origin.size || origin.size > maxCertificateBytes)) {
      return showError(!origin.size || origin.size > maxCertificateBytes ? "CERTIFICATE_SIZE" : "INVALID_CERTIFICATE");
    }

    busy = true;
    verifyCenter.querySelectorAll(".verify-submit").forEach((button) => {
      button.disabled = true;
      button.textContent = "核验中";
    });
    try {
      let hash = null;
      if (tab !== "copyright" && origin) {
        progressEl.hidden = false;
        progressEl.textContent = "正在计算文件摘要…";
        hash = await sha256(origin);
      } else if (tab === "chain") {
        hash = verifyCenter.querySelector("[data-chain-hash]").value.trim().replace(/^sha256:/i, "");
        if (!/^[a-f0-9]{64}$/i.test(hash)) {
          showError("INVALID_HASH");
          return;
        }
        hash = hash.toUpperCase();
      }
      progressEl.hidden = false;
      progressEl.textContent = "正在核验…";
      const body = new FormData();
      if (hash) body.append("file_hash", hash);
      if (tab !== "copyright" && origin) body.append("file_size", String(origin.size));
      if (referenceRequired && referenceInput.value.trim()) body.append("reference", referenceInput.value.trim());
      if (tab === "tsa") body.append("certificate", files.stamp);
      if (tab === "copyright") body.append("certificate", origin);
      const endpoint = tab === "tsa" ? "timestamp" : tab;
      const response = await fetch(`${apiBase}/${endpoint}`, { method: "POST", body });
      if (response.status === 429) {
        showError("RATE_LIMITED");
        return;
      }
      const payload = await response.json();
      const data = payload && payload.data;
      if (!(payload && payload.code === 200 && data && typeof data.verification_reason === "string")) {
        showError(payload && payload.code === 40001 ? "INVALID_MATERIAL" : "INVALID_RESPONSE");
        return;
      }
      if (data.verification_reason === "AMBIGUOUS_RECORD") {
        referenceRequired = true;
        referenceRow.hidden = false;
        referenceInput.focus();
      }
      progressEl.hidden = true;
      renderResult(tab, data);
    } catch (error) {
      showError(error && error.message === "INVALID_HASH" ? "INVALID_HASH" : "SERVICE_UNAVAILABLE");
    } finally {
      busy = false;
      progressEl.hidden = true;
      verifyCenter.querySelectorAll(".verify-submit").forEach((button) => {
        button.disabled = false;
        button.textContent = "立即核验";
      });
    }
  };

  verifyCenter.querySelectorAll("[data-submit]").forEach((button) => {
    button.addEventListener("click", () => submit(button.dataset.submit));
  });
  verifyCenter.querySelector("[data-chain-hash]").addEventListener("input", () => {
    if (verifyCenter.querySelector("[data-chain-hash]").value.trim()) {
      files.chain = null;
      const card = verifyCenter.querySelector('[data-drop="chain"]');
      card.classList.remove("has-file");
      card.querySelector(".drop-text").textContent = card.querySelector(".drop-text").dataset.empty;
    }
  });
}

const slider = document.querySelector("[data-slider]");
if (slider) {
  const track = slider.querySelector(".hero-slider-track");
  const slides = [...track.children];
  const dotsWrap = slider.querySelector(".slider-dots");
  const total = slides.length;
  let index = 0;
  let timer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `第 ${i + 1} 张`);
    dot.addEventListener("click", () => go(i, true));
    dotsWrap.append(dot);
  });

  const dots = [...dotsWrap.children];

  const render = () => {
    track.style.transform = `translateX(${-index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };

  const go = (next, reset) => {
    index = (next + total) % total;
    render();
    if (reset) play();
  };

  const play = () => {
    clearInterval(timer);
    timer = setInterval(() => go(index + 1), 4000);
  };

  slider.querySelector(".is-prev")?.addEventListener("click", () => go(index - 1, true));
  slider.querySelector(".is-next")?.addEventListener("click", () => go(index + 1, true));
  slider.addEventListener("mouseenter", () => clearInterval(timer));
  slider.addEventListener("mouseleave", play);

  let startX = 0;
  slider.addEventListener("touchstart", (e) => {
    startX = e.changedTouches[0].clientX;
    clearInterval(timer);
  }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1), true);
    else play();
  });

  render();
  play();
}
