// AI 분석 모듈
// 로컬 서버 엔드포인트 - 포트를 8080으로 변경
const LOCAL_API_ENDPOINT = "http://localhost:8080/api";
// Hugging Face API 엔드포인트
const REMOTE_API_ENDPOINT = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct";

// 사용할 API 엔드포인트 (기본은 원격 API)
let API_ENDPOINT = localStorage.getItem('use-local-model') === 'true' 
    ? LOCAL_API_ENDPOINT 
    : REMOTE_API_ENDPOINT;

// Hugging Face API 키
let API_KEY = localStorage.getItem('ai-api-key') || "";

// 기본 API 키 설정 (보안을 위해 제거됨)
const DEFAULT_API_KEY = "hf_XXXXXXXXXXXXXXXXXXXXXXXX";

let SERVER_ENDPOINT = localStorage.getItem('server-endpoint') || "https://your-server-api.com/attendance-data";

const API_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer hf_XXXXXXXXXXXXXXXXXXXXXXXX' // API 키 수정됨
};

// 데이터 분석 클래스
class AttendanceAnalyzer {
    constructor() {
        this.connectionStatus = "연결 안됨";
        // 기본 API 키 사용, 사용자가 설정한 경우 그 값 사용
        this.apiKey = localStorage.getItem('ai-api-key') || DEFAULT_API_KEY;
        this.serverKey = localStorage.getItem('server-api-key') || 'sk_XXXXXXXXXXXXXXXXXXXXXXXX';
        this.enableServerSync = localStorage.getItem('enable-server-sync') === 'true';
        this.useLocalModel = localStorage.getItem('use-local-model') === 'true';
    }

    // 로컬 모델 사용 설정
    setUseLocalModel(enabled) {
        if (enabled) {
            API_ENDPOINT = LOCAL_API_ENDPOINT;
            localStorage.setItem('use-local-model', 'true');
            console.log("로컬 모델 사용 설정");
            return "로컬 모델 사용 설정됨 (엔드포인트: " + LOCAL_API_ENDPOINT + ")";
        } else {
            API_ENDPOINT = REMOTE_API_ENDPOINT;
            localStorage.setItem('use-local-model', 'false');
            console.log("원격 모델 사용 설정");
            return "원격 모델 사용 설정됨 (엔드포인트: " + REMOTE_API_ENDPOINT + ")";
        }
    }

    // API 키 설정
    setApiKey(key) {
        API_KEY = key;
        localStorage.setItem('ai-api-key', key);
        return "API 키가 설정되었습니다.";
    }

    // 서버 API 키 설정
    setServerKey(key) {
        this.serverKey = key;
        localStorage.setItem('server-api-key', key);
        return true;
    }

    // 서버 엔드포인트 설정
    setServerEndpoint(endpoint) {
        SERVER_ENDPOINT = endpoint;
        localStorage.setItem('server-endpoint', endpoint);
        return true;
    }

    // 서버 동기화 설정
    setServerSync(enable) {
        this.enableServerSync = enable;
        localStorage.setItem('enable-server-sync', enable.toString());
        return true;
    }

    // API 키 확인
    hasValidApiKey() {
        // 로컬 모델 사용 시 키 불필요
        if (this.useLocalModel) {
            return true;
        }
        // 기본 API 키가 있으므로 항상 true 반환
        return true;
    }

    // 서버 API 키 확인
    hasValidServerKey() {
        return this.serverKey && this.serverKey.length > 10;
    }

    // 기본 데이터 분석 (API 호출 없이 로컬에서 처리)
    analyzeLocalData(studentData, attendanceHistory) {
        // 결과 저장 객체
        const result = {
            worstAttendance: [],
            frequentLateness: [],
            patternFound: [],
            improvementSuggestions: [],
            summary: ''
        };

        try {
            // 학생별 출결 통계 계산
            const studentStats = this.calculateStudentStatistics(studentData, attendanceHistory);
            
            // 출석률 저조한 학생 (80% 미만)
            result.worstAttendance = studentStats
                .filter(s => s.attendanceRate < 80)
                .sort((a, b) => a.attendanceRate - b.attendanceRate)
                .slice(0, 5);
            
            // 지각이 잦은 학생 (3회 이상)
            result.frequentLateness = studentStats
                .filter(s => s.lateCount >= 3)
                .sort((a, b) => b.lateCount - a.lateCount)
                .slice(0, 5);
            
            // 요일별 패턴 분석
            const dayPatterns = this.analyzeDayPatterns(studentData, attendanceHistory);
            result.patternFound = dayPatterns;
            
            // 간단한 요약 생성
            result.summary = this.generateLocalSummary(result, studentStats);
            
            return result;
        } catch (error) {
            console.error('로컬 분석 중 오류 발생:', error);
            return {
                error: true,
                message: '데이터 분석 중 오류가 발생했습니다: ' + error.message
            };
        }
    }

