const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const generatorPath = path.join(root, "brand", "wrapping-quote-generator.html");
const adminPath = path.join(root, "admin.html");

function read(pathname) {
  return fs.readFileSync(pathname, "utf8");
}

test("wrapping quote generator is linked from the admin console", () => {
  const admin = read(adminPath);
  assert.match(admin, /href="\/brand\/wrapping-quote-generator"/);
  assert.match(admin, /Wrapping &amp; Fitout Quote/);
});

test("wrapping quote generator starts as a blank client and job template", () => {
  const html = read(generatorPath);
  assert.match(html, /id="fPreparedFor"[^>]*value=""/);
  assert.match(html, /id="fScope"[^>]*placeholder=/);
  assert.match(html, /id="lineRows"/);
  assert.match(html, /id="termsList"/);
  assert.match(html, /id="bankDetails"/);
});

test("wrapping quote generator preserves the supplied two-page document structure", () => {
  const html = read(generatorPath);
  assert.ok((html.match(/class="quote-page/g) || []).length >= 2);
  assert.match(html, /Terms &amp; conditions/);
  assert.match(html, /PAYMENT SCHEDULE/i);
  assert.match(html, /BANK TRANSFER DETAILS/i);
  assert.match(html, /@media print/);
  assert.match(html, /size: A4/);
});

test("wrapping quote generator supports editable line items, totals, saving, and printing", () => {
  const html = read(generatorPath);
  assert.match(html, /class="line-description"/);
  assert.match(html, /class="line-amount"|class="[^"]*\sline-amount[^"]*"/);
  assert.match(html, /id="fDiscount"/);
  assert.match(html, /localStorage/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /setValidity/);
  assert.match(html, /paySchedule/);
});
