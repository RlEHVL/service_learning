// 전역 변수 및 상수
const STORAGE_KEY = 'attendance-system-data';
let currentClass = '1'; // 기본값: 1학년 1반
let studentData = {}; // 학생 데이터 저장
let attendanceHistory = {}; // 출결 기록 저장

// AI 분석기는 전역 변수로 사용 (ai_analyzer.js에서 생성됨)
// 모듈 로딩 관련 코드 제거

// 문서 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 기본 이벤트 설정
        updateCurrentDate();
        setupTabs();
        setupModalEvents(); // 모달 이벤트 설정 추가
        setupEventListeners();
        
        // 데이터 로드 및 초기화
        loadData();
        renderStudentList();
        
        // 기능 초기화
        initializeStatistics();
        initializeAITab();
        initializeSettings();
        initializePersonalChat();
        
        console.log('모든 초기화 완료');
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        alert('페이지 초기화 중 오류가 발생했습니다: ' + error.message);
    }
});

// 현재 날짜 표시
function updateCurrentDate() {
    const dateElem = document.getElementById('current-date');
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
    };
    dateElem.textContent = now.toLocaleDateString('ko-KR', options);
}

// 탭 전환 설정 (개선)
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 초기 상태 확인 - 활성 탭이 없으면 첫 번째 탭 활성화
    const hasActiveTab = Array.from(tabButtons).some(btn => btn.classList.contains('active'));
    if (!hasActiveTab && tabButtons.length > 0) {
        tabButtons[0].classList.add('active');
        const firstTabId = tabButtons[0].getAttribute('data-tab');
        const firstTab = document.getElementById(firstTabId);
        if (firstTab) firstTab.classList.add('active');
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 활성 탭 초기화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 클릭한 탭 활성화
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            
            if (tabContent) {
                tabContent.classList.add('active');
                
                // 탭 전환 시 필요한 작업
                if (tabId === 'statistics') {
                    renderStatistics();
                } else if (tabId === 'personal-chat') {
                    // 채팅 영역 스크롤 최하단으로
                    const chatMessages = document.getElementById('chat-messages');
                    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } else {
                console.error(`탭 콘텐츠를 찾을 수 없음: ${tabId}`);
            }
        });
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 학생 추가 버튼
    document.getElementById('add-student').addEventListener('click', showAddStudentModal);
    
    // 엑셀에서 가져오기 버튼
    document.getElementById('import-students').addEventListener('click', () => {
        document.getElementById('excel-upload').click();
    });
    
    // 엑셀 파일 업로드 처리
    document.getElementById('excel-upload').addEventListener('change', handleExcelImport);
    
    // 출결 저장 버튼
    document.getElementById('save-attendance').addEventListener('click', saveAttendance);
    
    // 데이터 내보내기 버튼
    document.getElementById('export-data').addEventListener('click', exportData);
    
    // 클래스 선택 변경 시
    document.getElementById('class-selector').addEventListener('change', (e) => {
        currentClass = e.target.value;
        renderStudentList();
    });
    
    // 통계 업데이트 버튼
    document.getElementById('update-stats').addEventListener('click', renderStatistics);
    
    // 다크 모드 전환
    document.getElementById('dark-mode').addEventListener('change', toggleDarkMode);
    
    // 모달 닫기 버튼
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    
    // API 키 저장
    document.getElementById('save-api-key').addEventListener('click', saveApiKey);
    
    // 분석 버튼들
    document.querySelectorAll('.analysis-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const analysisType = e.target.getAttribute('data-type');
            if (analysisType === 'custom') {
                document.getElementById('custom-analysis').style.display = 'block';
            } else {
                runAnalysis(analysisType);
            }
        });
    });
    
    // 사용자 정의 분석 실행
    document.getElementById('run-custom-analysis').addEventListener('click', () => {
        const prompt = document.getElementById('custom-prompt').value;
        if (prompt.trim()) {
            runCustomAnalysis(prompt);
        }
    });
    
    // 데이터 관리 버튼들
    document.getElementById('backup-data').addEventListener('click', backupData);
    document.getElementById('restore-data').addEventListener('click', showRestoreDataModal);
    document.getElementById('clear-data').addEventListener('click', showClearDataConfirmation);
    
    // 클래스 추가 버튼
    document.getElementById('add-class').addEventListener('click', showAddClassModal);
    
    // 서버 설정 관련 버튼 이벤트
    document.getElementById('save-server-settings').addEventListener('click', saveServerSettings);
    document.getElementById('test-server-connection').addEventListener('click', testServerConnection);
    document.getElementById('sync-data').addEventListener('click', syncDataWithServer);
    document.getElementById('fetch-server-data').addEventListener('click', fetchDataFromServer);
    
    // 로컬 모델 관련 이벤트
    document.getElementById('use-local-model').addEventListener('change', toggleLocalModel);
    document.getElementById('test-local-model').addEventListener('click', testLocalModel);
}

// 데이터 불러오기
function loadData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        const data = JSON.parse(savedData);
        studentData = data.students || {};
        attendanceHistory = data.attendance || {};
        
        // 학생 데이터가 없을 경우 기본 데이터 생성
        if (!studentData[currentClass]) {
            studentData[currentClass] = [];
        }
    } else {
        // 초기 데이터 생성
        initializeData();
    }
}

// 초기 데이터 생성
function initializeData() {
    studentData = {
        '1': [],
        '2': [],
        '3': []
    };
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    attendanceHistory = {
        [today]: {
            '1': {},
            '2': {},
            '3': {}
        }
    };
    
    saveData();
}