    // 학생별 출결 통계 계산
    calculateStudentStatistics(studentData, attendanceHistory) {
        const stats = [];
        
        // 모든 클래스의 학생 처리
        Object.keys(studentData).forEach(classId => {
            const students = studentData[classId];
            
            students.forEach(student => {
                let totalDays = 0;
                let presentDays = 0;
                let lateDays = 0;
                let absentDays = 0;
                
                // 날짜별 출결 기록 확인
                Object.keys(attendanceHistory).forEach(date => {
                    const classAttendance = attendanceHistory[date][classId] || {};
                    if (classAttendance[student.id]) {
                        totalDays++;
                        const status = classAttendance[student.id].status;
                        
                        if (status === 'present') presentDays++;
                        else if (status === 'late') lateDays++;
                        else if (status === 'absent') absentDays++;
                    }
                });
                
                // 출석률 계산 (출석 + 지각을 출석으로 간주)
                const attendanceRate = totalDays > 0 
                    ? Math.round(((presentDays + lateDays) / totalDays) * 100) 
                    : 100;
                
                stats.push({
                    id: student.id,
                    name: student.name,
                    class: classId,
                    number: student.number,
                    totalDays,
                    presentDays,
                    lateDays,
                    absentDays,
                    attendanceRate,
                    lateCount: lateDays,
                    absentCount: absentDays
                });
            });
        });
        
        return stats;
    }

    // 요일별 패턴 분석
    analyzeDayPatterns(studentData, attendanceHistory) {
        const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 일~토
        const dayAbsent = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const dayLate = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        
        // 요일별 결석/지각 횟수 집계
        Object.keys(attendanceHistory).forEach(dateStr => {
            const date = new Date(dateStr);
            const day = date.getDay(); // 0: 일요일, 6: 토요일
            
            Object.keys(attendanceHistory[dateStr]).forEach(classId => {
                const classAttendance = attendanceHistory[dateStr][classId];
                
                Object.keys(classAttendance).forEach(studentId => {
                    dayCount[day]++;
                    const status = classAttendance[studentId].status;
                    
                    if (status === 'absent') dayAbsent[day]++;
                    else if (status === 'late') dayLate[day]++;
                });
            });
        });
        
        // 요일별 결석/지각률 계산 및 패턴 분석
        const patterns = [];
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        
        for (let i = 0; i < 7; i++) {
            if (dayCount[i] > 0) {
                const absentRate = (dayAbsent[i] / dayCount[i]) * 100;
                const lateRate = (dayLate[i] / dayCount[i]) * 100;
                
                // 결석률이 15% 이상인 요일 감지
                if (absentRate >= 15) {
                    patterns.push({
                        day: dayNames[i],
                        type: '결석',
                        rate: Math.round(absentRate),
                        message: `${dayNames[i]}요일에 결석률(${Math.round(absentRate)}%)이 높습니다.`
                    });
                }
                
                // 지각률이 20% 이상인 요일 감지
                if (lateRate >= 20) {
                    patterns.push({
                        day: dayNames[i],
                        type: '지각',
                        rate: Math.round(lateRate),
                        message: `${dayNames[i]}요일에 지각률(${Math.round(lateRate)}%)이 높습니다.`
                    });
                }
            }
        }
        
        return patterns;
    }

