# DeepSeek API 기반 학생 출결 분석 시스템

이 시스템은 학생 출결 데이터를 분석하여 통계 정보를 제공하고, DeepSeek API를 사용하여 심층적인 분석과 개선 방안을 제안합니다.

## 주요 기능

1. **기본 데이터 분석**
   - 학생별 출결 통계 계산
   - 출석률 저조 학생 파악
   - 지각이 잦은 학생 파악
   - 요일별 출결 패턴 분석

2. **DeepSeek AI 분석**
   - 출결 패턴 심층 분석
   - 위험군 학생 파악 및 지원 전략 제안
   - 출결 상황 개선을 위한 전략적 제안
   - 사용자 정의 분석

3. **데이터 내보내기/가져오기**
   - 분석 결과를 JSON 파일로 내보내기
   - JSON 파일에서 분석 결과 가져오기

## 사용 방법

### API 키 설정

1. DeepSeek API 키를 발급받습니다 (https://www.deepseek.com/).
2. "AI 분석" 탭에서 API 키를 입력하고 "저장" 버튼을 클릭합니다.
3. API 키는 안전하게 브라우저의 로컬 스토리지에 저장됩니다.

### 분석 실행

1. "출결 관리" 탭에서 학생 데이터와 출결 정보를 입력합니다.
2. "AI 분석" 탭에서 원하는 분석 유형을 선택합니다:
   - 출결 패턴 분석: 학생들의 출결 패턴을 분석하고 통찰력을 제공합니다.
   - 위험군 학생 파악: 학업에 위험이 있는 학생들을 식별하고 지원 전략을 제안합니다.
   - 개선 방안 제안: 전체 출결 상황을 개선하기 위한 전략을 제안합니다.
   - 사용자 정의 분석: 원하는 질문을 직접 입력하여 맞춤형 분석을 실행합니다.
3. 분석 결과는 "AI 분석 결과" 영역에 표시됩니다.
4. "분석 결과 저장 (JSON)" 버튼을 클릭하여 결과를 JSON 파일로 저장할 수 있습니다.

### JSON 파일 구조

내보낸 JSON 파일은 다음과 같은 구조를 가집니다:

```json
{
  "metadata": {
    "exportDate": "2024-05-28T12:34:56.789Z",
    "analysisType": "attendance_analysis",
    "version": "1.0"
  },
  "aiResult": "AI 분석 결과 텍스트",
  "localAnalysis": {
    "worstAttendance": [...],
    "frequentLateness": [...],
    "patternFound": [...],
    "summary": "..."
  },
  "rawData": {
    "studentCount": 10,
    "attendanceStats": {
      "averageAttendance": 85,
      "lateStudents": 3,
      "absentStudents": 2,
      "patterns": [...]
    }
  }
}
```

## 데이터 보안

- 모든 데이터는 사용자의 브라우저에 로컬로 저장되며, 서버로 전송되지 않습니다.
- DeepSeek API 호출 시에는 출결 데이터의 통계 정보만 전송되며, 학생의 개인 식별 정보는 포함되지 않습니다.
- API 키는 로컬 스토리지에 저장되며, 안전하게 관리됩니다.

## 추가 지원 및 문의

더 자세한 정보나 지원이 필요한 경우 관리자에게 문의하세요. 