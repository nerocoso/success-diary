// 전역 변수
let diaries = JSON.parse(localStorage.getItem('diaries')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];
let currentDate = new Date();
let selectedDate = null;

// 로그인 관련 변수
const CORRECT_USERNAME = 'nerocoso';
const CORRECT_PASSWORD = 'nerogod';
let isLoggedIn = false; // 항상 로그인 화면부터 시작

// DOM 요소들
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 일지 관련 요소들
const addDiaryBtn = document.getElementById('addDiaryBtn');
const diaryForm = document.getElementById('diaryForm');
const cancelDiaryBtn = document.getElementById('cancelDiaryBtn');
const saveDiaryBtn = document.getElementById('saveDiaryBtn');
const diaryList = document.getElementById('diaryList');

// 목표 관련 요소들
const addGoalBtn = document.getElementById('addGoalBtn');
const goalForm = document.getElementById('goalForm');
const cancelGoalBtn = document.getElementById('cancelGoalBtn');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const goalsList = document.getElementById('goalsList');

// 통계 관련 요소들
const totalDiaries = document.getElementById('totalDiaries');
const totalGoals = document.getElementById('totalGoals');
const completedGoals = document.getElementById('completedGoals');
const currentStreak = document.getElementById('currentStreak');

// 달력 관련 요소들
const currentMonthEl = document.getElementById('currentMonth');
const currentYearEl = document.getElementById('currentYear');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

// 마우스 커서 관련 요소들 (제거됨)

// 테마 관련 요소들
const currentThemePreview = document.getElementById('currentThemePreview');
const currentThemeName = document.getElementById('currentThemeName');
let currentTheme = localStorage.getItem('selectedTheme') || 'pink-sky';

// 로그인 관련 요소들
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
// 허브/네로봇 화면 참조(전역)
const hubScreenEl = document.getElementById('hubScreen');
const neroBotAppEl = document.getElementById('neroBotApp');

// 네로봇 관련 요소들
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

// 대화 기록(경량) 저장/로드 유틸
function getNeroHistory() {
    try {
        return JSON.parse(localStorage.getItem('nero_history')) || [];
    } catch { return []; }
} // added closing bracket here

// 화면 전환: 'hub' | 'main' | 'nero'
function transitionTo(target) {
    if (target === 'hub') {
        if (hubScreenEl) hubScreenEl.style.display = 'flex';
        if (mainApp) mainApp.style.display = 'none';
        if (neroBotAppEl) neroBotAppEl.style.display = 'none';
    } else if (target === 'main') {
        if (hubScreenEl) hubScreenEl.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        if (neroBotAppEl) neroBotAppEl.style.display = 'none';
    } else if (target === 'nero') {
        if (hubScreenEl) hubScreenEl.style.display = 'none';
        if (mainApp) mainApp.style.display = 'none';
        if (neroBotAppEl) neroBotAppEl.style.display = 'flex';
    }
}