    // 로컬 분석 결과 요약 생성
    generateLocalSummary(result, studentStats) {
        // 전체 학생 수
        const totalStudents = studentStats.length;
        if (totalStudents === 0) return '분석할 데이터가 충분하지 않습니다.';
        
        // 출석률 평균
        const avgAttendanceRate = studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents;
        
        // 요약 생성
        let summary = `전체 학생 ${totalStudents}명의 평균 출석률은 ${Math.round(avgAttendanceRate)}%입니다. `;
        
        if (result.worstAttendance.length > 0) {
            summary += `출석률이 저조한 학생은 ${result.worstAttendance.map(s => s.name).join(', ')} 등 ${result.worstAttendance.length}명입니다. `;
        }
        
        if (result.frequentLateness.length > 0) {
            summary += `지각이 잦은 학생은 ${result.frequentLateness.map(s => s.name).join(', ')} 등 ${result.frequentLateness.length}명입니다. `;
        }
        
        if (result.patternFound.length > 0) {
            summary += `특이사항: ${result.patternFound.map(p => p.message).join(' ')}`;
        }
        
        return summary;
    }

    // OpenAI API를 활용한 심층 분석
    async analyzeWithAI(studentData, attendanceHistory, analysisType) {
        if (!this.hasValidApiKey()) {
            return {
                error: true,
                message: 'DeepSeek API 키가 설정되지 않았습니다. AI 분석 탭에서 설정해주세요.'
            };
        }

        try {
            // 분석에 필요한 데이터 준비
            const localAnalysis = this.analyzeLocalData(studentData, attendanceHistory);
            const studentStats = this.calculateStudentStatistics(studentData, attendanceHistory);
            
            // 분석 타입에 따른 프롬프트 생성
            let prompt = '';
            switch (analysisType) {
                case 'attendance-patterns':
                    prompt = this.createAttendancePatternsPrompt(studentStats, localAnalysis);
                    break;
                case 'student-risk':
                    prompt = this.createStudentRiskPrompt(studentStats, localAnalysis);
                    break;
                case 'improvement-suggestions':
                    prompt = this.createImprovementSuggestionsPrompt(studentStats, localAnalysis);
                    break;
                default:
                    // 사용자 정의 분석은 호출 시 직접 프롬프트 제공
                    prompt = analysisType;
            }

            // DeepSeek API 호출을 위한 메서드 (로컬 또는 원격)
            const response = await this.callDeepSeekAPI(prompt);
            const result = {
                result: response,
                localAnalysis
            };
            
            // 서버 동기화가 활성화된 경우 서버에 결과 전송
            if (this.enableServerSync && this.hasValidServerKey()) {
                this.sendResultToServer(result, studentData, attendanceHistory)
                    .then(syncResult => {
                        console.log('분석 결과 서버 전송 결과:', syncResult.message);
                    })
                    .catch(error => {
                        console.error('분석 결과 서버 전송 중 오류:', error);
                    });
            }
            
            return result;
        } catch (error) {
            console.error('AI 분석 중 오류 발생:', error);
            return {
                error: true,
                message: 'AI 분석 중 오류가 발생했습니다: ' + error.message
            };
        }
    }

    // 출결 패턴 분석을 위한 프롬프트 생성
    createAttendancePatternsPrompt(studentStats, localAnalysis) {
        // 데이터 정리
        const worstAttendance = localAnalysis.worstAttendance.map(s => 
            `학생명: ${s.name}, 출석률: ${s.attendanceRate}%, 지각: ${s.lateCount}회, 결석: ${s.absentCount}회`
        ).join('\n');
        
        const patterns = localAnalysis.patternFound.map(p => p.message).join('\n');
        
        // 프롬프트 구성
        return `
당신은 학급 출결 데이터를 분석하는 전문가입니다. 다음 데이터를 바탕으로 출결 패턴을 분석하고 통찰력 있는 해석을 제공해주세요:

[출석률 저조 학생]
${worstAttendance || '해당 사항 없음'}

[요일별 패턴]
${patterns || '뚜렷한 패턴이 발견되지 않았습니다'}

[전체 요약]
${localAnalysis.summary}

다음 질문에 대한 통찰력 있는 답변을 해주세요:
1. 어떤 출결 패턴이 보이나요?
2. 이러한 패턴의 가능한 원인은 무엇일까요?
3. 출결 상황을 개선하기 위한 구체적인 조언을 해주세요.

한국어로 응답해주시고, 분석 결과는 명확하고 구체적인 통찰을 포함해야 합니다.
`;
    }

