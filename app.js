/* ============================================================
   Sleep Sync — App Logic
   requirements.md / design-rules.md に完全準拠
   ============================================================ */

'use strict';

// ============================================================
// 🔧 Firebase設定（初回のみ変更が必要）
// Firebase Console > プロジェクト設定 > マイアプリ > Firebase SDK 設定
// にある値をここにコピー&ペーストしてください。
// ============================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCBAZ1iUYiqUe-_W9ar6KEjAw9F1kZ0u2w",
    authDomain: "sleep-sync-18b36.firebaseapp.com",
    databaseURL: "https://sleep-sync-18b36-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sleep-sync-18b36",
    storageBucket: "sleep-sync-18b36.firebasestorage.app",
    messagingSenderId: "994531492392",
    appId: "1:994531492392:web:dae9f8cd4e895566786b1d"
};

// 夫婦固定ルームID（変更不要）
const ROOM_ID = 'mizuno-house';

// Firebase が設定済みかチェック
const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';

// ============================================================
// 定数
// ============================================================
const DETOX_MESSAGES = [
    "2時間前に画面を閉じると、睡眠中に脳の老廃物を洗い流す機能が最大化されます。",
    "医学的に2時間のデジタル断食は、翌日の判断スピードとIQを劇的に高めることが示唆されています。",
    "就寝2時間前のブルーライトカットは、脂肪蓄積を招くコルチゾールの分泌を抑え、「痩せ体質」へのスイッチを入れます。",
    "就寝2時間前のブルーライトカットは、翌日の満腹ホルモンレプチンを増やし、空腹ホルモングレリンを抑えます。",
    "就寝2時間前のブルーライトオフは、酷使した目のピント調節機能を本来の柔軟性へと回復させ、翌朝の視界をクリアにします。",
    "画面を見ない2時間は、自分自身と向き合う「脳の余白」を生み出します。",
    "就寝2時間前の光カットはメラトニン分泌を最大化し、朝まで途切れない「完全な休息」を叶えます。",
    "就寝1時間前の画面視聴は、脳の誤認による深刻な寝つきの遅れと翌朝の深刻なダルさを招くリスクがあります。",
    "1時間のクールダウンがないと、脳は興奮したまま「浅い眠り」を繰り返すことになります。",
    "就寝1時間前の光刺激は、体内時計を強引に後ろへずらしてしまいます。",
    "就寝1時間前以降のブルーライトは、角膜や視神経に過剰なストレスを与え続けます。",
    "就寝1時間前の光は睡眠を断片化させ、夜中に何度も目が覚める原因になります。",
    "就寝1時間前を過ぎたデジタル利用は、翌日の注意力を20%低下させるという医学的データもあります。",
    "1時間前を切ってブルーライトを浴びると、翌日の高カロリー欲求が25%以上も高まるというデータがあります。"
];

const MSG_ONTIME = [
    "おつかれさま！✨",
    "いいペースだね！",
    "完璧なタイミング！",
    "さすが！🌙"
];

const MSG_LATE = [
    "遅かったけど、おつかれ！",
    "よくがんばったね！",
    "完了できたこと、えらい！",
    "一歩一歩、ね。🌸"
];

const MSG_BODY_ONTIME = [
    "今日も丁寧に過ごせたね。",
    "このままのペースで！",
    "身体が喜んでいます。",
    "習慣、しっかり身についてるよ。"
];

const MSG_BODY_LATE = [
    "完了できれば十分。無理しないで。",
    "明日は少し早めにできるといいね。",
    "一歩踏み出せたことが大事！",
    "毎日続けることが力になるよ。"
];

// ============================================================
// アプリ状態
// ============================================================
let state = {
    role: 'user',          // 'user' | 'partner'
    profile: null,         // { name, icon, sleepGoal }
    schedule: null,        // { date, wakeTime, bedTime, detoxTime, tasks }
    partnerData: null,     // Firebaseから取得したパートナーのデータ
    goodnightMode: false,
    countdownInterval: null,
    firebaseDb: null
};

// ============================================================
// LocalStorage ヘルパー
// ============================================================
const LS_PROFILE = 'ss_profile';
const LS_SCHEDULE = 'ss_schedule';
const LS_GOODNIGHT = 'ss_goodnight';