// 업데이트 배지: 최신 로그 표시
function getUpdateLogs() {
    try { return JSON.parse(localStorage.getItem('update_logs')) || []; } catch { return []; }
}
function addUpdateLog(message) {
    const logs = getUpdateLogs();
    logs.push({ t: Date.now(), message: String(message || '') });
    try { localStorage.setItem('update_logs', JSON.stringify(logs.slice(-50))); } catch {}
}
function formatTime(dt) {
    return new Date(dt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
function showUpdateBadgeIfAny() {
    const badge = document.getElementById('updateBadge');
    if (!badge) return;
    const logs = getUpdateLogs();
    if (!logs.length) {
        badge.style.display = 'none';
        return;
    }
    const latest = logs[logs.length - 1];
    const timeStr = new Date(latest.t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    badge.textContent = `${timeStr} 업데이트 로그가 있습니다.`;
    badge.style.display = 'block';
}
function saveNeroHistory(hist) {
    try { localStorage.setItem('nero_history', JSON.stringify(hist.slice(-10))); } catch {}
}
function pushNeroHistory(role, content) {
    const hist = getNeroHistory();
    hist.push({ t: Date.now(), role, content: String(content || '').slice(0, 2000) });
    saveNeroHistory(hist);
}

// 사용자 학습 규칙 저장/로드 (경량)
function getCustomRules() {
    try { return JSON.parse(localStorage.getItem('nero_custom_rules')) || []; } catch { return []; }
}
function saveCustomRules(rules) {
    try { localStorage.setItem('nero_custom_rules', JSON.stringify((rules || []).slice(-50))); } catch {}
}
function addCustomRule(pattern, response) {
    const rules = getCustomRules();
    rules.push({ pattern: String(pattern || '').slice(0, 200), response: String(response || '').slice(0, 2000) });
    saveCustomRules(rules);
    return rules.length;
}
function clearCustomRules() {
    saveCustomRules([]);
}

// 공용: 네로봇 응답 요청 함수 (일지 탭/네로봇 전용 페이지 공통)
// 기본값: 100% 무료 로컬 규칙 기반 어시스턴트(네트워크 호출 없음)
// 설정(localStorage.ai_provider === 'proxy') 시 프록시 URL(localStorage.ai_proxy_url)로 요청 가능
async function fetchNeroResponse(userMessage) {
    const provider = (localStorage.getItem('ai_provider') || 'local').toLowerCase();
    if (provider === 'proxy') {
        const proxyUrl = localStorage.getItem('ai_proxy_url');
        if (!proxyUrl) {
            return '[설정 필요] 프록시 URL이 설정되지 않았어요. localStorage.ai_proxy_url을 설정하거나, 로컬 모드(local)로 사용해 주세요.';
        }
        try {
            const resp = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: userMessage })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
            const text = data?.generated_text || data?.text || '';
            return text || '죄송해요, 답변을 생성하지 못했어요.';
        } catch (e) {
            return `프록시 통신 오류: ${e?.message || e}`;
        }
    }

    // provider === 'local' : 규칙 기반 응답 생성
    return generateLocalAssistantResponse(userMessage);
}

// 규칙 기반(로컬) 어시스턴트: 네트워크/키 없이 동작, 기존 데이터(diaries/goals)를 활용
function generateLocalAssistantResponse(userMessage) {
    const msg = (userMessage || '').trim();
    if (!msg) return '무엇을 도와드릴까요? 예: "오늘 일지 요약", "이번 주 목표 정리", "다음 할 일 추천"';

    // 간단 키워드 파싱
    const lower = msg.toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 랜덤 선택 유틸
    const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // 최근 히스토리(경량)
    const hist = getNeroHistory();

    // 사용자 학습 명령 파싱
    // 형식 예시:
    //  - "학습: 키워드=안녕, 응답=안녕하세요! 반가워요"
    //  - "teach: pattern=/헬프|help/i, reply=도움이 필요하신가요?"
    const teachMatch = msg.match(/^\s*(학습|teach)\s*:\s*(.+)$/i);
    if (teachMatch) {
        const rest = teachMatch[2];
        // key=value 쌍 파싱
        const kv = Object.fromEntries(
            rest.split(',').map(s => s.split('=').map(x => x.trim())).filter(a => a.length === 2)
        );
        const pattern = kv.pattern || kv.키워드 || kv.key || kv.keyword;
        const response = kv.reply || kv.응답 || kv.res || kv.response;
        if (!pattern || !response) {
            return '학습 형식: 학습: 키워드=<문구> , 응답=<답변>  또는  teach: pattern=/정규식/i , reply=답변';
        }
        const count = addCustomRule(pattern, response);
        return `학습 완료! 규칙 ${count}개 저장됨. (패턴: ${pattern})`;
    }

    // 학습 관리 명령
    if (/^\s*(학습목록|list\s*teach)/i.test(msg)) {
        const rules = getCustomRules();
        if (rules.length === 0) return '저장된 학습 규칙이 없습니다.';
        const lines = rules.slice(-10).map((r, i) => `${i + 1}. 패턴: ${r.pattern} → 응답: ${r.response.slice(0, 60)}${r.response.length>60?'…':''}`);
        return `최근 학습 규칙(최대 10개):\n${lines.join('\n')}`;
    }
    if (/^\s*(학습초기화|학습 초기화|clear\s*teach)/i.test(msg)) {
        clearCustomRules();
        return '모든 학습 규칙을 초기화했습니다.';
    }

    // 사용자 학습 규칙 매칭 (우선 적용)
    const rules = getCustomRules();
    for (const r of rules.slice().reverse()) { // 최신 규칙 우선
        try {
            const p = (r.pattern || '').trim();
            let matched = false;
            if (/^\/.+\/[a-z]*$/i.test(p)) {
                // /regex/flags 형식
                const lastSlash = p.lastIndexOf('/');
                const body = p.slice(1, lastSlash);
                const flags = p.slice(lastSlash + 1);
                const re = new RegExp(body, flags);
                matched = re.test(msg);
            } else {
                matched = msg.toLowerCase().includes(p.toLowerCase());
            }
            if (matched) {
                return r.response;
            }
        } catch {}
    }

    // 스몰토크 의도 처리
    const isGreeting = /(hello|hi|hey|안녕|하이|ㅎㅇ|안뇽)/i.test(msg);
    const isThanks   = /(thanks|thank|고마워|감사|땡큐)/i.test(msg);
    const isBye      = /(bye|goodbye|잘가|안녕히|ㅂㅇ)/i.test(msg);
    const isSorry    = /(sorry|미안|죄송)/i.test(msg);
    const askName    = /(너(는)? 누구|who are you|your name|이름)/i.test(msg);
    const askHelp    = /(도움|help|무엇|뭐(해)?|할 수)/i.test(msg);
    const askTime    = /(시간|time|몇시)/i.test(msg);
    const askDate    = /(날짜|date|며칠)/i.test(msg);

    if (isGreeting) {
        const hour = now.getHours();
        const part = hour < 5 ? '깊은 밤' : hour < 11 ? '아침' : hour < 14 ? '점심' : hour < 18 ? '오후' : '저녁';
        return rnd([
            `안녕하세요! ${part}엔 무엇을 도와드릴까요?`,
            `${part}이에요. 반가워요! 일지/목표/추천 중에서 무엇이 필요하신가요?`,
            `안녕! 오늘 기분은 어떠세요? 필요하시면 목표 현황을 요약해 드릴게요.`
        ]);
    }
    if (isThanks) {
        return rnd([
            '천만에요! 도움이 되었다니 기뻐요 🙌',
            '언제든지요! 다른 것도 필요하시면 말씀해 주세요 🙂',
            '별말씀을요! 오늘도 파이팅입니다 💪'
        ]);
    }
    if (isBye) {
        return rnd([
            '좋은 하루 되세요! 다음에 또 만나요 👋',
            '안녕히 가세요! 내일도 멋진 성과 기대할게요 ✨',
            '또 필요하시면 불러주세요. 바이!'
        ]);
    }
    if (isSorry) {
        return rnd([
            '괜찮아요! 함께 해결해봐요 🙂',
            '문제없습니다. 어디부터 도와드릴까요?',
            '사과하실 필요 없어요. 지금부터 차근히 해봐요!'
        ]);
    }
    if (askName) {
        return rnd([
            '저는 네로봇이에요. 성공일지와 목표 관리를 도와드려요 🤖',
            '네로봇입니다! 개발/목표/일지와 관련된 일을 빠르게 도와드릴게요.',
            '네로봇이라고 해요. 무엇이든 편하게 물어보세요!'
        ]);
    }
    if (askHelp) {
        return '제가 할 수 있는 일 예시: "최근 일지 요약", "목표 현황", "오늘 일지 생성", "다음 할 일 추천". 어떤 걸 도와드릴까요?';
    }
    if (askTime) {
        return `지금 시간은 ${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 입니다.`;
    }
    if (askDate) {
        return `오늘 날짜는 ${now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 입니다.`;
    }

    // 유틸: 최근 N개 일지/목표
    const recentDiaries = (diaries || []).slice(0, 5);
    const recentGoals = (goals || []).slice(0, 5);

    // 1) 일지 요약/생성 관련
    if (lower.includes('일지') || lower.includes('diary')) {
        if (lower.includes('요약')) {
            if (!diaries || diaries.length === 0) return '아직 작성된 일지가 없어요. "일지 작성"을 먼저 해볼까요?';
            const lines = diaries.slice(0, 5).map(d => `- ${formatDate(d.date)}: ${d.title}`);
            return `최근 일지 요약입니다:\n${lines.join('\n')}\n\n특정 날짜나 제목으로 자세히 보고 싶으면 말씀해 주세요.`;
        }
        if (lower.includes('생성') || lower.includes('작성')) {
            const exists = diaries.some(d => d.date === todayStr);
            if (exists) return '오늘 일지는 이미 있어요! 내용을 업데이트하거나 새로운 목표를 추가해보는 건 어떨까요?';
            const auto = generateAutoDevLog();
            // 폼 채우기 (UI 편의)
            const dateEl = document.getElementById('diaryDate');
            const titleEl = document.getElementById('diaryTitle');
            const contentEl = document.getElementById('diaryContent');
            if (dateEl && titleEl && contentEl) {
                dateEl.value = todayStr;
                titleEl.value = `오늘의 개발 성과 - ${now.toLocaleDateString()}`;
                contentEl.value = auto;
            }
            return '오늘의 일지 초안을 자동으로 채워두었어요. 확인 후 저장해 주세요!';
        }
    }

    // 2) 목표 관리/요약
    if (lower.includes('목표') || lower.includes('goal')) {
        if (!goals || goals.length === 0) return '아직 설정된 목표가 없어요. 우측 상단의 "새 목표 추가"로 시작해 보세요!';
        const completed = goals.filter(g => g.status === 'completed');
        const pending = goals.filter(g => g.status !== 'completed');
        const clines = completed.slice(0, 5).map(g => `- ✅ ${g.title} (기한: ${formatDate(g.deadline)})`);
        const plines = pending.slice(0, 5).map(g => `- ⏳ ${g.title} (기한: ${formatDate(g.deadline)})`);
        return `목표 현황입니다:\n\n완료(${completed.length})\n${clines.join('\n') || '- 없음'}\n\n진행중(${pending.length})\n${plines.join('\n') || '- 없음'}\n\n특정 목표 상세/우선순위 조정도 도와드릴 수 있어요.`;
    }

    // 3) 일반 요청: 간단한 제안/가이드
    if (lower.includes('추천') || lower.includes('할') || lower.includes('todo') || lower.includes('next')) {
        const suggestions = [];
        if (!goals || goals.length === 0) {
            suggestions.push('새 목표를 하나 만들어볼까요? (예: "1주일간 하루 30분 코딩")');
        } else {
            const pending = goals.filter(g => g.status !== 'completed');
            const nextGoal = pending.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
            if (nextGoal) suggestions.push(`가장 임박한 목표: "${nextGoal.title}"를 20~30분만 집중해서 진행해보세요.`);
        }
        if (!diaries || diaries.length === 0) {
            suggestions.push('오늘 한 일을 간단히 적어 "첫 번째 성공 일지"를 만들어 보세요.');
        } else {
            suggestions.push('오늘의 일지를 열어 진행 상황을 기록하고, 내일의 할 일을 한 줄로 적어보세요.');
        }
        return `다음 액션 제안:\n- ${suggestions.join('\n- ')}`;
    }

    // 4) 기본 응답
    // 최근 대화 한 줄을 반영한 기본 응답 (경량)
    const lastUser = [...hist].reverse().find(h => h.role === 'user');
    const tail = lastUser ? ` 방금 말씀하신 "${(lastUser.content || '').slice(0, 20)}"(에) 대해 더 자세히 알려주셔도 좋아요.` : '';
    return '현재는 로컬 어시스턴트 모드입니다. 예: "최근 일지 요약", "목표 현황", "다음 할 일 추천" 같은 요청을 해보세요.' + tail;
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    startLoginCloudAnimation();
    // 업데이트 배지 표시
    showUpdateBadgeIfAny();
    // 네로봇 입력창 예시 날짜를 오늘 날짜로 업데이트
    updateChatPlaceholderDate();
    // 허브 카드 클릭 이벤트 (전역 참조 사용)
    const goDiaryCard = document.getElementById('goDiaryCard');
    const goNeroBotCard = document.getElementById('goNeroBotCard');
    if (goDiaryCard) {
        goDiaryCard.addEventListener('click', function() {
            transitionTo('main');
        });
    }
    // 네로봇 카드 제거됨 (존재할 경우 무시)
    // 네로봇 전용 페이지 버튼/뒤로가기 이벤트 연결
    setupNeroBotPage();
});