    // 위험군 학생 분석을 위한 프롬프트 생성
    createStudentRiskPrompt(studentStats, localAnalysis) {
        // 위험군 학생 정보 구성
        const riskStudents = studentStats
            .filter(s => s.attendanceRate < 85 || s.lateCount >= 3 || s.absentCount >= 2)
            .map(s => `
학생명: ${s.name}
학년/반: ${s.class}반 ${s.number}번
출석률: ${s.attendanceRate}%
지각: ${s.lateCount}회
결석: ${s.absentCount}회
총 출석일: ${s.totalDays}일
            `)
            .join('\n---\n');
        
        // 프롬프트 구성
        return `
당신은 학생들의 출결 데이터를 분석하여 학업 위험군을 식별하는 교육 상담 전문가입니다. 
다음 데이터를 바탕으로 위험군 학생들을 분석하고 개입 전략을 제시해주세요:

[위험군 학생 데이터]
${riskStudents || '위험군 학생이 없습니다'}

[전체 요약]
${localAnalysis.summary}

다음 질문에 답해주세요:
1. 각 위험군 학생에 대한 상세 분석 (가장 위험도가 높은 학생부터 순서대로)
2. 각 학생에게 필요한 맞춤형 지원 전략
3. 교사 또는 학부모가 취해야 할 구체적인 조치
4. 이러한 학생들의 출결 문제가 학업 성취도에 미칠 수 있는 영향

한국어로 응답해주시고, 분석은 실용적이고 교육적 맥락에 맞는 조언을 포함해야 합니다.
`;
    }

    // 개선 방안 제안을 위한 프롬프트 생성
    createImprovementSuggestionsPrompt(studentStats, localAnalysis) {
        // 요일별 패턴 정보
        const patterns = localAnalysis.patternFound.map(p => p.message).join('\n');
        
        // 전체 통계 요약
        const totalStudents = studentStats.length;
        const avgAttendance = studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents;
        const perfectAttendance = studentStats.filter(s => s.attendanceRate === 100).length;
        const lowAttendance = studentStats.filter(s => s.attendanceRate < 80).length;
        
        // 프롬프트 구성
        return `
당신은 학교 출결 관리 및 개선 전략 수립 전문가입니다. 
다음 출결 데이터를 바탕으로 학급 출결 상황을 개선하기 위한 구체적인 전략과 실행 계획을 제안해주세요:

[출결 통계 요약]
- 전체 학생 수: ${totalStudents}명
- 평균 출석률: ${Math.round(avgAttendance)}%
- 완벽 출석 학생 수: ${perfectAttendance}명
- 출석률 80% 미만 학생 수: ${lowAttendance}명

[요일별 패턴]
${patterns || '뚜렷한 패턴이 발견되지 않았습니다'}

[전체 요약]
${localAnalysis.summary}

다음 영역에 대한 구체적인 개선 전략을 제시해주세요:
1. 전반적인 출석률 향상을 위한 학급 차원의 전략
2. 지각 감소를 위한 접근법
3. 특정 요일의 결석/지각 패턴 개선 방안
4. 학부모와의 협력 강화 방안
5. 효과적인 출결 모니터링 및 조기 개입 시스템 구축 방안

한국어로 응답해주시고, 제안은 실용적이고 구체적이며 실행 가능한 내용이어야 합니다.
`;
    }

    // DeepSeek API 호출을 위한 메서드 (로컬 또는 원격)
    async callDeepSeekAPI(prompt) {
        try {
            // 로컬 모델 사용 여부 확인
            if (this.useLocalModel) {
                return await this.callLocalModel(prompt);
            } else {
                return await this.callRemoteAPI(prompt);
            }
        } catch (error) {
            console.error('AI API 호출 중 오류:', error);
            
            // 오류 발생 시 로컬 분석 결과 반환
            return `
[인공지능 분석 오류]
API 호출 중 오류가 발생했습니다: ${error.message}

대체 분석 결과:
1. 출석률이 저조한 학생들에게는 개별 면담과 지원이 필요합니다.
2. 특정 요일에 결석/지각이 많은 경우 해당 일의 일정을 검토하세요.
3. 출석률 향상을 위해 출석 인센티브 시스템을 도입하는 것이 좋습니다.
4. 지각이 잦은 학생들의 등교 환경을 확인하고 지원 방안을 마련하세요.
5. 정기적인 학부모 소통으로 가정에서의 지원을 강화하세요.

* 참고: 이는 API 오류로 인한 기본 분석 결과입니다. 정확한 분석을 위해서는 API 연결 문제를 해결해주세요.
            `;
        }
    }
    