// 데이터 저장
function saveData() {
    const data = {
        students: studentData,
        attendance: attendanceHistory
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 학생 목록 렌더링
function renderStudentList() {
    const tbody = document.querySelector('#student-list tbody');
    tbody.innerHTML = '';
    
    // 현재 날짜의 출결 데이터 가져오기
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceHistory[today] || {};
    const classAttendance = todayAttendance[currentClass] || {};
    
    // 현재 클래스의 학생 목록 가져오기
    const students = studentData[currentClass] || [];
    
    // 통계 초기화
    let totalCount = students.length;
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    
    // 학생 목록 렌더링
    students.forEach(student => {
        const tr = document.createElement('tr');
        
        // 학생 출결 상태
        const attendance = classAttendance[student.id] || { status: 'present', reason: '', note: '' };
        
        // 통계 업데이트
        if (attendance.status === 'present') presentCount++;
        else if (attendance.status === 'late') lateCount++;
        else if (attendance.status === 'absent') absentCount++;
        
        // 학생 정보 및 출결 상태
        tr.innerHTML = `
            <td>${student.number}</td>
            <td>${student.name}</td>
            <td>
                <select class="attendance-status" data-student-id="${student.id}">
                    <option value="present" ${attendance.status === 'present' ? 'selected' : ''}>출석</option>
                    <option value="late" ${attendance.status === 'late' ? 'selected' : ''}>지각</option>
                    <option value="absent" ${attendance.status === 'absent' ? 'selected' : ''}>결석</option>
                </select>
            </td>
            <td>
                <input type="text" class="attendance-reason" data-student-id="${student.id}" 
                    value="${attendance.reason || ''}" placeholder="사유 입력...">
            </td>
            <td>
                <input type="text" class="attendance-note" data-student-id="${student.id}" 
                    value="${attendance.note || ''}" placeholder="비고...">
            </td>
            <td>
                <button class="edit-student" data-student-id="${student.id}">수정</button>
                <button class="delete-student" data-student-id="${student.id}">삭제</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // 통계 업데이트
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('late-count').textContent = lateCount;
    document.getElementById('absent-count').textContent = absentCount;
    
    // 학생 수정/삭제 버튼에 이벤트 연결
    document.querySelectorAll('.edit-student').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentId = parseInt(e.target.getAttribute('data-student-id'));
            const student = studentData[currentClass].find(s => s.id === studentId);
            if (student) {
                showEditStudentModal(student);
            }
        });
    });
    
    document.querySelectorAll('.delete-student').forEach(button => {
        button.addEventListener('click', (e) => {
            const studentId = parseInt(e.target.getAttribute('data-student-id'));
            showDeleteStudentConfirmation(studentId);
        });
    });
}

// 출결 저장
function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    
    // 출결 상태, 사유, 비고 가져오기
    const statusSelects = document.querySelectorAll('.attendance-status');
    const reasonInputs = document.querySelectorAll('.attendance-reason');
    const noteInputs = document.querySelectorAll('.attendance-note');
    
    // 해당 날짜의 출결 데이터가 없으면 생성
    if (!attendanceHistory[today]) {
        attendanceHistory[today] = {};
    }
    
    // 해당 클래스의 출결 데이터가 없으면 생성
    if (!attendanceHistory[today][currentClass]) {
        attendanceHistory[today][currentClass] = {};
    }
    
    // 출결 데이터 저장
    statusSelects.forEach((select, index) => {
        const studentId = parseInt(select.getAttribute('data-student-id'));
        const status = select.value;
        const reason = reasonInputs[index].value;
        const note = noteInputs[index].value;
        
        attendanceHistory[today][currentClass][studentId] = {
            status,
            reason,
            note
        };
    });
    
    // 데이터 저장
    saveData();
    
    // 저장 성공 알림
    showMessage('출결 정보가 저장되었습니다.');
    
    // 학생 목록 다시 렌더링
    renderStudentList();
}

// 학생 추가 모달 표시
function showAddStudentModal() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    
    modalTitle.textContent = '학생 추가';
    
    // 학생 정보 입력 폼
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="student-number">학생 번호:</label>
            <input type="number" id="student-number" min="1" step="1" required>
        </div>
        <div class="form-group">
            <label for="student-name">학생 이름:</label>
            <input type="text" id="student-name" required>
        </div>
    `;
    
    // 확인 버튼 이벤트
    modalConfirm.onclick = function() {
        const numberInput = document.getElementById('student-number');
        const nameInput = document.getElementById('student-name');
        
        const number = parseInt(numberInput.value);
        const name = nameInput.value.trim();
        
        if (!number || !name) {
            showMessage('학생 번호와 이름을 모두 입력해주세요.');
            return;
        }
        
        // 현재 클래스에 같은 번호의 학생이 있는지 확인
        const students = studentData[currentClass] || [];
        if (students.some(s => s.number === number)) {
            showMessage('이미 같은 번호의 학생이 존재합니다.');
            return;
        }
        
        // 학생 ID 생성 (현재 가장 큰 ID + 1)
        let maxId = 0;
        Object.values(studentData).forEach(classList => {
            classList.forEach(student => {
                if (student.id > maxId) maxId = student.id;
            });
        });
        
        // 새 학생 추가
        const newStudent = {
            id: maxId + 1,
            number,
            name
        };
        
        // 현재 클래스에 학생 추가
        if (!studentData[currentClass]) {
            studentData[currentClass] = [];
        }
        studentData[currentClass].push(newStudent);
        
        // 데이터 저장
        saveData();
        
        // 모달 닫기
        closeModal();
        
        // 학생 목록 다시 렌더링
        renderStudentList();
        
        showMessage('학생이 추가되었습니다.');
    };
    
    // 모달 표시
    document.getElementById('modal').style.display = 'block';
}

// 모달 닫기 (개선)
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 메시지 표시 (개선)
function showMessage(message) {
    // 모달 열기 방식으로 메시지 표시
    showModal('알림', message);
}

// 모달 표시 함수 추가
function showModal(title, content, confirmCallback = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    
    if (!modal || !modalTitle || !modalBody) {
        console.error('모달 요소를 찾을 수 없습니다');
        alert(content); // 폴백으로 기본 alert 사용
        return;
    }
    
    // 모달 내용 설정
    modalTitle.textContent = title;
    modalBody.innerHTML = `<p>${content}</p>`;
    
    // 확인 버튼 이벤트
    if (modalConfirm) {
        modalConfirm.onclick = confirmCallback || function() {
            modal.style.display = 'none';
        };
    }
    
    // 취소 버튼 - 항상 모달 닫기
    if (modalCancel) {
        modalCancel.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // 모달 표시
    modal.style.display = 'block';
}

// 엑셀 파일 가져오기 처리
function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showMessage('엑셀 가져오기 기능은 추가 라이브러리가 필요합니다. 현재 데모 버전에서는 사용할 수 없습니다.');
    
    // 파일 입력 초기화
    e.target.value = '';
}

// 데이터 내보내기
function exportData() {
    const data = {
        students: studentData,
        attendance: attendanceHistory,
        exportTime: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileName = `attendance_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    showMessage('데이터가 성공적으로 내보내기되었습니다.');
}

// 통계 초기화
function initializeStatistics() {
    // Chart.js를 이용한 차트 초기화
    const dailyCtx = document.getElementById('daily-chart').getContext('2d');
    const studentCtx = document.getElementById('student-chart').getContext('2d');
    
    // 초기 데이터 없이 차트 생성
    window.dailyChart = new Chart(dailyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '출석',
                    data: [],
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: '지각',
                    data: [],
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    borderColor: 'rgba(243, 156, 18, 1)',
                    borderWidth: 1
                },
                {
                    label: '결석',
                    data: [],
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    stepSize: 1
                }
            }
        }
    });
    
    window.studentChart = new Chart(studentCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: '출석률',
                    data: [],
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// 통계 렌더링 함수 추가
function renderStatistics() {
    try {
        console.log("통계 데이터 렌더링 중...");
        
        // 차트가 없으면 초기화
        if (!window.dailyChart || !window.studentChart) {
            console.warn("차트가 초기화되지 않았습니다. 초기화를 진행합니다.");
            initializeStatistics();
        }
        
        // 데이터 준비
        const dates = Object.keys(attendanceHistory).sort();
        const lastDays = dates.slice(-14); // 최근 14일 데이터만 표시
        
        // 출석/지각/결석 데이터
        const presentData = [];
        const lateData = [];
        const absentData = [];
        
        // 각 날짜별 출결 현황 계산
        lastDays.forEach(date => {
            const dayAttendance = attendanceHistory[date] || {};
            const classAttendance = dayAttendance[currentClass] || {};
            
            let presentCount = 0;
            let lateCount = 0;
            let absentCount = 0;
            
            // 해당 날짜의 모든 학생 출결 상태 확인
            Object.values(classAttendance).forEach(status => {
                if (status.status === 'present') presentCount++;
                else if (status.status === 'late') lateCount++;
                else if (status.status === 'absent') absentCount++;
            });
            
            presentData.push(presentCount);
            lateData.push(lateCount);
            absentData.push(absentCount);
        });
        
        // 날짜 형식 변환 (YYYY-MM-DD -> MM-DD)
        const formattedDates = lastDays.map(date => {
            const parts = date.split('-');
            return `${parts[1]}-${parts[2]}`;
        });
        
        // 일별 출결 차트 업데이트
        window.dailyChart.data.labels = formattedDates;
        window.dailyChart.data.datasets[0].data = presentData;
        window.dailyChart.data.datasets[1].data = lateData;
        window.dailyChart.data.datasets[2].data = absentData;
        window.dailyChart.update();
        
        // 학생별 출석률 차트 데이터 준비
        const students = studentData[currentClass] || [];
        const studentNames = students.map(s => s.name);
        const attendanceRates = [];
        
        // 각 학생의 출석률 계산
        students.forEach(student => {
            let totalDays = 0;
            let presentDays = 0;
            
            // 모든 날짜에 대해 학생의 출결 상태 확인
            Object.keys(attendanceHistory).forEach(date => {
                const dayAttendance = attendanceHistory[date] || {};
                const classAttendance = dayAttendance[currentClass] || {};
                
                if (classAttendance[student.id]) {
                    totalDays++;
                    if (classAttendance[student.id].status === 'present') {
                        presentDays++;
                    }
                }
            });
            
            // 출석률 계산 (0-100%)
            const rate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
            attendanceRates.push(Math.round(rate));
        });
        
        // 학생별 출석률 차트 업데이트
        window.studentChart.data.labels = studentNames;
        window.studentChart.data.datasets[0].data = attendanceRates;
        window.studentChart.update();
        
        console.log("통계 데이터 렌더링 완료");
    } catch (error) {
        console.error("통계 렌더링 중 오류 발생:", error);
        showMessage("통계 데이터를 처리하는 중 오류가 발생했습니다: " + error.message);
    }
}

// API 키 저장
function saveApiKey() {
    if (!attendanceAnalyzer) {
        showMessage('AI 분석 모듈이 로드되지 않았습니다. 로컬 웹 서버에서 실행해주세요.');
        return;
    }
    
    const apiKey = document.getElementById('api-key').value.trim();
    if (!apiKey) {
        showMessage('API 키를 입력해주세요.');
        return;
    }
    
    if (attendanceAnalyzer.setApiKey(apiKey)) {
        showMessage('DeepSeek API 키가 저장되었습니다.');
    } else {
        showMessage('API 키 저장 중 오류가 발생했습니다.');
    }
}

// AI 분석 탭 초기화
function initializeAITab() {
    // 저장된 API 키가 있으면 불러오기
    const apiKey = localStorage.getItem('ai-api-key');
    if (apiKey) {
        // 마스킹 처리된 API 키 표시
        const maskedKey = apiKey.substring(0, 3) + '...' + apiKey.substring(apiKey.length - 4);
        document.getElementById('api-key').value = maskedKey;
        document.getElementById('api-key').placeholder = '저장된 API 키가 있습니다';
    }
    
    // 사용자 정의 분석 영역 초기화
    document.getElementById('custom-analysis').style.display = 'none';
}

// 설정 탭 초기화 - 추가
function initializeSettings() {
    console.log("설정 탭 초기화 중...");
    
    // 모듈이 로드되었는지 확인
    if (!window.attendanceAnalyzer) {
        console.warn("AI 분석 모듈이 로드되지 않았습니다.");
        
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = '모듈 로드 실패';
            statusElement.style.color = 'red';
        }
        
        const serverActions = document.querySelector('.server-actions');
        if (serverActions) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'AI 분석 모듈 로드에 실패했습니다. 모듈을 사용하려면 로컬 웹 서버에서 실행해주세요.';
            serverActions.before(errorMsg);
            
            // 버튼 비활성화
            document.querySelectorAll('.server-actions button').forEach(btn => {
                btn.disabled = true;
            });
        }
    }
    
    // 서버 설정 불러오기
    const serverEndpoint = localStorage.getItem('server-endpoint');
    if (serverEndpoint) {
        const endpointInput = document.getElementById('server-endpoint');
        if (endpointInput) endpointInput.value = serverEndpoint;
    }
    
    // 서버 API 키가 있으면 마스킹 처리하여 표시
    const serverApiKey = localStorage.getItem('server-api-key');
    if (serverApiKey) {
        const keyInput = document.getElementById('server-api-key');
        if (keyInput) {
            const maskedKey = serverApiKey.substring(0, 3) + '...' + serverApiKey.substring(serverApiKey.length - 4);
            keyInput.value = maskedKey;
            keyInput.placeholder = '저장된 API 키가 있습니다';
        }
    }
    
    // 서버 동기화 설정 불러오기
    const enableServerSync = localStorage.getItem('enable-server-sync') === 'true';
    const syncCheckbox = document.getElementById('enable-server-sync');
    if (syncCheckbox) syncCheckbox.checked = enableServerSync;
    
    // 로컬 모델 사용 설정 불러오기 (기본값은 true)
    const useLocalModelSetting = localStorage.getItem('use-local-model');
    const useLocalModel = useLocalModelSetting === null ? true : useLocalModelSetting === 'true';
    
    // 로컬 모델 설정이 없으면 기본값으로 저장
    if (useLocalModelSetting === null) {
        localStorage.setItem('use-local-model', 'true');
    }
    
    const localModelCheckbox = document.getElementById('use-local-model');
    if (localModelCheckbox) {
        localModelCheckbox.checked = useLocalModel;
        
        // 변경 이벤트 연결
        localModelCheckbox.addEventListener('change', (e) => {
            toggleLocalModel(e);
        });
    }
    
    // 로컬 모델 상태 업데이트
    updateLocalModelStatus();
    
    // 마지막 동기화 시간 표시
    const lastSync = localStorage.getItem('last-sync-time');
    const lastSyncElement = document.getElementById('last-sync');
    if (lastSync && lastSyncElement) {
        lastSyncElement.textContent = formatDateTime(lastSync);
    }
    
    // 서버 연결 상태 표시
    updateConnectionStatus();
    
    // 테스트 버튼 이벤트 연결
    const testLocalModelButton = document.getElementById('test-local-model');
    if (testLocalModelButton) {
        testLocalModelButton.addEventListener('click', () => {
            testLocalModel();
        });
    }
    
    console.log("설정 탭 초기화 완료");
}

// 로컬 모델 사용 상태 토글
function toggleLocalModel(e) {
    const useLocalModel = e.target.checked;
    
    // 로컬 모델 사용 설정 저장
    localStorage.setItem('use-local-model', useLocalModel ? 'true' : 'false');
    
    // 상태 업데이트
    updateLocalModelStatus();
    
    // 메시지 표시
    showMessage(`DeepSeek 로컬 모델이 ${useLocalModel ? '활성화' : '비활성화'}되었습니다.`);
}

// 로컬 모델 상태 업데이트
function updateLocalModelStatus() {
    const statusElement = document.getElementById('local-model-status');
    if (!statusElement) return;
    
    const useLocalModel = localStorage.getItem('use-local-model') !== 'false'; // 기본값은 true
    
    if (useLocalModel) {
        statusElement.textContent = '활성화됨 (연결 테스트 필요)';
        statusElement.style.color = '#f90';
    } else {
        statusElement.textContent = '비활성화됨';
        statusElement.style.color = '#999';
    }
}

// 로컬 모델 연결 테스트
async function testLocalModel() {
    const statusElement = document.getElementById('local-model-status');
    if (!statusElement) return;
    
    // 테스트 중 상태 표시
    statusElement.textContent = '연결 테스트 중...';
    statusElement.style.color = '#f90';
    
    try {
        // 서버 상태 확인 (status 엔드포인트 사용)
        const response = await fetch('http://localhost:8080/api/status', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'online') {
                statusElement.textContent = `연결됨 (${data.model || 'DeepSeek 모델'})`;
                statusElement.style.color = 'green';
                showMessage('로컬 모델 서버에 성공적으로 연결되었습니다!');
                
                // 로컬 모델 사용 설정 활성화
                localStorage.setItem('use-local-model', 'true');
                const checkbox = document.getElementById('use-local-model');
                if (checkbox) checkbox.checked = true;
                
                return;
            }
        }
        
        // 응답이 정상이 아니면 실패 처리
        statusElement.textContent = '연결 실패';
        statusElement.style.color = 'red';
        showMessage('로컬 모델 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        
    } catch (error) {
        console.error('로컬 모델 테스트 중 오류:', error);
        statusElement.textContent = '연결 오류';
        statusElement.style.color = 'red';
        showMessage(`로컬 모델 서버에 연결할 수 없습니다. 서버를 실행해주세요: python ai/local_model.py --use-cpu`);
    }
}

// 개인 챗 기능 구현
function initializePersonalChat() {
    console.log("개인 챗 초기화 중...");
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const clearChatButton = document.getElementById('clear-chat');
    const saveChatButton = document.getElementById('save-chat');
    
    if (!chatMessages || !chatInput || !sendButton) {
        console.error("채팅 요소를 찾을 수 없습니다.");
        return;
    }
    
    // 채팅 기록 로드
    loadChatHistory();
    
    // 이벤트 리스너 제거 및 추가 (중복 방지)
    sendButton.onclick = null; // 기존 이벤트 제거
    sendButton.onclick = sendChatMessage; // 직접 함수 참조 할당
    
    // Enter 키로 메시지 전송
    chatInput.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };
    
    // 채팅 내용 지우기
    if (clearChatButton) {
        clearChatButton.onclick = function() {
            if (confirm('모든 대화 내용을 지우시겠습니까?')) {
                chatMessages.innerHTML = `
                    <div class="message system">
                        <div class="message-content">
                            <p>안녕하세요! 학급 출결 관리 시스템 AI 비서입니다. 무엇을 도와드릴까요?</p>
                        </div>
                    </div>
                `;
                // 로컬 스토리지에서 채팅 기록 삭제
                localStorage.removeItem('chat-history');
            }
        };
    }
    
    // 채팅 저장
    if (saveChatButton) {
        saveChatButton.onclick = function() {
            saveChatToFile();
        };
    }
    
    // 빠른 질문 버튼 이벤트
    const questionButtons = document.querySelectorAll('.question-button');
    questionButtons.forEach(button => {
        button.onclick = function() {
            const question = this.getAttribute('data-question');
            if (question && chatInput) {
                chatInput.value = question;
                sendChatMessage();
            }
        };
    });
    
    console.log("개인 챗 초기화 완료");
}

// 채팅 메시지 전송 (단순화)
function sendChatMessage() {
    console.log("메시지 전송 함수 실행됨!!!");
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    
    if (!chatMessages || !chatInput) {
        console.error("채팅 요소를 찾을 수 없습니다.");
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) {
        console.log("메시지가 비어있습니다.");
        return;
    }
    
    console.log("전송할 메시지:", message);
    
    // 버튼 비활성화
    if (sendButton) {
        sendButton.disabled = true;
    }
    
    // 사용자 메시지 추가
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(userDiv);
    chatInput.value = '';
    
    // 스크롤 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 로딩 인디케이터 추가
    const loadingId = 'loading-' + Date.now();
    const loadingElement = document.createElement('div');
    loadingElement.className = 'message ai';
    loadingElement.id = loadingId;
    loadingElement.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(loadingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 컨텍스트 데이터
    const context = {
        studentData: studentData || {},
        attendanceHistory: attendanceHistory || {},
        currentDate: new Date().toISOString().split('T')[0]
    };
    
    // 간단한 방식으로 API 요청
    fetch('http://localhost:8080/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: `학급 출결 관리 시스템 AI 비서로서 다음 질문에 답변해주세요.\n질문: ${message}\n컨텍스트: ${JSON.stringify(context)}`,
            max_length: 1000,
            temperature: 0.7
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("API 응답 받음:", data);
        
        // 로딩 인디케이터 제거
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // 실제 응답 추출 및 디버깅
        let responseText = "응답을 받지 못했습니다.";
        
        if (data && typeof data === 'object') {
            if (data.response) {
                responseText = data.response;
                console.log("응답 텍스트:", responseText);
            } else {
                console.error("응답에 response 필드가 없습니다:", data);
            }
        } else {
            console.error("응답이 객체가 아닙니다:", data);
        }
        
        // AI 응답 추가 (단순 방식)
        const aiDiv = document.createElement('div');
        aiDiv.className = 'message ai';
        aiDiv.innerHTML = `
            <div class="message-content">
                <p>${responseText.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        chatMessages.appendChild(aiDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 채팅 기록 저장
        saveChatHistory();
    })
    .catch(error => {
        console.error("API 오류:", error);
        
        // 로딩 인디케이터 제거
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // 오류 메시지 추가
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message system';
        errorDiv.innerHTML = `
            <div class="message-content">
                <p>오류가 발생했습니다: ${error.message}. 서버가 실행 중인지 확인해주세요.</p>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    })
    .finally(() => {
        // 버튼 다시 활성화
        if (sendButton) {
            sendButton.disabled = false;
        }
    });
}

// AI 응답 가져오기 (개선)
async function fetchAIResponse(message, context) {
    console.log("AI 응답 요청:", message);
    
    // AI 애널라이저 가져오기
    const aiAnalyzer = window.attendanceAnalyzer;
    if (!aiAnalyzer) {
        appendSystemMessage('AI 분석기가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    try {
        // 출결 데이터 가져오기 (AI에게 컨텍스트 제공)
        const attendanceData = {
            studentData: studentData || {},
            attendanceHistory: attendanceHistory || {},
            currentDate: new Date().toISOString().split('T')[0]
        };
        
        // 채팅 메시지용 컨텍스트 변환
        const chatContext = context.map(msg => {
            return {
                role: msg.role,
                content: msg.content
            };
        });
        
        // AI 애널라이저를 통해 응답 생성
        const response = await aiAnalyzer.generateChatResponse(message, chatContext, attendanceData);
        
        // 로딩 인디케이터 제거
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // AI 응답 추가
        appendAIMessage(response);
        
        // 채팅 기록 저장
        saveChatHistory();
        
        // 버튼 다시 활성화
        if (sendButton) {
            sendButton.disabled = false;
        }
    } catch (error) {
        console.error("AI 응답 생성 오류:", error);
        
        // 로딩 인디케이터 제거
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // 오류 메시지 추가
        appendSystemMessage(`오류가 발생했습니다: ${error.message}. 서버가 실행 중인지 확인해주세요.`);
        
        // 버튼 다시 활성화
        if (sendButton) {
            sendButton.disabled = false;
        }
    }
}

// 사용자 메시지 추가
function appendUserMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// AI 메시지 추가
function appendAIMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai';
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${formatAIResponse(message)}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 시스템 메시지 추가
function appendSystemMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 채팅 기록 저장
function saveChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        localStorage.setItem('chat-history', chatMessages.innerHTML);
    }
}

// 채팅 기록 로드
function loadChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    try {
        const history = localStorage.getItem('chat-history');
        if (history) {
            chatMessages.innerHTML = history;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('채팅 기록 로드 중 오류:', error);
    }
}

// 채팅 내용을 파일로 저장
function saveChatToFile() {
    const chatMessages = document.getElementById('chat-messages');
    const messages = chatMessages.querySelectorAll('.message');
    
    let chatText = '=== 학급 출결 관리 시스템 채팅 기록 ===\n';
    chatText += `저장 시간: ${new Date().toLocaleString()}\n\n`;
    
    messages.forEach(message => {
        if (message.classList.contains('user')) {
            chatText += `[사용자] ${message.querySelector('p').textContent}\n\n`;
        } else if (message.classList.contains('ai')) {
            chatText += `[AI 비서] ${message.querySelector('p').textContent}\n\n`;
        } else if (message.classList.contains('system')) {
            chatText += `[시스템] ${message.querySelector('p').textContent}\n\n`;
        }
    });
    
    // 파일 다운로드
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `채팅기록_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// AI 응답 텍스트 포맷팅 함수
function formatAIResponse(text) {
    if (!text) return '';
    
    // 마크다운 스타일 볼드 변환 (**텍스트**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 마크다운 스타일 이탤릭 변환 (*텍스트*)
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 인용문 변환 (>로 시작하는 줄)
    text = text.replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>');
    
    // 코드 블록 변환 (```로 둘러싸인 블록)
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // 인라인 코드 변환 (`로 둘러싸인 텍스트)
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 줄바꿈 처리
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// 날짜/시간 포맷팅 함수
function formatDateTime(dateTimeStr) {
    try {
        const dt = new Date(dateTimeStr);
        return dt.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        console.error('날짜 형식 변환 오류:', e);
        return dateTimeStr || '알 수 없음';
    }
}

// 모달 관련 기능 개선
function setupModalEvents() {
    // 모달 닫기 버튼 (X 버튼)
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = document.getElementById('modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // ESC 키로 모달 닫기
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modal');
            if (modal && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        }
    });
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 모달 취소 버튼
    const cancelButton = document.getElementById('modal-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            const modal = document.getElementById('modal');
            if (modal) modal.style.display = 'none';
        });
    }
}

// 서버 연결 상태 업데이트 함수
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    try {
        // 서버 설정 불러오기
        const serverEndpoint = localStorage.getItem('server-endpoint');
        const serverSync = localStorage.getItem('enable-server-sync') === 'true';
        
        if (!serverEndpoint || !serverSync) {
            statusElement.textContent = '연결 안됨';
            statusElement.style.color = '#999';
            return;
        }
        
        // 마지막 동기화 시간 확인
        const lastSync = localStorage.getItem('last-sync-time');
        
        if (!lastSync) {
            statusElement.textContent = '연결 설정됨 (동기화 필요)';
            statusElement.style.color = '#f90';
        } else {
            const syncTime = new Date(lastSync);
            const now = new Date();
            const hoursSinceSync = (now - syncTime) / (1000 * 60 * 60);
            
            if (hoursSinceSync < 24) {
                statusElement.textContent = '연결됨';
                statusElement.style.color = 'green';
            } else {
                statusElement.textContent = '연결됨 (동기화 권장)';
                statusElement.style.color = '#f90';
            }
        }
    } catch (error) {
        console.error('연결 상태 업데이트 중 오류:', error);
        statusElement.textContent = '상태 확인 오류';
        statusElement.style.color = 'red';
    }
}

// 서버 설정 저장
function saveServerSettings() {
    const endpoint = document.getElementById('server-endpoint').value.trim();
    const apiKey = document.getElementById('server-api-key').value.trim();
    const enableSync = document.getElementById('enable-server-sync').checked;
    
    if (!endpoint) {
        showMessage('서버 엔드포인트를 입력해주세요.');
        return;
    }
    
    // 엔드포인트 URL 검증
    try {
        new URL(endpoint);
    } catch (e) {
        showMessage('유효한 URL을 입력해주세요.');
        return;
    }
    
    // 설정 저장
    localStorage.setItem('server-endpoint', endpoint);
    localStorage.setItem('enable-server-sync', enableSync);
    
    // API 키가 있으면 저장 (마스킹 처리된 키는 저장하지 않음)
    if (apiKey && !apiKey.includes('...')) {
        localStorage.setItem('server-api-key', apiKey);
    }
    
    // 상태 업데이트
    updateConnectionStatus();
    
    showMessage('서버 설정이 저장되었습니다.');
}

// 서버 연결 테스트
async function testServerConnection() {
    const statusElement = document.getElementById('connection-status');
    const endpoint = localStorage.getItem('server-endpoint');
    const apiKey = localStorage.getItem('server-api-key');
    
    if (!endpoint) {
        showMessage('서버 설정을 먼저 저장해주세요.');
        return;
    }
    
    try {
        statusElement.textContent = '연결 테스트 중...';
        statusElement.style.color = '#f90';
        
        // API 엔드포인트 구성
        const url = `${endpoint}/status`;
        
        // 연결 테스트
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            }
        });
        
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'ok' || data.status === 'online') {
            statusElement.textContent = '연결됨';
            statusElement.style.color = 'green';
            showMessage('서버에 성공적으로 연결되었습니다.');
            
            // 현재 시간을 마지막 연결 시간으로 저장
            localStorage.setItem('last-connection', new Date().toISOString());
            
            return true;
        } else {
            throw new Error('서버 상태가 정상이 아닙니다.');
        }
    } catch (error) {
        console.error('서버 연결 테스트 중 오류:', error);
        statusElement.textContent = '연결 실패';
        statusElement.style.color = 'red';
        showMessage(`서버 연결에 실패했습니다: ${error.message}`);
        return false;
    }
}

// 서버와 데이터 동기화
async function syncDataWithServer() {
    // 서버 연결 확인
    const isConnected = await testServerConnection();
    if (!isConnected) {
        return;
    }
    
    try {
        // 현재 데이터 가져오기
        const data = {
            students: studentData,
            attendance: attendanceHistory,
            syncTime: new Date().toISOString()
        };
        
        // 서버 설정 불러오기
        const endpoint = localStorage.getItem('server-endpoint');
        const apiKey = localStorage.getItem('server-api-key');
        
        // API 엔드포인트 구성
        const url = `${endpoint}/sync`;
        
        // 서버로 데이터 전송
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 마지막 동기화 시간 저장
        localStorage.setItem('last-sync-time', new Date().toISOString());
        
        // 연결 상태 업데이트
        updateConnectionStatus();
        
        showMessage('데이터가 서버와 성공적으로 동기화되었습니다.');
        return true;
        
    } catch (error) {
        console.error('데이터 동기화 중 오류:', error);
        showMessage(`데이터 동기화에 실패했습니다: ${error.message}`);
        return false;
    }
}

// 서버에서 데이터 가져오기
async function fetchDataFromServer() {
    // 서버 연결 확인
    const isConnected = await testServerConnection();
    if (!isConnected) {
        return;
    }
    
    try {
        // 서버 설정 불러오기
        const endpoint = localStorage.getItem('server-endpoint');
        const apiKey = localStorage.getItem('server-api-key');
        
        // API 엔드포인트 구성
        const url = `${endpoint}/data`;
        
        // 서버에서 데이터 가져오기
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            }
        });
        
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 확인 메시지 표시
        if (confirm('서버에서 데이터를 가져오면 현재 데이터가 덮어씌워집니다. 계속하시겠습니까?')) {
            // 데이터 적용
            studentData = data.students || {};
            attendanceHistory = data.attendance || {};
            
            // 데이터 저장
            saveData();
            
            // 마지막 동기화 시간 저장
            localStorage.setItem('last-sync-time', new Date().toISOString());
            
            // 연결 상태 업데이트
            updateConnectionStatus();
            
            // 학생 목록 다시 렌더링
            renderStudentList();
            
            showMessage('서버에서 데이터를 성공적으로 가져왔습니다.');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('서버에서 데이터 가져오기 중 오류:', error);
        showMessage(`서버에서 데이터 가져오기에 실패했습니다: ${error.message}`);
        return false;
    }
}