function startLoginCloudAnimation() {
    const loginForm = document.querySelector('.login-form');
    if (!loginForm) return;
    let start = null;
    function animateCloud(ts) {
        if (!start) start = ts;
        const elapsed = (ts - start) / 1000; // 초 단위
        // 사인파 기반 자연스러운 곡선 이동
        const y = Math.sin(elapsed * 0.7) * 18; // 위아래
        const x = Math.cos(elapsed * 0.5) * 10; // 좌우
        loginForm.style.transform = `translateY(${y}px) translateX(${x}px)`;
        requestAnimationFrame(animateCloud);
    }
    requestAnimationFrame(animateCloud);
}

function checkLoginStatus() {
    if (isLoggedIn) {
        showMainApp();
        initializeApp();
    } else {
        showLoginScreen();
        setupLoginEventListeners();
    }
}

function showLoginScreen() {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
}

function showMainApp() {
    loginScreen.style.display = 'none';
    if (hubScreenEl) hubScreenEl.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
}

function setupLoginEventListeners() {
    // 엔터키로 로그인
    usernameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
    
    passwordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
    
    // 입력 시 에러 메시지 숨기기
    usernameInput.addEventListener('input', function() {
        if (loginError.style.display !== 'none') {
            loginError.style.display = 'none';
        }
    });
    
    passwordInput.addEventListener('input', function() {
        if (loginError.style.display !== 'none') {
            loginError.style.display = 'none';
        }
    });
    
    // 전체화면 모드 활성화
    requestFullscreen();
}

function requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('전체화면 모드 실패:', err);
        });
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}

function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
        // 로그인 성공
        isLoggedIn = true;
        
        // 로그인 화면 숨기고 메인 앱 표시
        showMainApp();
        initializeApp();
    } else {
        // 로그인 실패
        loginError.style.display = 'block';
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.focus();
    }
}

function initializeApp() {
    // 오늘 날짜를 기본값으로 설정
    document.getElementById('diaryDate').value = new Date().toISOString().split('T')[0];
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 달력 초기화
    initializeCalendar();
    
    // 데이터 로드 및 표시
    loadDiaries();
    loadGoals();
    updateStats();
}