    // 로컬 DeepSeek API 호출
    async callLocalModel(prompt) {
        try {
            console.log("로컬 모델 API 호출:", prompt.substring(0, 100) + "...");
            
            const response = await fetch(`${LOCAL_API_ENDPOINT}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    max_length: 1000,
                    temperature: 0.6
                })
            });
            
            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }
            
            const data = await response.json();
            return data.response || "응답 없음";
        } catch (error) {
            console.error('로컬 모델 API 호출 오류:', error);
            throw new Error('로컬 모델 서버와 통신 중 오류가 발생했습니다: ' + error.message);
        }
    }
    
    // 원격 Hugging Face API 호출
    async callRemoteAPI(prompt) {
        console.log('Hugging Face API 호출...');
        
        // Hugging Face API 호출
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: API_HEADER,
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 1000,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        });
        
        // 응답 확인
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 호출 오류: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        // Hugging Face 응답 형식에 따른 처리
        if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
            return data[0].generated_text;
        } else {
            console.warn('예상치 못한 응답 형식:', data);
            return data.toString();
        }
    }

    // 로컬 서버 연결 테스트
    async testLocalServer() {
        try {
            console.log("로컬 서버 연결 테스트 중...");
            
            const response = await fetch(`${LOCAL_API_ENDPOINT}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === "online") {
                this.connectionStatus = "연결됨";
                return {
                    success: true,
                    message: "로컬 모델 서버에 연결되었습니다.",
                    model_loaded: data.model_loaded,
                    details: data
                };
            } else {
                this.connectionStatus = "오류";
                return {
                    success: false,
                    message: "서버는 실행 중이지만 모델이 로드되지 않았습니다.",
                    details: data
                };
            }
        } catch (error) {
            console.error('로컬 서버 연결 테스트 오류:', error);
            this.connectionStatus = "연결 실패";
            return {
                success: false,
                message: '로컬 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.',
                error: error.message
            };
        }
    }

    // JSON 내보내기 - 분석 데이터
    exportAnalysisToJson(analysis) {
        // 분석 결과에 메타데이터 추가
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                analysisType: 'attendance_analysis',
                version: '1.0'
            },
            aiResult: analysis.result,
            localAnalysis: analysis.localAnalysis,
            rawData: {
                studentCount: this.countStudents(analysis.localAnalysis),
                attendanceStats: this.getAttendanceStats(analysis.localAnalysis)
            }
        };

        const jsonData = JSON.stringify(exportData, null, 2);
        
        // 1. JSON 파일 생성 및 다운로드
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const filename = `attendance_analysis_${new Date().toISOString().split('T')[0]}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 2. 바로 인공지능에 전송하여 심층 분석
        this.analyzeJsonWithAI(exportData, filename);
        
        return exportData; // 내보낸 데이터 반환
    }
    
    // JSON 데이터를 인공지능으로 심층 분석
    async analyzeJsonWithAI(jsonData, filename) {
        try {
            // 분석 시작 알림
            showModal('분석 시작', `"${filename}" 파일을 인공지능으로 심층 분석 중입니다. 잠시만 기다려주세요...`, false);
            
            // 프롬프트 생성
            const prompt = this.createJsonAnalysisPrompt(jsonData);
            
            // API 호출
            const response = await this.callDeepSeekAPI(prompt);
            
            // 분석 결과 표시
            showJsonAnalysisResult(response, filename);
            
            return response;
        } catch (error) {
            console.error('JSON 분석 중 오류 발생:', error);
            showModal('분석 오류', `파일 분석 중 오류가 발생했습니다: ${error.message}`);
            return null;
        }
    }
    
    // JSON 분석용 프롬프트 생성
    createJsonAnalysisPrompt(jsonData) {
        // 프롬프트 구성에 필요한 정보 추출
        const metadata = jsonData.metadata;
        const aiResult = jsonData.aiResult || '분석 결과 없음';
        const localData = jsonData.localAnalysis || {};
        const rawData = jsonData.rawData || {};
        
        // 학생 데이터 요약
        let studentSummary = '정보 없음';
        if (localData.worstAttendance && localData.worstAttendance.length > 0) {
            studentSummary = `가장 출석률이 저조한 학생 ${localData.worstAttendance.length}명`;
        }
        
        // 패턴 요약
        let patternSummary = '패턴 정보 없음';
        if (localData.patternFound && localData.patternFound.length > 0) {
            patternSummary = localData.patternFound.map(p => p.message).join('; ');
        }
        
        // 프롬프트 구성
        return `
