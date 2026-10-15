const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const htmlPath = path.join(__dirname, "..", "brand", "invoice-generator.html");
const html = fs.readFileSync(htmlPath, "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Could not find ${name}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not close ${name}`);
}

const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];

test("unit prices use direct numeric inputs rather than a select", () => {
  assert.ok(html.includes('<td class="r"><input class="i-rate"'), "missing direct unit-price input");
  assert.ok(html.includes('inputmode="decimal"'), "unit-price input is not decimal-friendly");
  assert.ok(!html.includes('<td class="r"><select class="i-rate">'), "unit price still uses a select");
});

test("custom quantity labels are rendered back into the quantity field", () => {
  const qtyOptionsHtml = vm.runInNewContext(
    `(${extractFunction(script, "qtyOptionsHtml")})`,
    {
      escapeHtml: (value) => String(value),
      QTY_OPTIONS: [
        { v: 1, l: "1 × project" },
        { v: 1, l: "1 × per month" },
        { v: 3, l: "3 months" },
        { v: 6, l: "6 months" },
        { v: 12, l: "12 months" }
      ]
    }
  );
  const rendered = qtyOptionsHtml(2, "project", "2 weeks");
  assert.match(rendered, /data-custom-label="2 weeks"/);
  assert.ok(rendered.includes(">2 weeks</option>"));
});

test("terms include the seven-working-day feedback and publish-start rules", () => {
  assert.ok(html.includes("maximum of <b>7 working days</b>"), "missing feedback deadline term");
  assert.ok(/monthly retainer[\s\S]*published[\s\S]*live to the public[\s\S]*domain[\s\S]*app[\s\S]*software[\s\S]*users/i.test(html), "missing publish-start term");
});

test("quote validity changes refresh both the date and the validity term", () => {
  assert.ok(/#setValidity"\)\.addEventListener\("change", function \(\) \{\s*refreshDates\(\);\s*updateTerms\(\);/.test(html), "validity handler does not refresh terms");
  assert.ok(/setValidity/.test(extractFunction(script, "updateTerms")), "updateTerms does not read quote validity");
});