function setupEventListeners() {
    // 네비게이션 탭 전환
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 일지 관련 이벤트
    addDiaryBtn.addEventListener('click', showDiaryForm);
    cancelDiaryBtn.addEventListener('click', hideDiaryForm);
    saveDiaryBtn.addEventListener('click', saveDiary);

    // 목표 관련 이벤트
    addGoalBtn.addEventListener('click', showGoalForm);
    cancelGoalBtn.addEventListener('click', hideGoalForm);
    saveGoalBtn.addEventListener('click', saveGoal);

    // 달력 관련 이벤트
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    // GitHub 오늘 요약
    const ghBtn = document.getElementById('githubDailySummaryBtn');
    if (ghBtn) {
        ghBtn.addEventListener('click', async () => {
            ghBtn.disabled = true;
            ghBtn.innerHTML = '<i class="fab fa-github"></i> 불러오는 중...';
            try {
                const md = await buildTodayGithubSummary({ username: 'nerocoso', repo: 'success-diary' });
                autoFillDiaryWithMarkdown(md);
                showNotification('GitHub 오늘 활동 요약을 코딩일지에 채웠습니다.', 'success');
            } catch (e) {
                console.error(e);
                showNotification('GitHub 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
            } finally {
                ghBtn.disabled = false;
                ghBtn.innerHTML = '<i class="fab fa-github"></i> GitHub 오늘 요약';
            }
        });
    }

    // 네로봇 채팅 이벤트
    setupNeroBot();
}

// --- GitHub 비로그인 요약 유틸들 ---
// 오늘 날짜 범위(KST) since/until ISO
function getTodayRangeISO() {
    // KST(UTC+9)에서의 오늘 00:00:00 ~ 23:59:59를
    // UTC 타임스탬프로 변환: 시작은 -9h, 끝은 +14:59:59h
    const now = new Date();
    const tz = now.getTimezoneOffset(); // 분
    const kstOffsetMin = -9 * 60; // UTC+9
    const diffMin = kstOffsetMin - tz;
    const kstNow = new Date(now.getTime() + diffMin * 60 * 1000);
    const y = kstNow.getFullYear();
    const m = kstNow.getMonth();
    const d = kstNow.getDate();
    const startUTC = new Date(Date.UTC(y, m, d, -9, 0, 0));   // KST 00:00 -> UTC -9h
    const endUTC   = new Date(Date.UTC(y, m, d, 14, 59, 59)); // KST 23:59:59 -> UTC +14:59:59
    return { since: startUTC.toISOString(), until: endUTC.toISOString(), y, m: m + 1, d };
}

async function fetchCommitsNoAuth({ username, repo, since, until }) {
    const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/commits?per_page=100&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (!resp.ok) throw new Error(`GitHub API 오류: ${resp.status}`);
    return resp.json();
}

async function fetchCommitDetailNoAuth({ username, repo, sha }) {
    const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
    if (!resp.ok) throw new Error(`GitHub Commit API 오류: ${resp.status}`);
    return resp.json();
}

// 네로봇 인텐트: GitHub 요약 요청인지 판별
function isGithubSummaryIntent(lowerMsg) {
    const kws = [
        'github', '깃허브', '요약', '활동', '변경사항', '변경 사항', '코딩일지', '개발일지', '자동 작성', '오늘 요약'
    ];
    // 최소 2개 이상의 관련 단어가 포함되면 의도로 인정
    let hit = 0;
    for (const k of kws) if (lowerMsg.includes(k)) hit++;
    return hit >= 2;
}

// 파일 단위 변경을 간단 규칙으로 자연어 요약
function analyzeFileChange(f) {
    if (!f) return '';
    const { filename = '', status = '', additions = 0, deletions = 0, patch = '' } = f;
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const scope = filename.includes('script') || ext === 'js' ? 'JS'
                : (ext === 'html' ? 'HTML'
                : (ext === 'css' ? 'CSS'
                : ext.toUpperCase() || '파일'));

    const acts = [];
    if (status === 'added') acts.push('신규 추가');
    else if (status === 'removed') acts.push('삭제');
    else if (status === 'modified') acts.push('수정');

    // patch 키워드 기반 힌트
    const p = String(patch || '');
    const addOnly = additions > 0 && deletions === 0;
    const delOnly = deletions > 0 && additions === 0;

    const hints = [];
    if (/function\s+|=>|class\s+/i.test(p)) hints.push('함수/클래스 로직 변경');
    if (/addEventListener|onclick|onchange|keyup|keydown/i.test(p)) hints.push('이벤트 처리 추가/수정');
    if (/(fetch\(|axios\.|XMLHttpRequest)/i.test(p)) hints.push('네트워크 호출 추가/수정');
    if (/<(div|button|input|section|nav|header|footer|span|i)(\s|>)/i.test(p)) hints.push('UI 마크업 변경');
    if (/(color|background|border|margin|padding|flex|grid|font)/i.test(p)) hints.push('스타일 조정');
    if (/localStorage|sessionStorage|JSON\.parse|JSON\.stringify/i.test(p)) hints.push('저장/상태 로직');

    if (addOnly) hints.push('코드 추가 중심');
    if (delOnly) hints.push('불필요 코드 정리');

    const head = `- ${scope}: ${filename} (${acts.join('/') || '변경'}) +${additions}/-${deletions}`;
    return hints.length ? `${head} — ${hints.join(', ')}` : head;
}

async function buildTodayGithubSummary({ username, repo }) {
    const { since, until, m, d } = getTodayRangeISO();
    const commits = await fetchCommitsNoAuth({ username, repo, since, until });
    if (!Array.isArray(commits) || commits.length === 0) {
        return `# ${m}월 ${d}일 코딩일지\n\n오늘은 해당 저장소에 커밋이 없었습니다.\n\n- 저장소: ${username}/${repo}`;
    }
    const top = commits.slice(0, 5);
    const details = [];
    for (const c of top) {
        try {
            const det = await fetchCommitDetailNoAuth({ username, repo, sha: c.sha });
            details.push(det);
        } catch {}
    }
    // 파일 타입 통계
    const byExt = {};
    // 자연어 요약 수집
    const nlSummaries = [];
    for (const det of details) {
        const files = det.files || [];
        const msg = (det.commit && det.commit.message || '').split('\n')[0];
        const commitId = det.sha ? det.sha.slice(0,7) : '';
        const fileBullets = [];
        for (const f of files) {
            const ext = (f.filename.split('.').pop() || '').toLowerCase();
            byExt[ext] = (byExt[ext] || 0) + 1;
            fileBullets.push(analyzeFileChange(f));
        }
        if (fileBullets.length) {
            nlSummaries.push(`- ${msg} (${commitId})\n  ${fileBullets.filter(Boolean).slice(0,6).join('\n  ')}`);
        } else {
            nlSummaries.push(`- ${msg} (${commitId})`);
        }
    }
    const extLines = Object.entries(byExt).sort((a,b)=>b[1]-a[1]).map(([e,c])=>`- ${e || '파일'}: ${c}개`).join('\n');
    const header = `# ${m}월 ${d}일 코딩일지`;
    const overview = `## 오늘의 작업 요약\n- 저장소: ${username}/${repo}\n- 커밋 수: ${commits.length}개`;
    const fileType = `## 대표 변경 파일 타입\n${extLines || '- (상세 파일 정보 부족)'}`;
    const natural = `## 변경 사항(자연어 요약)\n${nlSummaries.join('\n')}`;
    const next = `## 내일 할 일 제안\n- 남은 리팩터링/주석 보강\n- 테스트/문서 업데이트`; 
    return [header, overview, fileType, natural, next].join('\n\n');
}

function autoFillDiaryWithMarkdown(md) {
    const titleEl = document.getElementById('diaryTitle');
    const contentEl = document.getElementById('diaryContent');
    const dateEl = document.getElementById('diaryDate');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    if (titleEl) titleEl.value = `${new Date().toLocaleDateString('ko-KR')} 코딩일지`;
    if (contentEl) contentEl.value = md;
}

// 네로봇 설정
function setupNeroBot() {
    // 메시지 전송 버튼 이벤트
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // 엔터키로 메시지 전송
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// 메시지 전송
function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // 사용자 메시지 추가
    addMessage(message, 'user');
    pushNeroHistory('user', message);
    chatInput.value = '';
    
    // 네로봇 응답 처리
    setTimeout(() => {
        handleNeroBotResponse(message);
    }, 1000);
}

// 메시지 추가
function addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (sender === 'bot') {
        contentDiv.innerHTML = `<i class="fas fa-robot"></i>${content}`;
    } else {
        contentDiv.innerHTML = `<i class="fas fa-user"></i>${content}`;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 맨 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 네로봇 전용 페이지 설정
function setupNeroBotPage() {
    const neroChatInput = document.getElementById('neroChatInput');
    const neroSendMessageBtn = document.getElementById('neroSendMessageBtn');
    const backToHubFromBot = document.getElementById('backToHubFromBot');
    
    if (neroSendMessageBtn) {
        neroSendMessageBtn.addEventListener('click', sendNeroMessage);
    }
    
    if (neroChatInput) {
        neroChatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendNeroMessage();
            }
        });
    }
    
    if (backToHubFromBot) {
        backToHubFromBot.addEventListener('click', function() {
            transitionTo('hub');
        });
    }
}

