const MAX_ATTEMPTS = 3;

let startTime    = null;
let attemptCount = 0;
let times        = [];
let secretMode   = false;
let debugOpen    = false;

const screens = {
  title:     document.getElementById('screen-title'),
  challenge: document.getElementById('screen-challenge'),
  result:    document.getElementById('screen-result'),
  finish:    document.getElementById('screen-finish'),
};

const RANKS = [
  { maxDiff: 0.10,     key: 'perfect', label: '神業！',    message: 'ほぼ完璧！天才的な感覚です！',       src: 'public/rank_perfect.png' },
  { maxDiff: 0.50,     key: 'great',   label: 'すごい！',  message: '惜しい！もう少しで神業でした！',     src: 'public/rank_great.png'   },
  { maxDiff: 1.00,     key: 'good',    label: 'いいね！',  message: '良い感覚です。もう一回チャレンジ！', src: 'public/rank_good.png'    },
  { maxDiff: 2.00,     key: 'normal',  label: 'お惜しい！',message: 'もう少しです。集中してみよう！',     src: 'public/rank_normal.png'  },
  { maxDiff: Infinity, key: 'miss',    label: 'ドンマイ！',message: '10秒の感覚をつかんでリベンジ！',    src: 'public/rank_miss.png'    },
];

// ===== 画面切替 =====

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ===== ゲーム本体 =====

function startGame() {
  const stopImg = document.querySelector('#btn-stop img');
  stopImg.src = secretMode ? 'public/icon_aoyama.png' : 'public/btn_stop.png';
  startTime = performance.now();
  showScreen('challenge');
}

function stopGame() {
  if (startTime === null) return;
  const elapsed = (performance.now() - startTime) / 1000;
  startTime = null;
  attemptCount++;
  times.push(elapsed);

  if (attemptCount >= MAX_ATTEMPTS) {
    showScreen('finish');      // 先に画面を切り替えてから中身を描画
    renderFinish(times);
  } else {
    showScreen('result');
    renderResult(elapsed, attemptCount);
  }
}

function resetGame() {
  showScreen('title');
}

function finishGame() {
  attemptCount = 0;
  times = [];
  showScreen('title');
}

// ===== リザルト（1・2回目）=====

function renderResult(elapsed, count) {
  const diff = Math.abs(elapsed - 10);
  const rank = RANKS.find(r => diff <= r.maxDiff);

  document.getElementById('result-seconds').textContent = elapsed.toFixed(2);
  document.getElementById('result-message').textContent = rank.message;
  document.getElementById('attempt-count').textContent  = `${count} / ${MAX_ATTEMPTS} 回目`;

  const rankImg = document.getElementById('rank-img');
  rankImg.src = rank.src;
  rankImg.alt = rank.label;
  rankImg.style.animation = 'none';
  rankImg.offsetHeight;
  rankImg.style.animation = '';
}

// ===== おつかれ画面（3回目）=====

function renderFinish(resultTimes) {
  const labels  = ['finish-t1', 'finish-t2', 'finish-t3'];
  const diffs   = resultTimes.map(t => Math.abs(t - 10));
  const bestIdx = diffs.indexOf(Math.min(...diffs));

  labels.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = resultTimes[i] != null ? resultTimes[i].toFixed(2) + '秒' : '—';
    el.classList.toggle('finish-time-best', i === bestIdx);
  });

  generateQR(resultTimes);
}

function generateQR(resultTimes) {
  const container = document.getElementById('qr-container');
  if (!container) return;
  container.innerHTML = '';

  if (typeof QRCode === 'undefined') {
    console.warn('QRCode ライブラリ未読み込み');
    return;
  }

  // 現在のページ URL をベースに result.html へのリンクを生成
  const base = location.href.replace(/[^/]*(\?.*)?$/, '');
  const t1 = resultTimes[0]?.toFixed(2) ?? '0';
  const t2 = resultTimes[1]?.toFixed(2) ?? '0';
  const t3 = resultTimes[2]?.toFixed(2) ?? '0';
  const url = `${base}result.html?t1=${t1}&t2=${t2}&t3=${t3}`;

  const tempDiv = document.createElement('div');
  try {
    new QRCode(tempDiv, {
      text: url,
      width: 160,
      height: 160,
      colorDark: '#3a3a5c',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    console.warn('QRCode 生成失敗:', e);
    return;
  }

  setTimeout(() => {
    const canvas = tempDiv.querySelector('canvas');
    if (canvas) {
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.className = 'qr-img';
      container.appendChild(img);
    }
  }, 100);
}

// ===== 画像保存 =====

function saveResultImage() {
  if (typeof html2canvas === 'undefined') {
    alert('html2canvas ライブラリが読み込まれていません');
    return;
  }

  const btn = document.getElementById('btn-save');
  btn.style.display = 'none';

  const target = document.getElementById('finish-capture');
  html2canvas(target, {
    allowTaint:      true,
    useCORS:         false,
    backgroundColor: null,
    scale:           2,
    logging:         false,
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = '10sec_challenge_result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(e => {
    console.warn('画像保存失敗:', e);
  }).finally(() => {
    btn.style.display = '';
  });
}

// ===== デバッグ =====

function toggleDebug() {
  debugOpen = !debugOpen;
  document.getElementById('debug-panel').style.display = debugOpen ? 'flex' : 'none';
}

const DEBUG_SAMPLES = {
  perfect: { elapsed: 10.02, count: 1 },
  great:   { elapsed: 9.55,  count: 1 },
  good:    { elapsed: 9.10,  count: 1 },
  normal:  { elapsed: 8.20,  count: 1 },
  miss:    { elapsed: 6.80,  count: 1 },
};

function debugPreview(type) {
  const s = DEBUG_SAMPLES[type];
  showScreen('result');
  renderResult(s.elapsed, s.count);
}

function debugFinish() {
  showScreen('finish');
  renderFinish([10.02, 9.55, 8.20]);
}

function debugSave() {
  showScreen('finish');
  renderFinish([10.02, 9.55, 8.20]);
  setTimeout(() => saveResultImage(), 400);
}

// ===== メッセージ背景色切替 =====

function setMsgBg(color) {
  const el = document.querySelector('.finish-message');
  if (!el) return;
  el.classList.remove('finish-message--grey', 'finish-message--red');
  if (color === 'grey') el.classList.add('finish-message--grey');
  if (color === 'red')  el.classList.add('finish-message--red');
}

// ===== 裏技モード =====

function toggleSecret() {
  secretMode = !secretMode;
  const btn = document.getElementById('secret-btn');
  btn.textContent = secretMode ? 'ON' : 'OFF';
  btn.classList.toggle('debug-secret--on', secretMode);
}