// 학급 추가 모달 표시
function showAddClassModal() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    
    modalTitle.textContent = '학급 추가';
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="class-name">학급 이름:</label>
            <input type="text" id="class-name" required>
        </div>
    `;
    
    modalConfirm.onclick = function() {
        const className = document.getElementById('class-name').value.trim();
        if (!className) {
            showMessage('학급 이름을 입력해주세요.');
            return;
        }
        
        // 이미 존재하는 학급인지 확인
        if (studentData[className]) {
            showMessage('이미 같은 이름의 학급이 존재합니다.');
            return;
        }
        
        // 새 학급 추가
        studentData[className] = [];
        
        // 출결 기록에도 해당 학급 추가
        Object.keys(attendanceHistory).forEach(date => {
            if (!attendanceHistory[date][className]) {
                attendanceHistory[date][className] = {};
            }
        });
        
        // 데이터 저장
        saveData();
        
        // 학급 선택기 업데이트
        updateClassSelector();
        
        // 모달 닫기
        closeModal();
        
        showMessage(`${className} 학급이 추가되었습니다.`);
    };
    
    // 모달 표시
    document.getElementById('modal').style.display = 'block';
}

// 학급 선택기 업데이트
function updateClassSelector() {
    const selector = document.getElementById('class-selector');
    const classes = Object.keys(studentData).sort();
    
    // 기존 옵션 제거
    selector.innerHTML = '';
    
    // 새 옵션 추가
    classes.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className + '반';
        selector.appendChild(option);
    });
    
    // 현재 선택된 학급 유지
    if (classes.includes(currentClass)) {
        selector.value = currentClass;
    } else if (classes.length > 0) {
        // 현재 학급이 없으면 첫 번째 학급 선택
        currentClass = classes[0];
        selector.value = currentClass;
    }
}

// 데이터 백업
function backupData() {
    try {
        const data = {
            students: studentData,
            attendance: attendanceHistory,
            backupTime: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileName = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        showMessage('데이터가 성공적으로 백업되었습니다.');
    } catch (error) {
        console.error('데이터 백업 중 오류:', error);
        showMessage('데이터 백업 중 오류가 발생했습니다: ' + error.message);
    }
}

// 데이터 복원 모달 표시
function showRestoreDataModal() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    
    modalTitle.textContent = '데이터 복원';
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="restore-file">백업 파일 선택:</label>
            <input type="file" id="restore-file" accept=".json">
        </div>
        <p class="warning">주의: 기존 데이터가 모두 덮어씌워집니다.</p>
    `;
    
    modalConfirm.onclick = function() {
        const fileInput = document.getElementById('restore-file');
        const file = fileInput.files[0];
        
        if (!file) {
            showMessage('복원할 파일을 선택해주세요.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // 데이터 유효성 검사
                if (!data.students || !data.attendance) {
                    throw new Error('유효하지 않은 백업 파일입니다.');
                }
                
                // 데이터 복원
                studentData = data.students;
                attendanceHistory = data.attendance;
                
                // 데이터 저장
                saveData();
                
                // 학급 선택기 업데이트
                updateClassSelector();
                
                // 학생 목록 다시 렌더링
                renderStudentList();
                
                // 모달 닫기
                closeModal();
                
                showMessage('데이터가 성공적으로 복원되었습니다.');
            } catch (error) {
                console.error('데이터 복원 중 오류:', error);
                showMessage('데이터 복원 중 오류가 발생했습니다: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    // 모달 표시
    document.getElementById('modal').style.display = 'block';
}

// 데이터 초기화 확인 모달 표시
function showClearDataConfirmation() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    
    modalTitle.textContent = '데이터 초기화';
    modalBody.innerHTML = `
        <p class="warning">경고: 모든 학생 정보와 출결 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
        <div class="form-group">
            <label for="confirm-text">확인을 위해 "초기화"를 입력하세요:</label>
            <input type="text" id="confirm-text" required>
        </div>
    `;
    
    modalConfirm.onclick = function() {
        const confirmText = document.getElementById('confirm-text').value;
        
        if (confirmText !== '초기화') {
            showMessage('"초기화"를 정확히 입력해주세요.');
            return;
        }
        
        // 데이터 초기화
        initializeData();
        
        // 학급 선택기 업데이트
        updateClassSelector();
        
        // 학생 목록 다시 렌더링
        renderStudentList();
        
        // 모달 닫기
        closeModal();
        
        showMessage('모든 데이터가 초기화되었습니다.');
    };
    
    // 모달 표시
    document.getElementById('modal').style.display = 'block';
}

// 학생 삭제 확인 모달 표시
function showDeleteStudentConfirmation(studentId) {
    const student = studentData[currentClass].find(s => s.id === studentId);
    
    if (!student) {
        showMessage('학생을 찾을 수 없습니다.');
        return;
    }
    
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    
    modalTitle.textContent = '학생 삭제';
    modalBody.innerHTML = `
        <p>정말 ${student.name} 학생을 삭제하시겠습니까?</p>
        <p class="warning">이 학생의 모든 출결 기록도 함께 삭제됩니다.</p>
    `;
    
    modalConfirm.onclick = function() {
        // 학생 삭제
        studentData[currentClass] = studentData[currentClass].filter(s => s.id !== studentId);
        
        // 출결 기록에서도 해당 학생 데이터 삭제
        Object.keys(attendanceHistory).forEach(date => {
            if (attendanceHistory[date][currentClass] && attendanceHistory[date][currentClass][studentId]) {
                delete attendanceHistory[date][currentClass][studentId];
            }
        });
        
        // 데이터 저장
        saveData();
        
        // 학생 목록 다시 렌더링
        renderStudentList();
        
        // 모달 닫기
        closeModal();
        
        showMessage(`${student.name} 학생이 삭제되었습니다.`);
    };
    
    // 모달 표시
    document.getElementById('modal').style.display = 'block';
}

// 학생 수정 모달 표시
function showEditStudentModal(student) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    
    modalTitle.textContent = '학생 정보 수정';
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="edit-student-number">학생 번호:</label>
            <input type="number" id="edit-student-number" min="1" step="1" value="${student.number}" required>
        </div>
        <div class="form-group">
            <label for="edit-student-name">학생 이름:</label>
            <input type="text" id="edit-student-name" value="${student.name}" required>
        </div>
    `;
    
    modalConfirm.onclick = function() {
        const numberInput = document.getElementById('edit-student-number');
        const nameInput = document.getElementById('edit-student-name');
        
        const number = parseInt(numberInput.value);
        const name = nameInput.value.trim();
        
        if (!number || !name) {
            showMessage('학생 번호와 이름을 모두 입력해주세요.');
            return;
        }
        
        // 다른 학생과 번호가 중복되는지 확인
        const duplicateStudent = studentData[currentClass].find(s => s.id !== student.id && s.number === number);
        if (duplicateStudent) {
            showMessage('이미 같은 번호의 학생이 존재합니다.');
            return;
        }
        
        // 학생 정보 업데이트
        const index = studentData[currentClass].findIndex(s => s.id === student.id);
        if (index !== -1) {
            studentData[currentClass][index].number = number;
            studentData[currentClass][index].name = name;
            
            // 데이터 저장
            saveData();
            
            // 학생 목록 다시 렌더링
            renderStudentList();
            
            // 모달 닫기
            closeModal();
            
            showMessage('학생 정보가 수정되었습니다.');
        }
    };
    
    // 모달 표시
    document.getElementById('modal').style.display = 'block';
}

// AI 분석 실행
function runAnalysis(analysisType) {
    const analysisOutput = document.getElementById('analysis-output');
    const loadingIndicator = document.getElementById('analysis-loading');
    
    if (!analysisOutput || !loadingIndicator) {
        console.error('분석 출력 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 로컬 모델 설정 확인
    const useLocalModel = localStorage.getItem('use-local-model') === 'true';
    if (!useLocalModel) {
        showMessage('분석을 위해 로컬 모델을 활성화해주세요.');
        return;
    }
    
    // 로딩 표시
    loadingIndicator.style.display = 'block';
    analysisOutput.textContent = '분석 중...';
    
    // 데이터 준비
    const data = {
        students: studentData,
        attendance: attendanceHistory,
        currentClass: currentClass
    };
    
    // 분석 유형에 따른 프롬프트 생성
    let prompt = '';
    switch (analysisType) {
        case 'absent':
            prompt = '결석이 많은 학생을 찾아 순위를 매겨주세요. 각 학생별 결석 일수와 특이사항을 포함해주세요.';
            break;
        case 'pattern':
            prompt = '출결 패턴을 분석해서 특이한 점이나 규칙성을 찾아주세요. 특정 요일에 결석/지각이 많은지, 특정 학생의 패턴이 있는지 확인해주세요.';
            break;
        case 'improvement':
            prompt = '최근 한 달간 출결 상황이 개선되거나 악화된 학생들을 분석해주세요. 변화 추이와 특이사항을 포함해주세요.';
            break;
        case 'summary':
            prompt = '현재 선택된 학급의 전체 출결 현황을 요약해주세요. 출석률, 지각/결석 비율, 특이사항 등을 포함해주세요.';
            break;
        default:
            prompt = '현재 학급의 출결 데이터를 분석하여 중요한 인사이트를 제공해주세요.';
    }
    
    // API 요청
    fetch('http://localhost:8080/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            data: data,
            max_length: 1000,
            temperature: 0.7
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        // 로딩 숨기기
        loadingIndicator.style.display = 'none';
        
        // 분석 결과 표시
        analysisOutput.innerHTML = formatAIResponse(result.response || '분석 결과가 없습니다.');
    })
    .catch(error => {
        console.error('분석 중 오류:', error);
        
        // 로딩 숨기기
        loadingIndicator.style.display = 'none';
        
        // 오류 메시지 표시
        analysisOutput.textContent = `분석 중 오류가 발생했습니다: ${error.message}`;
    });
}

// 사용자 정의 분석 실행
function runCustomAnalysis(prompt) {
    // 기본 분석과 동일한 로직 사용, 프롬프트만 다름
    const analysisOutput = document.getElementById('analysis-output');
    const loadingIndicator = document.getElementById('analysis-loading');
    
    if (!analysisOutput || !loadingIndicator) {
        console.error('분석 출력 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 로컬 모델 설정 확인
    const useLocalModel = localStorage.getItem('use-local-model') === 'true';
    if (!useLocalModel) {
        showMessage('분석을 위해 로컬 모델을 활성화해주세요.');
        return;
    }
    
    // 로딩 표시
    loadingIndicator.style.display = 'block';
    analysisOutput.textContent = '분석 중...';
    
    // 데이터 준비
    const data = {
        students: studentData,
        attendance: attendanceHistory,
        currentClass: currentClass
    };
    
    // API 요청
    fetch('http://localhost:8080/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt,
            data: data,
            max_length: 1000,
            temperature: 0.7
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        // 로딩 숨기기
        loadingIndicator.style.display = 'none';
        
        // 분석 결과 표시
        analysisOutput.innerHTML = formatAIResponse(result.response || '분석 결과가 없습니다.');
        
        // 사용자 정의 분석 영역 숨기기
        document.getElementById('custom-analysis').style.display = 'none';
    })
    .catch(error => {
        console.error('분석 중 오류:', error);
        
        // 로딩 숨기기
        loadingIndicator.style.display = 'none';
        
        // 오류 메시지 표시
        analysisOutput.textContent = `분석 중 오류가 발생했습니다: ${error.message}`;
    });
}

// 다크 모드 전환
function toggleDarkMode(e) {
    const darkMode = e.target.checked;
    
    if (darkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('dark-mode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('dark-mode', 'false');
    }
} 