// 네로봇 전용 페이지 메시지 전송
function sendNeroMessage() {
    const neroChatInput = document.getElementById('neroChatInput');
    const message = neroChatInput.value.trim();
    
    if (message === '') return;
    
    addNeroMessage(message, 'user');
    pushNeroHistory('user', message);
    neroChatInput.value = '';
    
    // 네로봇 응답 처리
    setTimeout(() => {
        handleNeroBotResponseForPage(message);
    }, 1000);
}

// 네로봇 전용 페이지 메시지 추가
function addNeroMessage(message, sender) {
    const neroChatMessages = document.getElementById('neroChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (sender === 'bot') {
        messageContent.innerHTML = `<i class="fas fa-robot"></i> ${message}`;
    } else {
        messageContent.textContent = message;
    }
    
    messageDiv.appendChild(messageContent);
    neroChatMessages.appendChild(messageDiv);
    neroChatMessages.scrollTop = neroChatMessages.scrollHeight;
}

// 네로봇 전용 페이지 응답 처리 (공용 fetch 사용)
async function handleNeroBotResponseForPage(userMessage) {
    addNeroMessage('네로봇이 생각 중...', 'bot');
    try {
        const text = await fetchNeroResponse(userMessage);
        const neroChatMessages = document.getElementById('neroChatMessages');
        const botMsgs = neroChatMessages.querySelectorAll('.bot-message');
        if (botMsgs.length > 0) botMsgs[botMsgs.length - 1].remove();
        addNeroMessage(text, 'bot');
        pushNeroHistory('bot', text);
    } catch (e) {
        const neroChatMessages = document.getElementById('neroChatMessages');
        const botMsgs = neroChatMessages.querySelectorAll('.bot-message');
        if (botMsgs.length > 0) botMsgs[botMsgs.length - 1].remove();
        addNeroMessage('네로봇 서버와 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.', 'bot');
        pushNeroHistory('bot', '네로봇 서버와 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.');
    }
}

// 네로봇 응답 처리 (일지 탭, 공용 fetch 사용)
async function handleNeroBotResponse(userMessage) {
    const lower = (userMessage || '').toLowerCase();
    // 1) GitHub 요약 의도 감지 시: 로컬 요약 실행 + 일지 자동 채움
    if (isGithubSummaryIntent(lower)) {
        addMessage('깃허브에서 오늘 활동을 가져와 요약 중입니다...', 'bot');
        try {
            const md = await buildTodayGithubSummary({ username: 'nerocoso', repo: 'success-diary' });
            // thinking 메시지 제거
            const botMsgs = document.querySelectorAll('.bot-message');
            if (botMsgs.length > 0) botMsgs[botMsgs.length - 1].remove();
            // 일지 폼 자동 채움
            autoFillDiaryWithMarkdown(md);
            // 챗 응답은 간단 안내로
            addMessage('오늘 GitHub 변경사항을 요약해 코딩일지 폼에 채웠습니다. 저장 전에 검토해 주세요!', 'bot');
            pushNeroHistory('bot', '[자동] GitHub 오늘 요약을 코딩일지에 채움');
        } catch (e) {
            const botMsgs = document.querySelectorAll('.bot-message');
            if (botMsgs.length > 0) botMsgs[botMsgs.length - 1].remove();
            addMessage('GitHub 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'bot');
            pushNeroHistory('bot', 'GitHub 요약 중 오류 발생');
        }
        return;
    }

    // 2) 일반 대화는 기존 로컬/프록시 처리
    addMessage('네로봇이 생각 중...', 'bot');
    try {
        const text = await fetchNeroResponse(userMessage);
        const botMsgs = document.querySelectorAll('.bot-message');
        if (botMsgs.length > 0) botMsgs[botMsgs.length - 1].remove();
        addMessage(text, 'bot');
        pushNeroHistory('bot', text);
    } catch (e) {
        const botMsgs = document.querySelectorAll('.bot-message');
        if (botMsgs.length > 0) botMsgs[botMsgs.length - 1].remove();
        addMessage('네로봇 서버와 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.', 'bot');
        pushNeroHistory('bot', '네로봇 서버와 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.');
    }
}

// 개발일지 생성
function generateDevLog(userMessage) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 오늘의 일지가 있는지 확인
    const todayDiary = diaries.find(diary => diary.date === todayStr);
    
    if (todayDiary) {
        addMessage(`오늘(${todayStr})의 개발일지가 이미 있네요! 내용을 확인해보세요.`, 'bot');
    } else {
        // 자동으로 개발일지 생성
        const devLogContent = generateAutoDevLog();
        
        // 일지 폼에 자동 입력
        document.getElementById('diaryDate').value = todayStr;
        document.getElementById('diaryTitle').value = `오늘의 개발 성과 - ${today.toLocaleDateString()}`;
        document.getElementById('diaryContent').value = devLogContent;
        
        addMessage(`오늘의 개발일지를 자동으로 생성했습니다! 아래 폼에서 확인하고 저장해주세요.`, 'bot');
    }
}