당신은 교육 데이터 전문 분석가입니다. 다음 출결 데이터 JSON 파일의 내용을 분석하고 상세한 통찰력과 개선 방안을 제시해주세요.

분석 메타데이터:
- 분석 일시: ${metadata.exportDate}
- 분석 유형: ${metadata.analysisType}
- 버전: ${metadata.version}

기본 데이터 요약:
- 학생 수: ${rawData.studentCount || '정보 없음'}
- 학생 현황: ${studentSummary}
- 패턴 분석: ${patternSummary}
- 전체 요약: ${localData.summary || '요약 정보 없음'}

이전 AI 분석 결과:
${aiResult}

위 데이터를 바탕으로 다음 사항을 더 깊이 분석해주세요:

1. 학생 출결 패턴에서 발견되는 눈에 띄는 추가 인사이트
2. 특별한 관심이 필요한 학생들과 그 이유
3. 출결 패턴이 학업 성취도에 미칠 수 있는 영향
4. 출결 상황 개선을 위한 구체적이고 실행 가능한 5가지 전략
5. 이 데이터를 활용하여 교사나 학교 관리자가 취할 수 있는 추가 조치

분석은 실용적이고 구체적이어야 하며, 학생들의 학업 성취도와 복지를 향상시키는 데 직접적으로 도움이 되어야 합니다.
한국어로 응답해주세요.
`;
    }

    // 학생 수 계산 (분석용)
    countStudents(analysis) {
        if (!analysis || !analysis.worstAttendance) return 0;
        
        // 실제 총 학생 수는 분석 과정에서 알 수 없으므로 추정값만 반환
        return Math.max(
            analysis.worstAttendance.length + analysis.frequentLateness.length,
            10 // 기본값
        );
    }

    // 출결 통계 집계 (분석용)
    getAttendanceStats(analysis) {
        if (!analysis) return {};
        
        // 분석 요약 데이터를 파싱하여 통계 추출
        const summaryText = analysis.summary || '';
        
        // 패턴 감지
        const averageMatch = summaryText.match(/평균 출석률은 (\d+)%/);
        const avgAttendance = averageMatch ? parseInt(averageMatch[1]) : null;
        
        return {
            averageAttendance: avgAttendance,
            lateStudents: analysis.frequentLateness?.length || 0,
            absentStudents: analysis.worstAttendance?.length || 0,
            patterns: analysis.patternFound || []
        };
    }

    // JSON 데이터 불러오기 및 해석
    parseImportedJson(jsonData) {
        try {
            // JSON 파싱
            const data = JSON.parse(jsonData);
            
            // 데이터 구조 확인
            if (!data || !data.metadata) {
                throw new Error('유효하지 않은 분석 데이터 형식입니다.');
            }
            
            // 메타데이터 확인
            if (data.metadata.analysisType !== 'attendance_analysis') {
                throw new Error('분석 데이터 유형이 일치하지 않습니다.');
            }
            
            // 분석 결과 추출
            return {
                aiResult: data.aiResult || '분석 결과가 없습니다.',
                localAnalysis: data.localAnalysis || {},
                importDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            throw error;
        }
    }

    // DeepSeek API 호출 결과를 서버에 전송
    async sendResultToServer(analysis, studentData, attendanceHistory) {
        if (!this.enableServerSync) {
            console.log('서버 동기화가 비활성화되어 있습니다.');
            return { success: false, message: '서버 동기화가 비활성화되어 있습니다.' };
        }

        if (!this.hasValidServerKey()) {
            console.log('서버 API 키가 설정되지 않았습니다.');
            return { success: false, message: '서버 API 키가 설정되지 않았습니다.' };
        }

        try {
            // 전송할 데이터 준비
            const dataToSend = {
                metadata: {
                    sendTime: new Date().toISOString(),
                    dataType: 'attendance_analysis',
                    version: '1.0'
                },
                analysisResult: analysis.result,
                studentStats: this.calculateStudentStatistics(studentData, attendanceHistory),
                localAnalysis: analysis.localAnalysis
            };

            // 서버에 데이터 전송
            const response = await fetch(SERVER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.serverKey}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('서버 전송 성공:', responseData);
            
            return { 
                success: true, 
                message: '데이터가 서버에 성공적으로 전송되었습니다.',
                serverResponse: responseData
            };
        } catch (error) {
            console.error('서버 전송 중 오류 발생:', error);
            return { 
                success: false, 
                message: `서버 전송 중 오류가 발생했습니다: ${error.message}`
            };
        }
    }

    // 분석 결과와 출결 데이터를 서버에 동기화
    async syncDataWithServer(studentData, attendanceHistory) {
        if (!this.enableServerSync) {
            return { success: false, message: '서버 동기화가 비활성화되어 있습니다.' };
        }

        try {
            // 로컬 분석 실행
            const localAnalysis = this.analyzeLocalData(studentData, attendanceHistory);
            
            // 데이터 전송
            const dataToSync = {
                metadata: {
                    syncTime: new Date().toISOString(),
                    dataType: 'attendance_full_sync',
                    version: '1.0'
                },
                studentData: studentData,
                attendanceHistory: attendanceHistory,
                localAnalysis: localAnalysis
            };

            // 서버에 데이터 전송
            const response = await fetch(`${SERVER_ENDPOINT}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.serverKey}`
                },
                body: JSON.stringify(dataToSync)
            });

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            return { 
                success: true, 
                message: '데이터가 서버와 성공적으로 동기화되었습니다.',
                syncId: responseData.syncId || null,
                lastSyncTime: new Date().toISOString()
            };
        } catch (error) {
            console.error('서버 동기화 중 오류 발생:', error);
            return { 
                success: false, 
                message: `서버 동기화 중 오류가 발생했습니다: ${error.message}`
            };
        }
    }

    // 서버에서 데이터 가져오기
    async fetchDataFromServer(syncId = null) {
        if (!this.enableServerSync) {
            return { success: false, message: '서버 동기화가 비활성화되어 있습니다.' };
        }

        try {
            // 요청 URL 구성
            let url = `${SERVER_ENDPOINT}/data`;
            if (syncId) {
                url += `?syncId=${syncId}`;
            }

            // 서버에서 데이터 가져오기
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.serverKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            return { 
                success: true, 
                message: '서버에서 데이터를 성공적으로 가져왔습니다.',
                data: data
            };
        } catch (error) {
            console.error('서버에서 데이터 가져오기 중 오류 발생:', error);
            return { 
                success: false, 
                message: `서버에서 데이터 가져오기 중 오류가 발생했습니다: ${error.message}`
            };
        }
    }

    // 채팅 응답 생성 함수 추가
    async generateChatResponse(message, context = [], attendanceData = {}) {
        if (!message.trim()) {
            return "메시지가 비어있습니다.";
        }
        
        try {
            if (this.useLocalModel) {
                // 로컬 API 사용
                const response = await fetch(`${LOCAL_API_ENDPOINT}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        context: context,
                        attendanceData: attendanceData
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`서버 오류: ${response.status}`);
                }
                
                const data = await response.json();
                let chatResponse = data.response || "응답 없음";
                
                // 응답 정제
                chatResponse = chatResponse.trim();
                if (chatResponse.startsWith("A:")) {
                    chatResponse = chatResponse.substring(2).trim();
                }
                
                return chatResponse;
            } else {
                // 원격 API 사용 - DeepSeek 모델 형식으로 변환
                let fullPrompt = "";
                
                // 이전 대화 내역 추가
                if (context && context.length > 0) {
                    for (const msg of context) {
                        if (msg.role === 'user') {
                            fullPrompt += `User: ${msg.content}\n\n`;
                        } else {
                            fullPrompt += `A: ${msg.content}\n\n`;
                        }
                    }
                }
                
                // 현재 사용자 메시지 추가
                fullPrompt += `User: ${message}\n\nA:`;
                
                // API 호출
                const apiResponse = await this.callRemoteAPI(fullPrompt);
                
                // 응답 정제
                let chatResponse = apiResponse.trim();
                if (chatResponse.startsWith("A:")) {
                    chatResponse = chatResponse.substring(2).trim();
                }
                
                return chatResponse;
            }
        } catch (error) {
            console.error('챗봇 응답 생성 오류:', error);
            return `오류가 발생했습니다: ${error.message}. 서버가 실행 중인지 확인해주세요.`;
        }
    }
    
    // 채팅 프롬프트 포맷팅 함수
    formatChatPrompt(message, context) {
        let prompt = "당신은 출결 관리 시스템의 AI 비서입니다. 다음 정보를 기반으로 질문에 답변하세요.\n\n";
        
        if (context && context.length > 0) {
            prompt += "대화 내역:\n";
            context.forEach(msg => {
                if (msg.role === 'user') {
                    prompt += `사용자: ${msg.content}\n`;
                } else {
                    prompt += `AI: ${msg.content}\n`;
                }
            });
        }
        
        prompt += `\n사용자: ${message}\nAI: `;
        return prompt;
    }
}