function saveProfile(p) { localStorage.setItem(LS_PROFILE, JSON.stringify(p)); }
function loadProfile() { try { return JSON.parse(localStorage.getItem(LS_PROFILE)); } catch (e) { return null; } }
function saveSchedule(s) { localStorage.setItem(LS_SCHEDULE, JSON.stringify(s)); }
function loadSchedule() { try { return JSON.parse(localStorage.getItem(LS_SCHEDULE)); } catch (e) { return null; } }
function clearSchedule() { localStorage.removeItem(LS_SCHEDULE); localStorage.removeItem(LS_GOODNIGHT); }
function saveGoodnight(v) { localStorage.setItem(LS_GOODNIGHT, v ? '1' : '0'); }
function loadGoodnight() { return localStorage.getItem(LS_GOODNIGHT) === '1'; }

// ============================================================
// 時刻ユーティリティ
// ============================================================
/** 'HH:MM' → 分数 */
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

/**
 * 夜間対応分数（深夜0〜5時台 = 翌日扱いで+1440）
 * タイムライン上で 23:00 → 00:00 → 01:00 の順に並べるために使用
 */
function nightAwareMinutes(hhmm) {
    const min = timeToMinutes(hhmm);
    return min < 360 ? min + 1440 : min; // 6:00未満は翌日
}

/** 分数 → 'HH:MM' */
function minutesToTime(min) {
    const h = Math.floor(((min % 1440) + 1440) % 1440 / 60);
    const m = ((min % 1440) + 1440) % 1440 % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 現在時刻を 'HH:MM' で返す */
function nowHHMM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

/** YYYY-MM-DD */
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

/** 今日の日本語日付 */
function todayJP() {
    return new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

/** 差分を分で返す（現在 - targetTime） */
function minutesUntil(targetHHMM) {
    const nowMin = timeToMinutes(nowHHMM());
    const targetMin = timeToMinutes(targetHHMM);
    let diff = targetMin - nowMin;
    // 深夜をまたぐ場合
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff; // 正=未来, 負=過去
}

// ============================================================
// タスク生成（就寝時刻からの逆算）
// ============================================================
function generateTasks(bedTime, detoxTime) {
    const bedMin = timeToMinutes(bedTime);
    const detoxMin = timeToMinutes(detoxTime);

    return [
        {
            id: 'detox',
            name: 'デジタルデトックス',
            time: minutesToTime(detoxMin),
            offsetMin: detoxMin - bedMin,
            completed: false,
            completedAt: null
        },
        {
            id: 'bath-prep',
            name: 'お風呂を入れる',
            time: minutesToTime(bedMin - 105),
            offsetMin: -105,
            completed: false,
            completedAt: null
        },
        {
            id: 'bath',
            name: 'お風呂に入る',
            time: minutesToTime(bedMin - 90),
            offsetMin: -90,
            completed: false,
            completedAt: null
        },
        {
            id: 'sleep',
            name: '就寝',
            time: bedTime,
            offsetMin: 0,
            completed: false,
            completedAt: null
        }
    ].sort((a, b) => nightAwareMinutes(a.time) - nightAwareMinutes(b.time));
}

/** タスクのステータス算出 */
function getStatus(task, tasks) {
    if (task.completed) return 'completed';
    const remaining = minutesUntil(task.time);
    if (remaining < 0) return 'overdue';
    // 未完了の中で最も早いものが 'next'
    const incomplete = tasks.filter(t => !t.completed);
    if (incomplete.length && incomplete[0].id === task.id) return 'next';
    return 'pending';
}

// ============================================================
// Firebase 初期化 & 同期
// ============================================================
function initFirebase() {
    if (!FIREBASE_READY) {
        console.warn('[SleepSync] Firebase未設定のため、パートナー同期は無効です。app.js の FIREBASE_CONFIG を設定してください。');
        return;
    }
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        state.firebaseDb = firebase.database();
        listenPartner();
        console.log('[SleepSync] Firebase接続成功');
    } catch (e) {
        console.error('[SleepSync] Firebase初期化エラー:', e);
    }
}

/** 自分のデータを Firebase に書き込む */
function pushMyData() {
    if (!state.firebaseDb || !state.profile || !state.schedule) return;
    const myPath = `rooms/${ROOM_ID}/${state.role}`;
    state.firebaseDb.ref(myPath).set({
        profile: state.profile,
        schedule: state.schedule,
        updatedAt: Date.now()
    }).catch(e => console.error('[SleepSync] Firebase書き込みエラー:', e));
}

/** パートナーのデータをリアルタイムで購読 */
function listenPartner() {
    if (!state.firebaseDb) return;
    const partnerRole = state.role === 'user' ? 'partner' : 'user';
    state.firebaseDb.ref(`rooms/${ROOM_ID}/${partnerRole}`).on('value', snapshot => {
        const data = snapshot.val();
        state.partnerData = data;
        // タイムライン表示中なら即座に再描画
        if (document.getElementById('screen-timeline').classList.contains('active')) {
            renderTimeline();
        }
    });
}

// ============================================================
// 画面ナビゲーション
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    // Lucide アイコン再レンダリング
    if (window.lucide) lucide.createIcons();
}