// 자동 개발일지 내용 생성
function generateAutoDevLog() {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('ko-KR', { weekday: 'long' });
    
    return `오늘은 ${dayOfWeek}이었습니다.

🚀 주요 작업:
- nero developing diary 프로젝트 개발
- 네로봇 AI 챗봇 시스템 구현
- GitHub 연동 기능 설계

💡 학습한 내용:
- AI 챗봇 인터페이스 디자인
- 자동 일지 생성 시스템 구상
- 사용자 경험 개선 방법

🎯 내일의 목표:
- GitHub API 연동 완료
- 더 정교한 AI 응답 시스템 구현
- 사용자 피드백 반영

오늘도 열심히 개발했고, 새로운 기능을 성공적으로 구현할 수 있어서 뿌듯합니다!`;
}

// 탭 전환 함수
function switchTab(tabName) {
    // 모든 탭 버튼과 콘텐츠에서 active 클래스 제거
    navBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // 선택된 탭에 active 클래스 추가
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // 통계 탭으로 전환할 때 통계 업데이트
    if (tabName === 'stats') {
        updateStats();
    }
    // 일지 탭 전환 시 예시 날짜 갱신
    if (tabName === 'diary') {
        updateChatPlaceholderDate();
    }
}

// 네로봇(일지 탭) 입력창 플레이스홀더에 오늘 날짜 적용
function updateChatPlaceholderDate() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    input.placeholder = `예: ${m}월 ${d}일 개발일지 요약해서 작성해줘`;
}

