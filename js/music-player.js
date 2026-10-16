(function () {
  "use strict";

  var MAX_TRACKS = 20;
  var PREFIX = "music/bgm";
  var EXT = ".mp3";

  /* 是否优先读取 MP3 内嵌歌名
     true  = 读到就用文件里的标题，读不到回退文件名
     false = 用下面的 TITLES 表 */
  var USE_ID3 = true;

  /* 手动歌名表（USE_ID3 = false 时生效） */
  var TITLES = {
    1: "",
    2: "",
    3: "",
    4: ""
  };

  var audio = document.getElementById("mpAudio");
  var playBtn = document.getElementById("mpPlay");
  var icon = document.getElementById("mpIcon");
  var titleEl = document.getElementById("mpTitle");
  var curEl = document.getElementById("mpCur");
  var durEl = document.getElementById("mpDur");
  var bar = document.getElementById("mpBar");
  var fill = document.getElementById("mpFill");
  var volBar = document.getElementById("mpVolBar");
  var volFill = document.getElementById("mpVolFill");

  var PLAY_PATH = "M8 5v14l11-7z";
  var PAUSE_PATH = "M6 5h4v14H6zM14 5h4v14h-4z";

  var tracks = [];
  var index = 0;
  var ready = false;

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function fmt(sec) {
    if (!isFinite(sec) || isNaN(sec)) sec = 0;
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  function setIcon(playing) {
    icon.innerHTML = '<path d="' + (playing ? PAUSE_PATH : PLAY_PATH) + '"/>';
  }

  /* ============================================================
     读取 MP3 ID3v2 标签里的标题（Title / TIT2）
     只读取文件开头部分，够解析出标签就行
     ============================================================ */
  function readID3Title(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function () {
      try {
        var buf = xhr.response;
        if (!buf || buf.byteLength < 10) { callback(null); return; }

        var view = new DataView(buf);
        // 检查 "ID3"
        if (view.getUint8(0) !== 0x49 ||
            view.getUint8(1) !== 0x44 ||
            view.getUint8(2) !== 0x33) {
          callback(null); return;
        }

        var ver = view.getUint8(3);       // 主版本 3=ID3v2.3, 4=ID3v2.4
        var flags = view.getUint8(5);

        // 标签总大小（4 字节 synchsafe）
        var size = ((view.getUint8(6) & 0x7f) << 21) |
                   ((view.getUint8(7) & 0x7f) << 14) |
                   ((view.getUint8(8) & 0x7f) << 7) |
                   (view.getUint8(9) & 0x7f);

        var offset = 10;
        // 如果有扩展头，跳过
        if (flags & 0x40) {
          var extSize = ((view.getUint8(10) & 0x7f) << 21) |
                        ((view.getUint8(11) & 0x7f) << 14) |
                        ((view.getUint8(12) & 0x7f) << 7) |
                        (view.getUint8(13) & 0x7f);
          offset += extSize;
        }

        var end = 10 + size;
        if (end > buf.byteLength) end = buf.byteLength;

        while (offset < end) {
          var frameID = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
          );

          if (frameID === "\0\0\0\0") break;

          // 帧大小：v2.4 用 synchsafe，v2.3 用普通整数
          var frameSize;
          if (ver === 4) {
            frameSize = ((view.getUint8(offset + 4) & 0x7f) << 21) |
                        ((view.getUint8(offset + 5) & 0x7f) << 14) |
                        ((view.getUint8(offset + 6) & 0x7f) << 7) |
                        (view.getUint8(offset + 7) & 0x7f);
          } else {
            frameSize = (view.getUint8(offset + 4) << 24) |
                        (view.getUint8(offset + 5) << 16) |
                        (view.getUint8(offset + 6) << 8) |
                        view.getUint8(offset + 7);
          }

          if (frameSize <= 0 || offset + 10 + frameSize > end) break;

          // TIT2 = Title
          if (frameID === "TIT2") {
            var dataStart = offset + 10;
            var encoding = view.getUint8(dataStart);
            var bytes = new Uint8Array(buf, dataStart + 1, frameSize - 1);
            var title = decodeText(bytes, encoding);
            callback(title);
            return;
          }

          offset += 10 + frameSize;
        }

        callback(null);
      } catch (err) {
        callback(null);
      }
    };

    xhr.onerror = function () { callback(null); };
    xhr.send();
  }

  /* 按 ID3 编码方式解码文本 */
  function decodeText(bytes, encoding) {
    var text;
    if (encoding === 0) {
      // ISO-8859-1
      text = "";
      for (var i = 0; i < bytes.length; i++) {
        text += String.fromCharCode(bytes[i]);
      }
      try { text = decodeURIComponent(escape(text)); } catch (e) {}
    } else if (encoding === 1) {
      // UTF-16 with BOM
      var le = bytes[0] === 0xFF && bytes[1] === 0xFE;
      text = "";
      for (var j = 2; j < bytes.length; j += 2) {
        var code = le
          ? bytes[j] | (bytes[j + 1] << 8)
          : (bytes[j] << 8) | bytes[j + 1];
        text += String.fromCharCode(code);
      }
    } else if (encoding === 2) {
      // UTF-16BE（无 BOM）
      text = "";
      for (var k = 0; k < bytes.length; k += 2) {
        text += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]);
      }
    } else {
      // UTF-8
      text = new TextDecoder("utf-8").decode(bytes);
    }
    return text.replace(/\0/g, "").trim();
  }

  /* ---------- 探测音乐文件 ---------- */
  function probe(i, done) {
    if (i > MAX_TRACKS) { done(); return; }
    var url = PREFIX + pad(i) + EXT;
    var test = new Audio();
    test.preload = "metadata";
    var settled = false;

    function ok() {
      if (settled) return; settled = true;

      var fallbackName = TITLES[i] || ("bgm" + pad(i));

      if (USE_ID3) {
        readID3Title(url, function (id3Title) {
          tracks.push({
            url: url,
            name: id3Title || fallbackName
          });
          probe(i + 1, done);
        });
      } else {
        tracks.push({ url: url, name: fallbackName });
        probe(i + 1, done);
      }
    }
    function fail() {
      if (settled) return; settled = true;
      probe(i + 1, done);
    }

    test.addEventListener("loadedmetadata", ok);
    test.addEventListener("error", fail);
    setTimeout(function () { if (!settled) fail(); }, 3000);
    test.src = url;
  }

  /* ---------- 载入某首 ---------- */
  function load(i) {
    if (!tracks.length) return;
    index = (i + tracks.length) % tracks.length;
    var t = tracks[index];
    audio.src = t.url;
    titleEl.textContent = t.name;
    fill.style.width = "0%";
    curEl.textContent = "0:00";
    durEl.textContent = "0:00";
  }

  /* ---------- 播放控制 ---------- */
  function play() {
    if (!ready) return;
    audio.play().catch(function () {});
  }
  function pause() { audio.pause(); }
  function toggle() { if (audio.paused) play(); else pause(); }

  function next() {
    if (!ready) return;
    var wasPlaying = !audio.paused;
    load(index + 1);
    if (wasPlaying) play();
  }
  function prev() {
    if (!ready) return;
    var wasPlaying = !audio.paused;
    load(index - 1);
    if (wasPlaying) play();
  }

  /* ---------- 事件绑定 ---------- */
  playBtn.addEventListener("click", toggle);

  audio.addEventListener("play", function () { setIcon(true); });
  audio.addEventListener("pause", function () { setIcon(false); });

  audio.addEventListener("loadedmetadata", function () {
    durEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener("timeupdate", function () {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    fill.style.width = pct + "%";
    curEl.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener("ended", next);

  bar.addEventListener("click", function (e) {
    if (!audio.duration) return;
    var rect = bar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    audio.currentTime = ratio * audio.duration;
  });

  volBar.addEventListener("click", function (e) {
    var rect = volBar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    audio.volume = ratio;
    volFill.style.width = (ratio * 100) + "%";
  });
  audio.volume = 0.7;

  /* ---------- 快捷键 ---------- */
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

    var key = e.key;
    var code = e.code;

    if (key === " " || code === "Space") {
      e.preventDefault();
      toggle();
    } else if (code === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (code === "ArrowRight") {
      e.preventDefault();
      next();
    }
  });

  /* ---------- 启动探测 ---------- */
  titleEl.textContent = "正在检测音乐…";
  probe(1, function () {
    if (tracks.length) {
      ready = true;
      load(0);
      setIcon(false);

      function autoStart(e) {
        if (e && e.type === "keydown" && (e.key === " " || e.code === "Space")) return;
        play();
        document.removeEventListener("click", autoStart);
        document.removeEventListener("keydown", autoStart);
        document.removeEventListener("touchstart", autoStart);
        document.removeEventListener("scroll", autoStart);
        window.removeEventListener("wheel", autoStart);
      }
      document.addEventListener("click", autoStart);
      document.addEventListener("keydown", autoStart);
      document.addEventListener("touchstart", autoStart);
      document.addEventListener("scroll", autoStart);
      window.addEventListener("wheel", autoStart);

    } else {
      titleEl.textContent = "未找到音乐（music/bgm01.mp3 …）";
      playBtn.style.opacity = "0.5";
      playBtn.style.cursor = "default";
    }
  });
})();