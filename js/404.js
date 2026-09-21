(function () {
  "use strict";

  var visual = document.getElementById("errorVisual");
  var pathEl = document.getElementById("missingPath");
  var statusEl = document.getElementById("errorStatus");
  var reroute = document.getElementById("reroute");
  var copyPath = document.getElementById("copyPath");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var requestedPath = window.location.pathname + window.location.search;

  if (pathEl) pathEl.textContent = requestedPath || "/";

  function setStatus(text) {
    if (statusEl) statusEl.textContent = "Status / " + text;
  }

  if (visual && !reduceMotion) {
    var frame = null;
    var pointer = { x: 0, y: 0 };

    visual.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      var rect = visual.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        visual.style.setProperty("--px", (pointer.x * 12).toFixed(2));
        visual.style.setProperty("--py", (pointer.y * 12).toFixed(2));
        visual.style.setProperty("--rx", (pointer.y * -4).toFixed(2));
        visual.style.setProperty("--ry", (pointer.x * 5).toFixed(2));
        frame = null;
      });
    }, { passive: true });

    visual.addEventListener("pointerleave", function () {
      visual.style.setProperty("--px", "0");
      visual.style.setProperty("--py", "0");
      visual.style.setProperty("--rx", "0");
      visual.style.setProperty("--ry", "0");
    });
  }

  if (reroute) {
    reroute.addEventListener("click", function () {
      if (reroute.disabled) return;
      reroute.disabled = true;
      reroute.setAttribute("aria-busy", "true");
      document.body.classList.add("error-is-reconnecting");
      setStatus("reconnecting");
      window.setTimeout(function () { window.location.assign("/"); }, reduceMotion ? 0 : 700);
    });
  }

  if (copyPath) {
    copyPath.addEventListener("click", function () {
      var done = function () {
        copyPath.textContent = "Route copied";
        setStatus("route copied");
        window.setTimeout(function () { copyPath.textContent = "Copy route"; }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(requestedPath).then(done).catch(function () {
          setStatus("copy unavailable");
        });
        return;
      }

      var input = document.createElement("textarea");
      input.value = requestedPath;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {
        setStatus("copy unavailable");
      }
      input.remove();
    });
  }
})();