// 일지 관련 함수들
function showDiaryForm() {
    diaryForm.style.display = 'block';
    addDiaryBtn.style.display = 'none';
    document.getElementById('diaryDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('diaryTitle').focus();
}

function hideDiaryForm() {
    diaryForm.style.display = 'none';
    addDiaryBtn.style.display = 'inline-flex';
    clearDiaryForm();
}

function clearDiaryForm() {
    document.getElementById('diaryDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('diaryTitle').value = '';
    document.getElementById('diaryContent').value = '';
    document.getElementById('diaryMood').value = '';
}

function saveDiary() {
    const date = document.getElementById('diaryDate').value;
    const title = document.getElementById('diaryTitle').value.trim();
    const content = document.getElementById('diaryContent').value.trim();
    const mood = document.getElementById('diaryMood').value;

    if (!date || !title || !content || !mood) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    const diary = {
        id: Date.now(),
        date: date,
        title: title,
        content: content,
        mood: mood,
        createdAt: new Date().toISOString()
    };

    diaries.unshift(diary); // 최신 일지가 맨 위에 오도록
    localStorage.setItem('diaries', JSON.stringify(diaries));
    
    loadDiaries();
    hideDiaryForm();
    updateStats();
    renderCalendar(); // 달력 업데이트
    
    // 성공 메시지
    showNotification('일지가 성공적으로 저장되었습니다!', 'success');
}

function loadDiaries() {
    if (diaries.length === 0) {
        diaryList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>아직 작성된 일지가 없습니다</h3>
                <p>첫 번째 성공 일지를 작성해보세요!</p>
            </div>
        `;
        return;
    }

    diaryList.innerHTML = diaries.map(diary => `
        <div class="diary-item" data-diary-id="${diary.id}">
            <div class="diary-item-header">
                <div>
                    <div class="diary-item-title">${escapeHtml(diary.title)}</div>
                    <div class="diary-item-date">${formatDate(diary.date)}</div>
                </div>
                <div class="diary-item-mood">${getMoodText(diary.mood)}</div>
            </div>
            <div class="diary-item-content">${escapeHtml(diary.content).replace(/\n/g, '<br>')}</div>
            <div class="diary-item-actions">
                <button class="btn btn-danger btn-small" onclick="deleteDiary(${diary.id})">
                    <i class="fas fa-trash"></i>
                    삭제
                </button>
            </div>
        </div>
    `).join('');
    
    // 호버 효과 제거됨
    
    // 테마 시스템 제거: 제목 그라데이션 적용 안 함
}

function deleteDiary(id) {
    if (confirm('정말로 이 일지를 삭제하시겠습니까?')) {
        diaries = diaries.filter(diary => diary.id !== id);
        localStorage.setItem('diaries', JSON.stringify(diaries));
        loadDiaries();
        updateStats();
        renderCalendar(); // 달력 업데이트
        showNotification('일지가 삭제되었습니다.', 'info');
    }
}

// 목표 관련 함수들
function showGoalForm() {
    goalForm.style.display = 'block';
    addGoalBtn.style.display = 'none';
    document.getElementById('goalTitle').focus();
}

function hideGoalForm() {
    goalForm.style.display = 'none';
    addGoalBtn.style.display = 'inline-flex';
    clearGoalForm();
}

function clearGoalForm() {
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('goalDeadline').value = '';
    document.getElementById('goalPriority').value = '';
}

function saveGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const description = document.getElementById('goalDescription').value.trim();
    const deadline = document.getElementById('goalDeadline').value;
    const priority = document.getElementById('goalPriority').value;

    if (!title || !description || !deadline || !priority) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    const goal = {
        id: Date.now(),
        title: title,
        description: description,
        deadline: deadline,
        priority: priority,
        status: 'in-progress',
        createdAt: new Date().toISOString()
    };

    goals.unshift(goal);
    localStorage.setItem('goals', JSON.stringify(goals));
    
    loadGoals();
    hideGoalForm();
    updateStats();
    
    showNotification('목표가 성공적으로 추가되었습니다!', 'success');
}

function loadGoals() {
    if (goals.length === 0) {
        goalsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-target"></i>
                <h3>아직 설정된 목표가 없습니다</h3>
                <p>첫 번째 목표를 설정해보세요!</p>
            </div>
        `;
        return;
    }

    goalsList.innerHTML = goals.map(goal => `
        <div class="goal-item ${goal.status}">
            <div class="goal-item-header">
                <div>
                    <div class="goal-item-title">${escapeHtml(goal.title)}</div>
                    <div class="goal-item-date">목표 기한: ${formatDate(goal.deadline)}</div>
                </div>
                <div>
                    <span class="goal-item-priority ${goal.priority}">${getPriorityText(goal.priority)}</span>
                    <span class="goal-item-status ${goal.status}">${getStatusText(goal.status)}</span>
                </div>
            </div>
            <div class="goal-item-description">${escapeHtml(goal.description).replace(/\n/g, '<br>')}</div>
            <div class="goal-item-actions">
                ${goal.status === 'in-progress' ? 
                    `<button class="btn btn-success btn-small" onclick="completeGoal(${goal.id})">
                        <i class="fas fa-check"></i>
                        완료
                    </button>` : ''
                }
                <button class="btn btn-danger btn-small" onclick="deleteGoal(${goal.id})">
                    <i class="fas fa-trash"></i>
                    삭제
                </button>
            </div>
        </div>
    `).join('');
    
    // 호버 효과 제거됨
    
    // 테마 시스템 제거: 제목 그라데이션 적용 안 함
}

function completeGoal(id) {
    if (confirm('이 목표를 완료로 표시하시겠습니까?')) {
        goals = goals.map(goal => 
            goal.id === id ? { ...goal, status: 'completed' } : goal
        );
        localStorage.setItem('goals', JSON.stringify(goals));
        loadGoals();
        updateStats();
        showNotification('목표를 완료했습니다! 축하합니다! 🎉', 'success');
    }
}

function deleteGoal(id) {
    if (confirm('정말로 이 목표를 삭제하시겠습니까?')) {
        goals = goals.filter(goal => goal.id !== id);
        localStorage.setItem('goals', JSON.stringify(goals));
        loadGoals();
        updateStats();
        showNotification('목표가 삭제되었습니다.', 'info');
    }
}

// 통계 업데이트 함수
function updateStats() {
    totalDiaries.textContent = diaries.length;
    totalGoals.textContent = goals.length;
    completedGoals.textContent = goals.filter(goal => goal.status === 'completed').length;
    currentStreak.textContent = calculateStreak();
}

function calculateStreak() {
    if (diaries.length === 0) return 0;
    
    const sortedDates = diaries
        .map(diary => new Date(diary.date))
        .sort((a, b) => b - a);
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedDates.length; i++) {
        const diaryDate = new Date(sortedDates[i]);
        diaryDate.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        
        if (diaryDate.getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// 유틸리티 함수들
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

function getMoodText(mood) {
    const moodMap = {
        'excellent': '😊 매우 좋음',
        'good': '😄 좋음',
        'okay': '😐 보통',
        'bad': '😔 나쁨',
        'terrible': '😢 매우 나쁨'
    };
    return moodMap[mood] || mood;
}

function getPriorityText(priority) {
    const priorityMap = {
        'high': '🔴 높음',
        'medium': '🟡 보통',
        'low': '🟢 낮음'
    };
    return priorityMap[priority] || priority;
}

function getStatusText(status) {
    const statusMap = {
        'in-progress': '진행중',
        'completed': '완료'
    };
    return statusMap[status] || status;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // 간단한 알림 시스템
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // 타입별 색상 설정
    const colors = {
        'success': '#4caf50',
        'error': '#f44336',
        'info': '#2196f3',
        'warning': '#ff9800'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 달력 관련 함수들
function initializeCalendar() {
    updateCalendarHeader();
    renderCalendar();
}

function updateCalendarHeader() {
    const monthNames = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    
    currentMonthEl.textContent = monthNames[currentDate.getMonth()];
    currentYearEl.textContent = currentDate.getFullYear();
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    updateCalendarHeader();
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 이번 달의 첫 번째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 이번 달의 첫 번째 날이 시작하는 요일 (0=일요일)
    const startDay = firstDay.getDay();
    
    // 이전 달의 마지막 날들
    const prevMonth = new Date(year, month, 0);
    const prevMonthLastDay = prevMonth.getDate();
    
    // 다음 달의 첫 번째 날들
    const nextMonth = new Date(year, month + 1, 1);
    
    let calendarHTML = '';
    
    // 이전 달의 날들
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${day}</div>`;
    }
    
    // 이번 달의 날들
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = new Date(year, month, day);
        const today = new Date();
        const isToday = dayElement.toDateString() === today.toDateString();
        const hasDiary = diaries.some(diary => diary.date === dateStr);
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasDiary) classes += ' has-diary';
        if (selectedDate === dateStr) classes += ' selected';
        
        calendarHTML += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
    }
    
    // 다음 달의 날들 (달력을 완성하기 위해)
    const remainingDays = 42 - (startDay + lastDay.getDate()); // 6주 * 7일 = 42
    for (let day = 1; day <= remainingDays; day++) {
        const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${day}</div>`;
    }
    
    calendarDaysEl.innerHTML = calendarHTML;
    
    // 각 날짜에 클릭 이벤트 및 호버 효과 추가
    const dayElements = calendarDaysEl.querySelectorAll('.calendar-day');
    dayElements.forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.dataset.date;
            if (date) {
                selectDate(date);
            }
        });
        // 호버 효과 제거됨
    });
    
    // 테마 시스템 제거: 달력 제목 그라데이션 적용 안 함
}

function selectDate(date) {
    selectedDate = date;
    
    // 달력에서 선택된 날짜 표시 업데이트
    const dayElements = calendarDaysEl.querySelectorAll('.calendar-day');
    dayElements.forEach(dayEl => {
        dayEl.classList.remove('selected');
        if (dayEl.dataset.date === date) {
            dayEl.classList.add('selected');
        }
    });
    
    // 일지 탭으로 전환
    switchTab('diary');
    
    // 해당 날짜의 일지가 있는지 확인
    const diaryForDate = diaries.find(diary => diary.date === date);
    if (diaryForDate) {
        // 해당 날짜의 일지가 있으면 일지 목록에서 해당 일지로 스크롤
        setTimeout(() => {
            const diaryItem = document.querySelector(`[data-diary-id="${diaryForDate.id}"]`);
            if (diaryItem) {
                diaryItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                diaryItem.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    diaryItem.style.animation = '';
                }, 500);
            }
        }, 100);
    } else {
        // 해당 날짜의 일지가 없으면 새 일지 작성 폼 표시
        showDiaryForm();
        document.getElementById('diaryDate').value = date;
    }
}

// 마우스 커서 효과 함수들 제거됨

// 테마 관련 함수들
function initializeTheme() {
    // 테마 카드들에 클릭 이벤트 추가
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            selectTheme(theme);
        });
        // 호버 효과 제거됨
    });
    
    // 현재 테마 적용
    applyTheme(currentTheme);
    updateCurrentThemeDisplay();
}

function selectTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('selectedTheme', theme);
    
    // 테마 카드 선택 상태 업데이트
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.theme === theme) {
            card.classList.add('selected');
        }
    });
    
    // 테마 적용
    applyTheme(theme);
    updateCurrentThemeDisplay();
    
    // 성공 알림
    showNotification('테마가 변경되었습니다!', 'success');
}

