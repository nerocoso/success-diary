// 전역 변수
let diaries = JSON.parse(localStorage.getItem('diaries')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];

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

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 오늘 날짜를 기본값으로 설정
    document.getElementById('diaryDate').value = new Date().toISOString().split('T')[0];
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
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
        <div class="diary-item">
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
}

function deleteDiary(id) {
    if (confirm('정말로 이 일지를 삭제하시겠습니까?')) {
        diaries = diaries.filter(diary => diary.id !== id);
        localStorage.setItem('diaries', JSON.stringify(diaries));
        loadDiaries();
        updateStats();
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
