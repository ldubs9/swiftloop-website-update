import fs from "node:fs/promises";

const CDP_HOST = "http://127.0.0.1:9223";
const SITE = "http://127.0.0.1:8877";
const SHOTS = new URL("./screenshots/", import.meta.url);
await fs.mkdir(SHOTS, { recursive: true });

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.events = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result || {});
        return;
      }
      this.events.push(message);
      const waiters = this.listeners.get(message.method) || [];
      this.listeners.delete(message.method);
      waiters.forEach((resolve) => resolve(message.params || {}));
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const wrapped = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      const waiters = this.listeners.get(method) || [];
      waiters.push(wrapped);
      this.listeners.set(method, waiters);
    });
  }

  close() {
    this.ws.close();
  }
}

async function openPage(path, width = 1440, height = 1000) {
  const response = await fetch(`${CDP_HOST}/json/new?${encodeURIComponent(SITE + path)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create CDP target: ${response.status}`);
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
    client.send("Log.enable"),
  ]);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 640,
    screenWidth: width,
    screenHeight: height,
  });
  const loaded = client.once("Page.loadEventFired");
  await client.send("Page.navigate", { url: SITE + path });
  await loaded;
  await evaluate(client, "document.fonts.ready.then(() => true)", true);
  await new Promise((resolve) => setTimeout(resolve, 250));
  return client;
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Evaluation failed");
  return result.result?.value;
}

async function screenshot(client, filename) {
  const result = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await fs.writeFile(new URL(filename, SHOTS), Buffer.from(result.data, "base64"));
}

async function printPdf(client, filename) {
  const result = await client.send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
  await fs.writeFile(new URL(filename, SHOTS), Buffer.from(result.data, "base64"));
}

function failures(client) {
  const consoleErrors = client.events
    .filter((event) => event.method === "Runtime.consoleAPICalled" && event.params.type === "error")
    .map((event) => event.params.args?.map((arg) => arg.value || arg.description).join(" "));
  const networkFailures = client.events
    .filter((event) => event.method === "Network.loadingFailed" && !event.params.canceled)
    .map((event) => `${event.params.errorText}: ${event.params.type}`);
  return { consoleErrors, networkFailures };
}

const report = {};

{
  const page = await openPage("/brand/guidelines.html");
  report.guidelines = await evaluate(page, `(() => {
    const root = document.documentElement;
    const toggle = document.getElementById("themeToggle");
    const initial = root.dataset.theme;
    toggle.click();
    const toggled = { theme: root.dataset.theme, pressed: toggle.getAttribute("aria-pressed") };
    toggle.click();
    return {
      title: document.title,
      initial,
      toggled,
      restored: root.dataset.theme,
      sections: document.querySelectorAll("main > section").length,
      boardCells: document.querySelectorAll(".brand-board .board-cell").length,
      fonts: {
        display: document.fonts.check('16px "SwiftLoop Display"'),
        body: document.fonts.check('16px "SwiftLoop Body"'),
        label: document.fonts.check('16px "SwiftLoop Label"')
      },
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      downloads: Array.from(document.querySelectorAll(".downloads a")).map((a) => a.getAttribute("href"))
    };
  })()`);
  await screenshot(page, "guidelines-desktop.png");
  await evaluate(page, "document.getElementById('system').scrollIntoView()")
  await new Promise((resolve) => setTimeout(resolve, 150));
  await screenshot(page, "guidelines-board.png");
  report.guidelines.failures = failures(page);
  page.close();
}