function applyTheme(theme) {
    const themeColors = getThemeColors(theme);
    
    // CSS 변수 업데이트
    document.documentElement.style.setProperty('--primary-color', themeColors.primary);
    document.documentElement.style.setProperty('--secondary-color', themeColors.secondary);
    document.documentElement.style.setProperty('--accent-color', themeColors.accent);
    
    // 모든 그라데이션 요소 업데이트
    updateGradientElements(themeColors);
}

function getThemeColors(theme) {
    const themes = {
        'pink-sky': {
            primary: '#ff6b9d',
            secondary: '#87ceeb',
            accent: '#ff8a80',
            gradient: 'linear-gradient(135deg, #ff6b9d, #ff8a80, #87ceeb)'
        },
        'orange-pink': {
            primary: '#ff9a56',
            secondary: '#ff6b9d',
            accent: '#ff8a80',
            gradient: 'linear-gradient(135deg, #ff9a56, #ff6b9d, #ff8a80)'
        },
        'red-blue': {
            primary: '#ff4757',
            secondary: '#3742fa',
            accent: '#ff6b9d',
            gradient: 'linear-gradient(135deg, #ff4757, #ff6b9d, #3742fa)'
        },
        'green-blue': {
            primary: '#2ed573',
            secondary: '#3742fa',
            accent: '#7bed9f',
            gradient: 'linear-gradient(135deg, #2ed573, #7bed9f, #3742fa)'
        },
        'purple-pink': {
            primary: '#a55eea',
            secondary: '#ff6b9d',
            accent: '#ff8a80',
            gradient: 'linear-gradient(135deg, #a55eea, #ff6b9d, #ff8a80)'
        },
        'cyan-purple': {
            primary: '#26d0ce',
            secondary: '#a55eea',
            accent: '#ff6b9d',
            gradient: 'linear-gradient(135deg, #26d0ce, #a55eea, #ff6b9d)'
        },
        'yellow-orange': {
            primary: '#ffa502',
            secondary: '#ff9a56',
            accent: '#ff6b9d',
            gradient: 'linear-gradient(135deg, #ffa502, #ff9a56, #ff6b9d)'
        },
        'blue-cyan': {
            primary: '#3742fa',
            secondary: '#26d0ce',
            accent: '#87ceeb',
            gradient: 'linear-gradient(135deg, #3742fa, #26d0ce, #87ceeb)'
        }
    };
    
    return themes[theme] || themes['pink-sky'];
}

function updateGradientElements(colors) {
    // 로고 그라데이션 업데이트
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.background = colors.gradient;
        logo.style.webkitBackgroundClip = 'text';
        logo.style.webkitTextFillColor = 'transparent';
        logo.style.backgroundClip = 'text';
    }
    
    // 로고 아이콘 그라데이션 업데이트
    const logoIcon = document.querySelector('.logo i');
    if (logoIcon) {
        logoIcon.style.background = colors.gradient;
        logoIcon.style.webkitBackgroundClip = 'text';
        logoIcon.style.webkitTextFillColor = 'transparent';
        logoIcon.style.backgroundClip = 'text';
    }
    
    // 네비게이션 버튼 활성 상태 업데이트
    const activeNavBtn = document.querySelector('.nav-btn.active');
    if (activeNavBtn) {
        activeNavBtn.style.background = `rgba(${hexToRgb(colors.primary)}, 0.2)`;
        activeNavBtn.style.borderColor = `rgba(${hexToRgb(colors.primary)}, 0.5)`;
        activeNavBtn.style.color = colors.primary;
    }
    
    // 섹션 헤더 그라데이션 업데이트
    const sectionHeaders = document.querySelectorAll('.diary-header h2, .goals-header h2, .theme-header h2');
    sectionHeaders.forEach(header => {
        header.style.background = colors.gradient;
        header.style.webkitBackgroundClip = 'text';
        header.style.webkitTextFillColor = 'transparent';
        header.style.backgroundClip = 'text';
    });
    
    // 버튼 그라데이션 업데이트
    const primaryBtns = document.querySelectorAll('.btn-primary');
    primaryBtns.forEach(btn => {
        btn.style.background = `rgba(${hexToRgb(colors.primary)}, 0.2)`;
        btn.style.borderColor = `rgba(${hexToRgb(colors.primary)}, 0.5)`;
        btn.style.color = colors.primary;
    });
    
    // 폼 라벨 그라데이션 업데이트
    const formLabels = document.querySelectorAll('.form-group label');
    formLabels.forEach(label => {
        label.style.background = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
        label.style.webkitBackgroundClip = 'text';
        label.style.webkitTextFillColor = 'transparent';
        label.style.backgroundClip = 'text';
    });
    
    // 통계 카드 아이콘 업데이트
    const statIcons = document.querySelectorAll('.stat-icon');
    statIcons.forEach(icon => {
        icon.style.background = `rgba(${hexToRgb(colors.primary)}, 0.2)`;
        icon.style.borderColor = `rgba(${hexToRgb(colors.primary)}, 0.5)`;
        icon.style.color = colors.primary;
    });
    
    // 통계 숫자 그라데이션 업데이트
    const statNumbers = document.querySelectorAll('.stat-content h3');
    statNumbers.forEach(number => {
        number.style.background = colors.gradient;
        number.style.webkitBackgroundClip = 'text';
        number.style.webkitTextFillColor = 'transparent';
        number.style.backgroundClip = 'text';
    });
    
    // 일지/목표 제목 그라데이션 업데이트
    const itemTitles = document.querySelectorAll('.diary-item-title, .goal-item-title');
    itemTitles.forEach(title => {
        title.style.background = colors.gradient;
        title.style.webkitBackgroundClip = 'text';
        title.style.webkitTextFillColor = 'transparent';
        title.style.backgroundClip = 'text';
    });
    
    // 빈 상태 제목 그라데이션 업데이트
    const emptyStateTitles = document.querySelectorAll('.empty-state h3');
    emptyStateTitles.forEach(title => {
        title.style.background = colors.gradient;
        title.style.webkitBackgroundClip = 'text';
        title.style.webkitTextFillColor = 'transparent';
        title.style.backgroundClip = 'text';
    });
}

function updateCurrentThemeDisplay() {
    const themeNames = {
        'pink-sky': '핑크 스카이',
        'orange-pink': '오렌지 핑크',
        'red-blue': '레드 블루',
        'green-blue': '그린 블루',
        'purple-pink': '퍼플 핑크',
        'cyan-purple': '시안 퍼플',
        'yellow-orange': '옐로우 오렌지',
        'blue-cyan': '블루 시안'
    };
    
    if (currentThemePreview && currentThemeName) {
        currentThemePreview.className = `current-theme-preview ${currentTheme}-gradient`;
        currentThemeName.textContent = themeNames[currentTheme] || '핑크 스카이';
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '255, 107, 157';
}