// ============================================================
// 背景の星屑を生成
// ============================================================
function generateStars() {
    const container = document.getElementById('stars-container');
    const count = 40;
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 5 + 1;
        star.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      top:  ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      filter: blur(${Math.random() * 1}px);
      --tw-from: ${(0.3 + Math.random() * 0.2).toFixed(2)};
      --tw-to:   ${(0.5 + Math.random() * 0.3).toFixed(2)};
      --tw-dur:  ${(2 + Math.random() * 4).toFixed(1)}s;
      animation-delay: ${(Math.random() * 4).toFixed(1)}s;
    `;
        container.appendChild(star);
    }
}

// ============================================================
// オンボーディング画面
// ============================================================
function initOnboarding() {
    const profile = loadProfile();
    if (profile) {
        state.role = profile.role || 'user';
        state.profile = profile;
    }

    // ロール選択
    document.getElementById('role-selector').addEventListener('click', e => {
        const btn = e.target.closest('[data-role]');
        if (!btn) return;
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.role = btn.dataset.role;
    });

    // アイコン選択
    document.getElementById('icon-grid').addEventListener('click', e => {
        const btn = e.target.closest('[data-icon]');
        if (!btn) return;
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });

    // スリープゴール表示（30分刻み対応）
    const rangeEl = document.getElementById('sleep-goal');
    const dispEl = document.getElementById('sleep-goal-display');
    function formatSleepGoal(val) {
        const h = Math.floor(val);
        const m = Math.round((val % 1) * 60);
        return m > 0 ? `${h}時間${m}分` : `${h}時間`;
    }
    rangeEl.addEventListener('input', () => { dispEl.textContent = formatSleepGoal(parseFloat(rangeEl.value)); });

    // 保存済みプロフィールをフォームに反映
    if (profile) {
        document.getElementById('input-name').value = profile.name || '';
        dispEl.textContent = formatSleepGoal(parseFloat(profile.sleepGoal || 7));
        rangeEl.value = profile.sleepGoal || 7;
        const roleBtn = document.querySelector(`[data-role="${profile.role || 'user'}"]`);
        if (roleBtn) {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            roleBtn.classList.add('active');
        }
        const iconBtn = document.querySelector(`[data-icon="${profile.icon || '🌙'}"]`);
        if (iconBtn) {
            document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
            iconBtn.classList.add('active');
        }
    }

    document.getElementById('btn-onboarding-next').addEventListener('click', () => {
        const name = document.getElementById('input-name').value.trim();
        if (!name) {
            document.getElementById('input-name').focus();
            return;
        }
        const icon = document.querySelector('.icon-btn.active')?.dataset.icon || '🌙';
        const sleepGoal = parseFloat(document.getElementById('sleep-goal').value);
        state.profile = { name, icon, sleepGoal, role: state.role };
        saveProfile(state.profile);
        if (state._editingProfile) {
            // 編集モード：タイムラインに直接戻る
            state._editingProfile = false;
            initTimeline();
            showScreen('timeline');
            startCountdown();
        } else {
            // 初回登録：スケジュール設定へ
            initScheduleSetup();
            initDetoxSetup();
            showScreen('schedule');
        }
    });
}

// ============================================================
// スケジュール設定画面
// ============================================================
function initScheduleSetup() {
    const wakeInput = document.getElementById('input-wake');
    const bedInput = document.getElementById('input-bed');
    const durDisplay = document.getElementById('sleep-duration-val');

    /** 合計睡眠時間をリアルタイム更新 */
    function updateDuration() {
        const wake = wakeInput.value;
        const bed = bedInput.value;
        if (!wake || !bed) { durDisplay.textContent = '--'; return; }
        // 深夜またぎを考慮：wakeTime > bedTime なら同日、そうでなければ翌朝扱い
        let wakeMin = timeToMinutes(wake);
        let bedMin = timeToMinutes(bed);
        let dur = wakeMin - bedMin;
        if (dur <= 0) dur += 1440; // 就寝が深夜 → 翌朝起床
        const h = Math.floor(dur / 60);
        const m = dur % 60;
        durDisplay.textContent = m > 0 ? `${h}時間${m}分` : `${h}時間`;
    }

    /** 起床時刻から目標睡眠時間で就寝時刻を自動計算 */
    function autoCalcBedTime() {
        const wake = wakeInput.value;
        if (!wake) return;
        const sleepGoal = state.profile?.sleepGoal || 7;
        const wakeMin = timeToMinutes(wake);
        const bedMin = ((wakeMin - sleepGoal * 60) + 1440) % 1440;
        // 5分刻みに丸める
        const rounded = Math.round(bedMin / 5) * 5 % 1440;
        bedInput.value = minutesToTime(rounded);
        updateDuration();
    }

    wakeInput.addEventListener('change', autoCalcBedTime);
    bedInput.addEventListener('change', updateDuration);

    // 画面表示時に既存値で初期化
    autoCalcBedTime();

    document.getElementById('btn-schedule-next').onclick = () => {
        const wakeTime = wakeInput.value;
        const bedTime = bedInput.value;
        if (!wakeTime || !bedTime) return;
        state._wakeTime = wakeTime;
        state._bedTime = bedTime;
        updateDetoxPreview();
        const msg = DETOX_MESSAGES[Math.floor(Math.random() * DETOX_MESSAGES.length)];
        document.getElementById('detox-message-text').textContent = msg;
        showScreen('detox');
    };
}

// デトックススライダープレビューを更新
function updateDetoxPreview() {
    const slider = document.getElementById('slider-detox');
    const valEl = document.getElementById('detox-offset-val');
    const previewEl = document.getElementById('detox-time-preview');
    if (!slider || !valEl || !previewEl) return;
    const offsetMin = parseInt(slider.value);
    valEl.textContent = offsetMin;
    const bedMin = timeToMinutes(state._bedTime || '23:00');
    previewEl.textContent = minutesToTime(bedMin - offsetMin);
}

// ============================================================
// デジタルデトックス設定画面
// ============================================================
function initDetoxSetup() {
    const slider = document.getElementById('slider-detox');
    if (slider) {
        slider.addEventListener('input', updateDetoxPreview);
    }
    updateDetoxPreview();

    document.getElementById('btn-detox-next').onclick = () => {
        const offsetMin = parseInt(document.getElementById('slider-detox').value || '120');
        const detoxTime = minutesToTime(timeToMinutes(state._bedTime) - offsetMin);
        const tasks = generateTasks(state._bedTime, detoxTime);
        state.schedule = {
            date: todayStr(),
            wakeTime: state._wakeTime,
            bedTime: state._bedTime,
            detoxTime: detoxTime,
            detoxOffsetMin: offsetMin,
            tasks: tasks
        };
        saveSchedule(state.schedule);
        saveGoodnight(false);
        state.goodnightMode = false;
        pushMyData();
        initTimeline();
        showScreen('timeline');
        startCountdown();
        requestNotifPermission();
    };
}

// ============================================================
// タイムライン画面
// ============================================================
function initTimeline() {
    document.getElementById('app-date').textContent = todayJP();

    const p = state.profile;
    const s = state.schedule;
    document.getElementById('my-label').textContent = p ? p.name : '私';
    document.getElementById('my-bed-time').textContent = s ? s.bedTime : '--:--';

    // 設定ボタン（スケジュール再設定）
    document.getElementById('btn-settings').onclick = () => {
        initScheduleSetup();
        showScreen('schedule');
        stopCountdown();
    };

    // プロフィール編集ボタン
    document.getElementById('btn-profile-edit').onclick = () => {
        state._editingProfile = true;
        initOnboarding();
        showScreen('onboarding');
        stopCountdown();
    };

    // タスク編集ボタン
    document.getElementById('btn-task-edit').onclick = () => {
        initTaskSettings();
        showScreen('tasks');
        stopCountdown();
    };

    renderTimeline();
}

function renderTimeline() {
    const s = state.schedule;
    if (!s) return;

    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    const myTasks = s.tasks;
    const partnerSched = state.partnerData?.schedule;
    const partnerProf = state.partnerData?.profile;

    // パートナーラベル・時刻更新
    document.getElementById('partner-label').textContent = partnerProf ? partnerProf.name : 'パートナー';
    document.getElementById('partner-bed-time').textContent = partnerSched ? partnerSched.bedTime : '--:--';

    // タスクリストをIDでマッピング
    const partnerTaskMap = {};
    if (partnerSched?.tasks) {
        partnerSched.tasks.forEach(t => { partnerTaskMap[t.id] = t; });
    }

    // すべてのタスクIDを時刻順にユニーク化
    const allIds = Array.from(new Set([
        ...myTasks.map(t => t.id),
        ...Object.keys(partnerTaskMap)
    ]));

    // 夜間対応ソート（深夜0〜5時台は翌日として扱い、23:00→00:00→01:00 の順に並ぶ）
    const sortedIds = allIds.sort((a, b) => {
        const getMin = id => {
            const mine = myTasks.find(t => t.id === id);
            const theirs = partnerTaskMap[id];
            return nightAwareMinutes((mine || theirs).time);
        };
        return getMin(a) - getMin(b);
    });

    // ドットのステータスも同様に「最初の未完了」判定を夜間対応で
    // getStatus の 'next' 判定は incomplete[0] を使うため，tasks も night-aware でソート済みが前提
    state.schedule.tasks.sort((a, b) => nightAwareMinutes(a.time) - nightAwareMinutes(b.time));

    // タイムライン先頭スペーサー
    container.appendChild(makeSpacerRow());

    sortedIds.forEach(id => {
        const myTask = myTasks.find(t => t.id === id) || null;
        const partnerTask = partnerTaskMap[id] || null;
        container.appendChild(makeTaskRow(myTask, partnerTask));
    });

    // タイムライン末尾スペーサー
    container.appendChild(makeSpacerRow('bottom'));

    // Lucide再レンダリング
    if (window.lucide) lucide.createIcons();
}

/** 通常タスク行を生成 */
function makeTaskRow(myTask, partnerTask) {
    const row = document.createElement('div');
    row.className = 'tl-row';

    // 表示用時刻（自分のタスクがあればそれを使う）
    const displayTime = (myTask || partnerTask).time;

    // 自分のタスク（左）
    const myStatus = myTask ? getStatus(myTask, state.schedule.tasks) : null;
    const leftDiv = document.createElement('div');
    leftDiv.className = 'tl-side left';
    if (myTask) {
        leftDiv.appendChild(makeTaskCard(myTask, myStatus, false));
    }

    // 中央（ドット + 時刻）
    const centerDiv = document.createElement('div');
    centerDiv.className = 'tl-center';

    const dot = document.createElement('div');
    dot.className = `tl-dot dot-${myStatus || 'pending'}`;
    centerDiv.appendChild(dot);

    const timeLabel = document.createElement('span');
    timeLabel.className = 'tl-time';
    timeLabel.textContent = displayTime;
    centerDiv.appendChild(timeLabel);

    // パートナーのタスク（右）
    const rightDiv = document.createElement('div');
    rightDiv.className = 'tl-side right';
    if (partnerTask) {
        const pStatus = partnerTask.completed ? 'completed' : 'pending';
        rightDiv.appendChild(makeTaskCard(partnerTask, pStatus, true));
    } else if (!state.partnerData) {
        // パートナー未接続
        const waiting = document.createElement('div');
        waiting.className = 'partner-waiting';
        waiting.textContent = '待機中…';
        rightDiv.appendChild(waiting);
    }

    row.appendChild(leftDiv);
    row.appendChild(centerDiv);
    row.appendChild(rightDiv);
    return row;
}

/** タスクカードを生成 */
function makeTaskCard(task, status, isPartner) {
    const card = document.createElement('div');
    card.className = `task-card status-${status}`;
    card.dataset.taskId = task.id;

    const inner = document.createElement('div');
    inner.className = 'task-card-inner';

    const textWrap = document.createElement('div');
    textWrap.style.flex = '1';

    const nameEl = document.createElement('div');
    nameEl.className = 'task-name';
    nameEl.textContent = task.name;
    textWrap.appendChild(nameEl);

    const timeEl = document.createElement('div');
    timeEl.className = 'task-time-label';
    timeEl.textContent = task.time;
    textWrap.appendChild(timeEl);

    // カウントダウン（自分のnext/overdueのみ）
    if (!isPartner && (status === 'next' || status === 'overdue')) {
        const badge = document.createElement('div');
        badge.className = 'countdown-badge' + (status === 'overdue' ? ' overdue' : '');
        badge.id = `countdown-${task.id}`;
        badge.textContent = formatCountdown(minutesUntil(task.time));
        textWrap.appendChild(badge);
    }

    inner.appendChild(textWrap);

    // チェックボタン（自分のタスクのみ）
    if (!isPartner) {
        const checkBtn = document.createElement('button');
        checkBtn.className = 'task-check-btn' + (task.completed ? ' checked' : '');
        checkBtn.setAttribute('aria-label', task.completed ? '完了済み' : 'チェック');
        checkBtn.innerHTML = task.completed
            ? '<i data-lucide="check" width="10" height="10"></i>'
            : '';
        if (!task.completed) {
            checkBtn.addEventListener('click', e => {
                e.stopPropagation();
                completeTask(task.id);
            });
        }
        inner.appendChild(checkBtn);
    }

    card.appendChild(inner);
    return card;
}

/** デジタルデトックスバナー行 */
function makeDetoxRow(myTask, partnerTask) {
    const row = document.createElement('div');
    row.className = 'tl-row detox-row';

    const myStatus = myTask ? getStatus(myTask, state.schedule.tasks) : null;

    const banner = document.createElement('div');
    banner.className = 'detox-banner';

    const titleEl = document.createElement('div');
    titleEl.className = 'detox-banner-title';
    titleEl.innerHTML = `<i data-lucide="smartphone-off" width="14" height="14"></i> デジタルデトックス`;

    const subEl = document.createElement('div');
    subEl.className = 'detox-banner-sub';
    const time = (myTask || partnerTask)?.time || '';
    subEl.textContent = `${time} 〜 画面を閉じましょう`;

    banner.appendChild(titleEl);
    banner.appendChild(subEl);

    // 自分がまだ完了していなければチェックボタンを表示
    if (myTask && !myTask.completed) {
        const checkBtn = document.createElement('button');
        checkBtn.style.cssText = `
      margin-top: 4px;
      background: rgba(99,102,241,0.2);
      color: #c7d2fe;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 9999px;
      padding: 6px 16px;
      font-size: 12px;
      cursor: pointer;
    `;
        checkBtn.textContent = 'はい、閉じました！';
        checkBtn.addEventListener('click', () => completeTask('detox'));
        banner.appendChild(checkBtn);
    } else if (myTask?.completed) {
        const doneEl = document.createElement('div');
        doneEl.style.cssText = 'font-size:11px; color: #818cf8; margin-top:4px;';
        doneEl.textContent = '✔ 完了';
        banner.appendChild(doneEl);
    }

    row.appendChild(banner);
    return row;
}

/** スペーサー行 */
function makeSpacerRow(pos) {
    const row = document.createElement('div');
    row.className = 'tl-spacer';
    const line = document.createElement('div');
    line.className = 'tl-spacer-line';
    row.appendChild(line);
    return row;
}

// ============================================================
// カウントダウン文字列のフォーマット
// ============================================================
function formatCountdown(minutesLeft) {
    if (minutesLeft < 0) {
        const over = Math.abs(Math.ceil(minutesLeft));
        if (over < 60) return `${over}分超過`;
        return `${Math.floor(over / 60)}時間${over % 60}分超過`;
    }
    if (minutesLeft < 60) return `あと ${Math.ceil(minutesLeft)} 分`;
    const h = Math.floor(minutesLeft / 60);
    const m = Math.ceil(minutesLeft % 60);
    return `あと ${h} 時間${m > 0 ? ` ${m} 分` : ''}`;
}

// ============================================================
// カウントダウン更新（1分ごと）
// ============================================================
function startCountdown() {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    state.countdownInterval = setInterval(() => {
        updateCountdownBadges();
        checkNotifications();
        checkDailyReset();
    }, 30000); // 30秒ごと（より滑らかに）
    // 即時実行
    updateCountdownBadges();
}

function stopCountdown() {
    if (state.countdownInterval) {
        clearInterval(state.countdownInterval);
        state.countdownInterval = null;
    }
}

function updateCountdownBadges() {
    if (!state.schedule) return;
    state.schedule.tasks.forEach(task => {
        const badge = document.getElementById(`countdown-${task.id}`);
        if (!badge) return;
        const left = minutesUntil(task.time);
        badge.textContent = formatCountdown(left);
        if (left < 0) {
            badge.classList.add('overdue');
        } else {
            badge.classList.remove('overdue');
        }
    });
}

// ============================================================
// タスク完了処理
// ============================================================
function completeTask(taskId) {
    if (!state.schedule) return;
    const task = state.schedule.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    const left = minutesUntil(task.time);
    const onTime = left >= -5; // 5分以内の遅れはOK扱い

    task.completed = true;
    task.completedAt = new Date().toISOString();

    saveSchedule(state.schedule);
    pushMyData();

    // ねぎらいトースト
    const titleArr = onTime ? MSG_ONTIME : MSG_LATE;
    const bodyArr = onTime ? MSG_BODY_ONTIME : MSG_BODY_LATE;
    const title = titleArr[Math.floor(Math.random() * titleArr.length)];
    const body = bodyArr[Math.floor(Math.random() * bodyArr.length)];
    showToast(title, body);

    // 就寝タスク完了 → おやすみモードへ
    if (taskId === 'sleep') {
        setTimeout(() => enterGoodnightMode(), 1500);
        return;
    }

    // タイムライン再描画
    renderTimeline();

    // 通知
    sendNotification(title, body);
}

// ============================================================
// おやすみモード
// ============================================================
function enterGoodnightMode() {
    state.goodnightMode = true;
    saveGoodnight(true);
    const wakeTime = state.schedule?.wakeTime || '--:--';
    document.getElementById('tomorrow-wake').textContent = wakeTime;
    stopCountdown();
    showScreen('goodnight');
    if (window.lucide) lucide.createIcons();
}

function initGoodnightScreen() {
    document.getElementById('btn-goodnight-back').addEventListener('click', () => {
        state.goodnightMode = false;
        saveGoodnight(false);
        initTimeline();
        showScreen('timeline');
        startCountdown();
    });
}

// ============================================================
// 日次リセット確認
// ============================================================
function checkDailyReset() {
    const sched = state.schedule;
    if (!sched) return;
    const today = todayStr();
    const nowMins = timeToMinutes(nowHHMM());
    const wakeMins = timeToMinutes(sched.wakeTime);
    // スケジュール設定日が昨日以前 && 現在時刻が起床時刻を過ぎた
    if (sched.date < today && nowMins >= wakeMins) {
        clearSchedule();
        state.schedule = null;
        state.goodnightMode = false;
        stopCountdown();
        initScheduleSetup();
        showScreen('schedule');
    }
}

// ============================================================
// 通知
// ============================================================
function requestNotifPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        try { new Notification(title, { body, icon: 'icons/icon-192.png' }); } catch (e) { }
    }
}

/** カウントダウン中に時間が来たら催促通知 */
function checkNotifications() {
    if (!state.schedule) return;
    state.schedule.tasks.forEach(task => {
        if (task.completed) return;
        const left = minutesUntil(task.time);
        // 時刻になった瞬間（-1〜1分）に一度だけ通知
        if (left >= -1 && left <= 1 && !task._notified) {
            task._notified = true;
            sendNotification(`⏰ ${task.name}の時間です`, `予定時刻: ${task.time}`);
            showToast(`⏰ ${task.name}の時間です！`, `忘れずに！`);
        }
    });
}

// ============================================================
// トースト通知
// ============================================================
let toastTimer = null;

function showToast(title, msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hideToast(), 4000);
}

function hideToast() {
    document.getElementById('toast').classList.remove('show');
}

// ============================================================
// 初期化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    generateStars();
    initFirebase();

    // トースト閉じるボタン
    document.getElementById('toast-close').addEventListener('click', hideToast);

    // おやすみ画面の「戻る」ボタン
    initGoodnightScreen();

    // ─── 復元ロジック ───────────────────────────────────────
    const profile = loadProfile();
    const schedule = loadSchedule();
    const goodnight = loadGoodnight();

    if (!profile) {
        // 初回: オンボーディング
        initOnboarding();
        showScreen('onboarding');
        return;
    }

    state.profile = profile;
    state.role = profile.role || 'user';

    if (goodnight && schedule) {
        // おやすみモードを復元
        state.schedule = schedule;
        state.goodnightMode = true;
        document.getElementById('tomorrow-wake').textContent = schedule.wakeTime;
        showScreen('goodnight');
        checkDailyReset();
        return;
    }

    if (!schedule) {
        // スケジュール未設定: 今日の設定へ
        initScheduleSetup();
        initDetoxSetup();
        showScreen('schedule');
        return;
    }

    // スケジュールがある: 日次リセット確認後タイムラインへ
    state.schedule = schedule;

    // 日次リセット確認
    const today = todayStr();
    const nowMins = timeToMinutes(nowHHMM());
    const wakeMins = timeToMinutes(schedule.wakeTime);
    if (schedule.date < today && nowMins >= wakeMins) {
        clearSchedule();
        state.schedule = null;
        initScheduleSetup();
        initDetoxSetup();
        showScreen('schedule');
        return;
    }

    initScheduleSetup();
    initDetoxSetup();
    initTimeline();
    showScreen('timeline');
    startCountdown();

    // Lucide
    if (window.lucide) lucide.createIcons();
});

// ============================================================
// Service Worker 登録（PWA対応）
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('[SleepSync] SW登録完了:', reg.scope))
            .catch(err => console.warn('[SleepSync] SW登録失敗:', err));
    });
}

// ============================================================
// タスク編集画面
// ============================================================
function initTaskSettings() {
    if (!state.schedule) return;
    const bedMin = timeToMinutes(state.schedule.bedTime || '23:00');
    renderTaskEditList(state.schedule.tasks, bedMin);

    document.getElementById('btn-add-task').onclick = () => {
        const newId = 'custom-' + Date.now();
        const newTask = {
            id: newId,
            name: '新しいタスク',
            time: minutesToTime(bedMin - 60),
            offsetMin: -60,
            completed: false,
            completedAt: null
        };
        state.schedule.tasks.push(newTask);
        state.schedule.tasks.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        renderTaskEditList(state.schedule.tasks, bedMin);
    };

    document.getElementById('btn-tasks-done').onclick = () => {
        const cards = document.querySelectorAll('.task-edit-card[data-task-id]');
        cards.forEach(card => {
            const taskId = card.dataset.taskId;
            const task = state.schedule.tasks.find(t => t.id === taskId);
            if (!task) return;
            const nameInput = card.querySelector('.task-edit-name');
            const valEl = card.querySelector('.task-minutes-val');
            if (nameInput && nameInput.value.trim()) task.name = nameInput.value.trim();
            if (valEl) {
                const offset = parseInt(valEl.dataset.offset);
                task.time = minutesToTime(bedMin - offset);
                task.offsetMin = -offset;
            }
        });
        state.schedule.tasks.sort((a, b) => nightAwareMinutes(a.time) - nightAwareMinutes(b.time));
        saveSchedule(state.schedule);
        pushMyData();
        initTimeline();
        showScreen('timeline');
        startCountdown();
    };
}

function renderTaskEditList(tasks, bedMin) {
    const listEl = document.getElementById('task-edit-list');
    listEl.innerHTML = '';

    // 就寝タスクは編集リストから除外
    tasks.filter(t => t.id !== 'sleep').forEach(task => {
        const card = document.createElement('div');
        card.className = 'card task-edit-card';
        card.dataset.taskId = task.id;

        const offsetMin = Math.max(0, bedMin - nightAwareMinutes(task.time));

        // タスク名入力
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'task-edit-name';
        nameInput.value = task.name;
        card.appendChild(nameInput);

        // 「就寝X分前」ステッパー行
        const minutesRow = document.createElement('div');
        minutesRow.className = 'task-minutes-row';

        const prefixEl = document.createElement('span');
        prefixEl.className = 'task-offset-label';
        prefixEl.textContent = '就寝';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'task-step-btn';
        minusBtn.textContent = '−15';

        const valEl = document.createElement('span');
        valEl.className = 'task-minutes-val';
        valEl.dataset.offset = offsetMin;
        valEl.textContent = offsetMin;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'task-step-btn';
        plusBtn.textContent = '＋15';

        const suffixEl = document.createElement('span');
        suffixEl.className = 'task-offset-label';
        suffixEl.textContent = '分前';

        // ステッパーロジック
        function updateOffset(delta) {
            const current = parseInt(valEl.dataset.offset);
            const next = Math.max(0, Math.min(300, current + delta));
            valEl.dataset.offset = next;
            valEl.textContent = next;
        }
        minusBtn.addEventListener('click', () => updateOffset(-15));
        plusBtn.addEventListener('click', () => updateOffset(+15));

        minutesRow.appendChild(prefixEl);
        minutesRow.appendChild(minusBtn);
        minutesRow.appendChild(valEl);
        minutesRow.appendChild(plusBtn);
        minutesRow.appendChild(suffixEl);
        card.appendChild(minutesRow);

        // 削除ボタン（お風呂系は固定、それ以外は削除可）
        const isDeletable = !['bath-prep', 'bath'].includes(task.id);
        if (isDeletable) {
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-delete-task';
            delBtn.textContent = '削除';
            delBtn.addEventListener('click', () => {
                state.schedule.tasks = state.schedule.tasks.filter(t => t.id !== task.id);
                renderTaskEditList(state.schedule.tasks, bedMin);
            });
            card.appendChild(delBtn);
        }

        listEl.appendChild(card);
    });
}

