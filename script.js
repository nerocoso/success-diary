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

// 네로봇 관련 요소들
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    startLoginCloudAnimation();
    setupCustomMiniPlayer();
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
    mainApp.style.display = 'block';
    stopSoundCloudBGM();
}

function stopSoundCloudBGM() {
    const scIframe = document.getElementById('sc-bgm');
    if (!scIframe) return;
    // SoundCloud Widget API: postMessage로 일시정지 명령
    scIframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
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
    
    // 테마 초기화
    initializeTheme();
    
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
    
    // 네로봇 채팅 이벤트
    setupNeroBot();
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

// 네로봇 응답 처리
function handleNeroBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('개발일지') || lowerMessage.includes('일지')) {
        generateDevLog(userMessage);
    } else if (lowerMessage.includes('github') || lowerMessage.includes('커밋')) {
        addMessage('GitHub 연동 기능은 현재 개발 중입니다! 곧 사용할 수 있을 예정이에요 🚀', 'bot');
    } else if (lowerMessage.includes('안녕') || lowerMessage.includes('hello')) {
        addMessage('안녕하세요! 저는 네로봇입니다. 개발일지를 자동으로 작성해드릴게요! 어떤 도움이 필요하신가요?', 'bot');
    } else {
        addMessage('죄송해요, 아직 그 기능은 준비 중이에요. "개발일지 요약해줘" 같은 명령어를 시도해보세요!', 'bot');
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
    
    // 새로 생성된 일지 제목들에 그라데이션 적용
    const diaryTitles = diaryList.querySelectorAll('.diary-item-title');
    diaryTitles.forEach(title => {
        const colors = getThemeColors(currentTheme);
        title.style.background = colors.gradient;
        title.style.webkitBackgroundClip = 'text';
        title.style.webkitTextFillColor = 'transparent';
        title.style.backgroundClip = 'text';
    });
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
        <div class="goal-item">
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
    
    // 새로 생성된 목표 제목들에 그라데이션 적용
    const goalTitles = goalsList.querySelectorAll('.goal-item-title');
    goalTitles.forEach(title => {
        const colors = getThemeColors(currentTheme);
        title.style.background = colors.gradient;
        title.style.webkitBackgroundClip = 'text';
        title.style.webkitTextFillColor = 'transparent';
        title.style.backgroundClip = 'text';
    });
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
    
    // 달력 제목에 그라데이션 적용
    const calendarTitle = document.querySelector('.calendar-title span:first-child');
    if (calendarTitle) {
        const colors = getThemeColors(currentTheme);
        calendarTitle.style.background = colors.gradient;
        calendarTitle.style.webkitBackgroundClip = 'text';
        calendarTitle.style.webkitTextFillColor = 'transparent';
        calendarTitle.style.backgroundClip = 'text';
    }
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

function setupCustomMiniPlayer() {
    const playBtn = document.getElementById('cmp-playpause');
    const playIcon = document.getElementById('cmp-play-icon');
    const pauseIcon = document.getElementById('cmp-pause-icon');
    let isPlaying = true;
    playBtn.addEventListener('click', function() {
        const scIframe = document.getElementById('sc-bgm');
        if (!scIframe) return;
        if (isPlaying) {
            scIframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
            playIcon.style.display = '';
            pauseIcon.style.display = 'none';
        } else {
            scIframe.contentWindow.postMessage(JSON.stringify({ method: 'play' }), '*');
            playIcon.style.display = 'none';
            pauseIcon.style.display = '';
        }
        isPlaying = !isPlaying;
    });
    // 초기 상태: 재생 중이므로 pause 아이콘 표시
    playIcon.style.display = 'none';
    pauseIcon.style.display = '';
}
