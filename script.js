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

// 네로봇 학습 데이터
let neroBotData = JSON.parse(localStorage.getItem('neroBotData')) || {
    conversations: [],
    userPreferences: {
        diaryStyle: 'detailed',
        favoriteCommands: [],
        projectHistory: []
    },
    learnedPatterns: {
        commonRequests: {},
        responseTemplates: {},
        userFeedback: {}
    }
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
});

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
    
    // 대화 기록 저장
    saveConversation(message, 'user');
    
    chatInput.value = '';
    
    // 네로봇 응답 처리 (학습된 패턴 적용)
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
        
        // 봇 메시지에 피드백 버튼 추가
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'message-feedback';
        feedbackDiv.innerHTML = `
            <button class="feedback-btn" onclick="giveFeedback('${content}', 'helpful')" title="도움이 됐어요">
                <i class="fas fa-thumbs-up"></i>
            </button>
            <button class="feedback-btn" onclick="giveFeedback('${content}', 'not-helpful')" title="도움이 안됐어요">
                <i class="fas fa-thumbs-down"></i>
            </button>
        `;
        messageDiv.appendChild(feedbackDiv);
    } else {
        contentDiv.innerHTML = `<i class="fas fa-user"></i>${content}`;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 맨 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 대화 기록 저장
function saveConversation(message, sender) {
    const conversation = {
        message: message,
        sender: sender,
        timestamp: new Date().toISOString(),
        context: getCurrentContext()
    };
    
    neroBotData.conversations.push(conversation);
    
    // 최근 100개 대화만 유지
    if (neroBotData.conversations.length > 100) {
        neroBotData.conversations = neroBotData.conversations.slice(-100);
    }
    
    // 사용자 선호도 학습
    learnUserPreferences(message, sender);
    
    // 데이터 저장
    localStorage.setItem('neroBotData', JSON.stringify(neroBotData));
}

// 현재 컨텍스트 가져오기
function getCurrentContext() {
    return {
        currentDate: new Date().toISOString().split('T')[0],
        currentProject: 'nero developing diary',
        recentDiaries: diaries.slice(-3),
        recentGoals: goals.slice(-3)
    };
}

// 사용자 선호도 학습
function learnUserPreferences(message, sender) {
    if (sender === 'user') {
        const lowerMessage = message.toLowerCase();
        
        // 자주 사용하는 명령어 패턴 학습
        if (lowerMessage.includes('개발일지')) {
            neroBotData.userPreferences.favoriteCommands.push('diary');
        }
        if (lowerMessage.includes('github')) {
            neroBotData.userPreferences.favoriteCommands.push('github');
        }
        if (lowerMessage.includes('목표')) {
            neroBotData.userPreferences.favoriteCommands.push('goals');
        }
        
        // 프로젝트 관련 키워드 학습
        if (lowerMessage.includes('프로젝트') || lowerMessage.includes('개발')) {
            neroBotData.userPreferences.projectHistory.push({
                keyword: message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// 네로봇 응답 처리 (학습된 패턴 적용)
function handleNeroBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 학습된 패턴 기반 응답
    const learnedResponse = getLearnedResponse(userMessage);
    if (learnedResponse) {
        addMessage(learnedResponse, 'bot');
        saveConversation(learnedResponse, 'bot');
        return;
    }
    
    // 기본 응답 로직
    let response = '';
    
    if (lowerMessage.includes('개발일지') || lowerMessage.includes('일지')) {
        response = generateDevLog(userMessage);
    } else if (lowerMessage.includes('github') || lowerMessage.includes('커밋')) {
        response = 'GitHub 연동 기능은 현재 개발 중입니다! 곧 사용할 수 있을 예정이에요 🚀';
    } else if (lowerMessage.includes('안녕') || lowerMessage.includes('hello')) {
        response = getPersonalizedGreeting();
    } else if (lowerMessage.includes('어떻게') || lowerMessage.includes('도움')) {
        response = getContextualHelp();
    } else if (lowerMessage.includes('프로젝트') || lowerMessage.includes('작업')) {
        response = getProjectStatus();
    } else if (lowerMessage.includes('통계') || lowerMessage.includes('학습')) {
        response = showLearningStats();
    } else if (lowerMessage.includes('폼') || lowerMessage.includes('작성')) {
        response = '일지 작성 폼을 표시해드릴게요!';
        showDiaryForm();
    } else {
        response = getFallbackResponse(userMessage);
    }
    
    addMessage(response, 'bot');
    saveConversation(response, 'bot');
}

// 학습된 응답 가져오기
function getLearnedResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 이전 대화에서 유사한 패턴 찾기
    const similarConversations = neroBotData.conversations.filter(conv => 
        conv.sender === 'user' && 
        conv.message.toLowerCase().includes(lowerMessage.split(' ')[0])
    );
    
    if (similarConversations.length > 0) {
        // 유사한 대화의 응답 패턴 학습
        const lastSimilar = similarConversations[similarConversations.length - 1];
        const botResponse = neroBotData.conversations.find(conv => 
            conv.timestamp > lastSimilar.timestamp && conv.sender === 'bot'
        );
        
        if (botResponse) {
            return adaptResponse(botResponse.message, userMessage);
        }
    }
    
    return null;
}

// 응답 적응
function adaptResponse(templateResponse, currentMessage) {
    // 템플릿 응답을 현재 상황에 맞게 수정
    let adaptedResponse = templateResponse;
    
    // 날짜 정보 업데이트
    const today = new Date().toLocaleDateString('ko-KR');
    adaptedResponse = adaptedResponse.replace(/오늘/g, today);
    
    // 프로젝트 정보 업데이트
    adaptedResponse = adaptedResponse.replace(/프로젝트/g, 'nero developing diary');
    
    return adaptedResponse;
}

// 개인화된 인사말
function getPersonalizedGreeting() {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? '좋은 아침' : hour < 18 ? '좋은 오후' : '좋은 저녁';
    
    const recentActivity = neroBotData.userPreferences.favoriteCommands.slice(-3);
    let activityText = '';
    
    if (recentActivity.includes('diary')) {
        activityText = ' 최근에 개발일지를 자주 작성하시는군요!';
    } else if (recentActivity.includes('github')) {
        activityText = ' GitHub 작업에 관심이 많으시네요!';
    }
    
    return `${timeGreeting}이에요! 저는 네로봇입니다.${activityText} 어떤 도움이 필요하신가요?`;
}

// 컨텍스트 기반 도움말
function getContextualHelp() {
    const recentDiaries = diaries.length;
    const recentGoals = goals.length;
    
    let helpText = '저는 다음과 같은 도움을 드릴 수 있어요:\n\n';
    helpText += '📝 "어제 개발일지 작성해줘" - 특정 날짜 일지 자동 생성\n';
    helpText += '📝 "오늘 일지 요약해줘" - 오늘 일지 자동 생성\n';
    helpText += '📝 "9월 7일 일지 작성해줘" - 특정 날짜 일지 생성\n';
    helpText += '📝 "폼 보여줘" - 일지 작성 폼 표시\n';
    helpText += '🎯 "프로젝트 상태 알려줘" - 현재 진행 상황\n';
    helpText += '📊 "통계 보여줘" - 학습 통계 확인\n';
    helpText += '💡 "도움말" - 이 도움말 표시\n\n';
    
    if (recentDiaries > 0) {
        helpText += `현재 ${recentDiaries}개의 일지가 있네요!`;
    }
    if (recentGoals > 0) {
        helpText += ` ${recentGoals}개의 목표도 설정되어 있어요!`;
    }
    
    return helpText;
}

// 프로젝트 상태
function getProjectStatus() {
    const today = new Date().toISOString().split('T')[0];
    const todayDiary = diaries.find(diary => diary.date === today);
    
    let status = '현재 nero developing diary 프로젝트 진행 상황:\n\n';
    
    if (todayDiary) {
        status += '✅ 오늘의 일지 작성 완료\n';
    } else {
        status += '⏳ 오늘의 일지 작성 필요\n';
    }
    
    status += '🚀 네로봇 AI 시스템 활성화\n';
    status += '📅 달력 연동 완료\n';
    status += '🎨 테마 시스템 완료\n';
    status += '🔐 로그인 시스템 완료\n\n';
    status += '다음 단계: GitHub API 연동 예정!';
    
    return status;
}

// 폴백 응답
function getFallbackResponse(userMessage) {
    const suggestions = [
        '개발일지 요약해줘',
        '오늘 작업한 내용 정리해줘',
        '프로젝트 진행상황 알려줘',
        '도움말 보여줘'
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    return `죄송해요, 아직 그 질문에 대한 답변을 준비하지 못했어요. 대신 이런 명령어들을 시도해보세요:\n\n"${randomSuggestion}"\n\n더 많은 기능을 학습하고 있어요! 🧠`;
}

// 개발일지 생성
function generateDevLog(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // 날짜 파싱 (어제, 오늘, 특정 날짜)
    let targetDate = new Date();
    let dateStr = '';
    
    if (lowerMessage.includes('어제')) {
        targetDate.setDate(targetDate.getDate() - 1);
        dateStr = '어제';
    } else if (lowerMessage.includes('오늘')) {
        dateStr = '오늘';
    } else {
        // 특정 날짜가 언급된 경우 (예: "9월 7일")
        const dateMatch = userMessage.match(/(\d+)월\s*(\d+)일/);
        if (dateMatch) {
            const month = parseInt(dateMatch[1]);
            const day = parseInt(dateMatch[2]);
            const currentYear = new Date().getFullYear();
            targetDate = new Date(currentYear, month - 1, day);
            dateStr = `${month}월 ${day}일`;
        }
    }
    
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // 해당 날짜의 일지가 있는지 확인
    const existingDiary = diaries.find(diary => diary.date === targetDateStr);
    
    if (existingDiary) {
        addMessage(`${dateStr}(${targetDateStr})의 개발일지가 이미 있네요! 내용을 확인해보세요.`, 'bot');
    } else {
        // 자동으로 개발일지 생성
        const devLogContent = generateAutoDevLog(targetDate, dateStr);
        
        // 일지 폼 표시
        showDiaryForm();
        
        // 일지 폼에 자동 입력
        document.getElementById('diaryDate').value = targetDateStr;
        document.getElementById('diaryTitle').value = `${dateStr}의 개발 성과`;
        document.getElementById('diaryContent').value = devLogContent;
        
        addMessage(`${dateStr}의 개발일지를 자동으로 생성했습니다! 아래 폼에서 확인하고 저장해주세요.`, 'bot');
    }
}

// 일지 폼 표시
function showDiaryForm() {
    const diaryForm = document.getElementById('diaryForm');
    if (diaryForm) {
        diaryForm.style.display = 'block';
        // 폼으로 스크롤
        diaryForm.scrollIntoView({ behavior: 'smooth' });
    }
}

// 자동 개발일지 내용 생성
function generateAutoDevLog(targetDate, dateStr) {
    const dayOfWeek = targetDate.toLocaleDateString('ko-KR', { weekday: 'long' });
    const isToday = dateStr === '오늘';
    const isYesterday = dateStr === '어제';
    
    let timeReference = '';
    if (isToday) {
        timeReference = '오늘은';
    } else if (isYesterday) {
        timeReference = '어제는';
    } else {
        timeReference = `${dateStr}은`;
    }
    
    return `${timeReference} ${dayOfWeek}이었습니다.

🚀 주요 작업:
- nero developing diary 프로젝트 개발
- 네로봇 AI 챗봇 시스템 구현
- GitHub 연동 기능 설계
- 사용자 경험 개선

💡 학습한 내용:
- AI 챗봇 인터페이스 디자인
- 자동 일지 생성 시스템 구상
- 사용자 경험 개선 방법
- 학습형 AI 시스템 구현

🎯 ${isToday ? '내일의' : '다음' } 목표:
- GitHub API 연동 완료
- 더 정교한 AI 응답 시스템 구현
- 사용자 피드백 반영
- 성능 최적화

${isToday ? '오늘' : dateStr}도 열심히 개발했고, 새로운 기능을 성공적으로 구현할 수 있어서 뿌듯합니다!`;
}

// 피드백 시스템
function giveFeedback(message, feedback) {
    // 피드백 저장
    if (!neroBotData.learnedPatterns.userFeedback[message]) {
        neroBotData.learnedPatterns.userFeedback[message] = { helpful: 0, notHelpful: 0 };
    }
    
    neroBotData.learnedPatterns.userFeedback[message][feedback]++;
    
    // 데이터 저장
    localStorage.setItem('neroBotData', JSON.stringify(neroBotData));
    
    // 피드백 버튼 비활성화
    const feedbackBtns = document.querySelectorAll('.feedback-btn');
    feedbackBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    
    // 피드백 메시지 표시
    const feedbackMessage = feedback === 'helpful' ? 
        '감사합니다! 더 나은 도움을 드리도록 노력할게요! 😊' : 
        '피드백 감사합니다! 더 개선하도록 하겠습니다! 💪';
    
    setTimeout(() => {
        addMessage(feedbackMessage, 'bot');
        saveConversation(feedbackMessage, 'bot');
    }, 500);
}

// 학습 통계 표시
function showLearningStats() {
    const totalConversations = neroBotData.conversations.length;
    const favoriteCommands = neroBotData.userPreferences.favoriteCommands;
    const commandCounts = {};
    
    favoriteCommands.forEach(cmd => {
        commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
    });
    
    let stats = `📊 네로봇 학습 통계:\n\n`;
    stats += `💬 총 대화 수: ${totalConversations}개\n`;
    stats += `🎯 자주 사용하는 명령어:\n`;
    
    Object.entries(commandCounts).forEach(([cmd, count]) => {
        const emoji = cmd === 'diary' ? '📝' : cmd === 'github' ? '🐙' : cmd === 'goals' ? '🎯' : '💬';
        stats += `${emoji} ${cmd}: ${count}회\n`;
    });
    
    return stats;
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