{
  const page = await openPage("/brand/invoice-generator.html");
  report.invoice = await evaluate(page, `(() => {
    const click = (selector) => document.querySelector(selector).click();
    const initial = {
      oneTimeRows: document.querySelectorAll("#oneTimeRows tr").length,
      recurringRows: document.querySelectorAll("#recurringRows tr").length,
      total: document.getElementById("tGrand").textContent,
      monthly: document.getElementById("tMonthly").textContent,
      docType: document.getElementById("docTypeLabel").textContent
    };
    click('#docTypeSeg button[data-type="INVOICE"]');
    const invoice = {
      docType: document.getElementById("docTypeLabel").textContent,
      dueLabel: document.getElementById("dueLabel").textContent,
      totalLabel: document.getElementById("grandLbl").textContent
    };
    click('#marketSeg button[data-market="INTL"]');
    const international = {
      panel: document.getElementById("panelSub").textContent,
      terms: document.getElementById("termsTitle").textContent
    };
    const currency = document.getElementById("setCurrency");
    currency.value = "USD";
    currency.dispatchEvent(new Event("change", { bubbles: true }));
    const usd = {
      unit: document.getElementById("thUnitPrice").textContent,
      amount: document.getElementById("thAmount").textContent,
      totalCode: document.getElementById("grandCurrencyCode").textContent
    };
    const beforeAdd = document.querySelectorAll("#oneTimeRows tr").length;
    click("#addOneTimeRowBtn");
    const afterAdd = document.querySelectorAll("#oneTimeRows tr").length;
    return {
      title: document.title,
      initial,
      invoice,
      international,
      usd,
      addedRow: afterAdd === beforeAdd + 1,
      fonts: {
        display: document.fonts.check('16px "SwiftLoop Display"'),
        body: document.fonts.check('16px "SwiftLoop Body"'),
        label: document.fonts.check('16px "SwiftLoop Label"')
      },
      controls: document.querySelectorAll(".panel select, .panel input, .panel button").length,
      documentPresent: Boolean(document.getElementById("doc"))
    };
  })()`);
  await screenshot(page, "invoice-desktop.png");
  await printPdf(page, "invoice-print.pdf");
  report.invoice.failures = failures(page);
  page.close();
}

{
  const page = await openPage("/brand/business-card-v2.html");
  report.card = await evaluate(page, `(() => {
    const toggle = document.getElementById("bleedToggle");
    const initial = {
      hasBleed: document.body.classList.contains("has-bleed"),
      bleed: getComputedStyle(document.body).getPropertyValue("--bleed").trim()
    };
    toggle.click();
    const toggled = {
      hasBleed: document.body.classList.contains("has-bleed"),
      bleed: getComputedStyle(document.body).getPropertyValue("--bleed").trim()
    };
    toggle.click();
    const card = document.querySelector(".card").getBoundingClientRect();
    return {
      title: document.title,
      initial,
      toggled,
      restored: !document.body.classList.contains("has-bleed"),
      cards: document.querySelectorAll(".card").length,
      ratio: Number((card.width / card.height).toFixed(3)),
      qr: Boolean(document.querySelector(".qr path")),
      logoAsset: document.querySelector(".front-wordmark")?.getAttribute("src"),
      fonts: {
        display: document.fonts.check('16px "SwiftLoop Display"'),
        body: document.fonts.check('16px "SwiftLoop Body"'),
        label: document.fonts.check('16px "SwiftLoop Label"')
      },
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  })()`);
  await screenshot(page, "card-desktop.png");
  await printPdf(page, "card-print.pdf");
  report.card.failures = failures(page);
  page.close();
}

for (const [name, path] of [["guidelinesMobile", "/brand/guidelines.html"], ["cardMobile", "/brand/business-card-v2.html"]]) {
  const page = await openPage(path, 390, 844);
  report[name] = await evaluate(page, `(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll("*")).map((element) => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, className: element.className, id: element.id, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    }).filter((item) => item.right > viewport + 1 || item.left < -1).slice(0, 20);
    return {
      width: viewport,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth - viewport,
      fontsReady: document.fonts.status,
      offenders
    };
  })()`);
  await screenshot(page, `${name}.png`);
  report[name].failures = failures(page);
  page.close();
}

console.log(JSON.stringify(report, null, 2));
