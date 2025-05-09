# 파일이 너무 커서 끊어서 올리다보니 에러가 발생할 수도 있음.. 해결은 알아서... git lfs로 해도 히스토리 충돌 발생.

- https://www.youtube.com/watch?v=yQDCFTQzxFg
  
![image](https://github.com/user-attachments/assets/5470b5de-4018-4b0b-8757-69df8284596f)

![image](https://github.com/user-attachments/assets/e3208b5f-ddab-4d70-a731-a89bef02ebbf)

![image](https://github.com/user-attachments/assets/a35f6dfd-77e7-4f0b-b856-a2fc40eea1b2)



# 출결 관리 시스템 AI 연동 가이드

이 문서는 출결 관리 시스템의 AI 기능 설정 및 실행 방법을 설명합니다. 특히 GPU가 없는 환경에서도 DeepSeek AI 모델을 효율적으로 사용할 수 있는 방법을 안내합니다.

## 시스템 요구사항

- **Python 3.8 이상** 설치
- **최소 8GB RAM**
- **최소 4GB 디스크 공간** (모델 캐시용)
- GPU가 없는 환경에서도 작동 가능!

## 설치 방법

1. 필요한 패키지 설치:

```bash
# 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 필요한 패키지 설치
pip install flask flask-cors llama-cpp-python
```

## 실행 방법 (중요! 두 개의 파일을 순차적으로 실행해야 함)

### 1. 모델 먼저 로드 (필수)

**중요: 서버 실행 전에 반드시 먼저 모델을 로드해야 합니다!**

```bash
# Windows에서 실행
python ai\ai_model.py

# Linux/Mac에서 실행
python ai/ai_model.py
```

모델 로드가 완료되면 "모델 로드 성공!" 메시지가 출력됩니다. 이후 서버를 시작하세요.

### 2. 그 다음 서버 실행

모델 로드가 완료된 후에 서버를 실행하세요:

```bash
# Windows에서 실행
python ai\ai_server.py

# Linux/Mac에서 실행
python ai/ai_server.py
```

서버가 시작되면 "통합 서버를 http://0.0.0.0:8080/ 에서 실행합니다..." 메시지가 표시됩니다.

### 추가 실행 옵션

```bash
# 다른 포트 지정
python ai/ai_server.py --port 9000

# 특정 모델 사용
python ai/ai_server.py --model "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"
```

브라우저에서 접속: `http://localhost:8080`

## 모델 정보

시스템은 TheBloke의 양자화된 GGUF 모델을 자동으로 다운로드하여 사용합니다:
- 기본 모델: `deepseek-llm-7b-chat.Q2_K.gguf`
- 다운로드 위치: `gguf_models/` 디렉토리

## 문제 해결

### 서버 실행 문제
- **"모델이 로드되지 않음" 오류**: `python ai\ai_model.py`를 먼저 실행했는지 확인하세요.
- **포트 충돌**: 다른 포트 번호를 지정하세요.
- **모델 다운로드 실패**: 인터넷 연결을 확인하고, 필요시 모델 파일을 수동으로 다운로드하세요.

### AI 응답 문제
- **메모리 부족**: 불필요한 프로그램을 종료하세요.
- **느린 응답**: CPU 모드에서는 응답 생성에 시간이 소요됩니다(인내심을 가져주세요).

## 참고사항

- 첫 실행 시 모델 파일 다운로드에 시간이 소요됩니다(약 3-4GB).
- 출결 관리 시스템 웹 인터페이스는 AI 서버와 자동으로 연동됩니다.
- 문제 발생 시 콘솔 로그를 확인하세요.

## 더 자세한 정보

- 고급 모델 설정: [ai/README_SETUP.md](ai/README_SETUP.md)
- 로컬 모델 설정: [ai/README_LOCAL_MODEL.md](ai/README_LOCAL_MODEL.md)
- AI 기능 가이드: [ai/README.md](ai/README.md) 