// 인스턴스 생성 및 전역 변수로 설정
const attendanceAnalyzer = new AttendanceAnalyzer();

// 모달 표시 함수
function showModal(title, message, isError = false) {
    const modal = document.getElementById('modal') || createModal();
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = `<p class="${isError ? 'error-text' : ''}">${message}</p>`;
    
    modal.style.display = 'block';
}

// 모달이 없으면 생성
function createModal() {
    const modalHtml = `
    <div id="modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="modal-title">제목</h2>
            <div id="modal-body">
                <!-- 모달 내용 -->
            </div>
            <div class="modal-footer">
                <button id="modal-close">닫기</button>
            </div>
        </div>
    </div>`;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv.firstElementChild);
    
    // 닫기 버튼 이벤트 연결
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });
    
    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });
    
    return document.getElementById('modal');
}

// JSON 분석 결과 표시
function showJsonAnalysisResult(analysisResult, filename) {
    // 모달 가져오기
    const modal = document.getElementById('modal') || createModal();
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // 모달 콘텐츠 설정
    modalTitle.textContent = `${filename} 파일 분석 결과`;
    
    // 분석 결과 포맷팅
    const formattedResult = formatAnalysisResult(analysisResult);
    
    // 결과 표시
    modalBody.innerHTML = `
        <div class="analysis-result">
            ${formattedResult}
        </div>
        <div class="action-buttons">
            <button id="copy-result">분석 결과 복사</button>
            <button id="save-result-text">텍스트로 저장</button>
        </div>
    `;
    
    // 복사 버튼 기능
    document.getElementById('copy-result').addEventListener('click', () => {
        navigator.clipboard.writeText(analysisResult)
            .then(() => {
                alert('분석 결과가 클립보드에 복사되었습니다.');
            })
            .catch(err => {
                console.error('복사 실패:', err);
                alert('복사 중 오류가 발생했습니다.');
            });
    });
    
    // 텍스트로 저장 버튼 기능
    document.getElementById('save-result-text').addEventListener('click', () => {
        const blob = new Blob([analysisResult], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename.replace('.json', '')}_analysis.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // 모달 표시
    modal.style.display = 'block';
    
    // 모달 중앙 배치
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflowY = 'auto';
}

// 분석 결과 포맷팅
function formatAnalysisResult(text) {
    // 줄바꿈 처리
    let formatted = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    
    // 번호 목록 강조
    formatted = formatted.replace(/(\d+\.\s)/g, '<strong>$1</strong>');
    
    // 강조 표시
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    return `<p>${formatted}</p>`;
}