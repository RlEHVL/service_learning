# DeepSeek R1 양자화 모델 설치 및 활용 가이드

이 문서는 사용자의 컴퓨터 성능에 맞게 DeepSeek R1 모델을 설치하고 출결 관리 시스템과 연동하는 방법을 설명합니다.

## 1. 필수 환경 설정

### 필요한 시스템 요구사항
- **Python 3.8 이상** 설치
- **CUDA 지원 NVIDIA GPU** (최소 4GB VRAM 권장)
  - 2GB VRAM GPU: DeepSeek V3 Lite 사용 가능
  - 4GB VRAM GPU: DeepSeek R1 Distill 7B 가능 (4비트 양자화 사용)
  - 8GB VRAM 이상: DeepSeek R1 8B/14B 가능 (4비트 양자화 사용)
- **CUDA 11.7/11.8/12.x** 설치 
- 최소 8GB RAM
- 최소 15GB 디스크 공간 (모델 캐시용)

### Python 패키지 설치

```bash
# PyTorch 설치 (CUDA 11.8 버전)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# 필요한 라이브러리 설치 
pip install transformers==4.36.2 accelerate==0.25.0 bitsandbytes==0.41.1 sentencepiece flask flask-cors
```

## 2. 서버 실행 방법

이제 분리된 AI 서버와 모델 로더를 사용하여 시스템을 실행할 수 있습니다.

### 1) AI 서버 실행

```bash
# AI 서버 실행 (기본 포트: 5000)
python ai/ai_server.py

# 다른 포트 사용
python ai/ai_server.py --port 8000
```

### 2) 모델 수동 로딩 (선택사항)

서버는 필요에 따라 자동으로 모델을 로드하지만, 미리 로드하여 테스트할 수도 있습니다:

```bash
# 기본 설정으로 모델 로드 및 테스트 (DeepSeek R1 Distill 7B)
python ai/ai_model.py

# 다른 모델 사용
python ai/ai_model.py --model deepseek-ai/DeepSeek-V3-0324

# 4비트 양자화 비활성화 (메모리 사용량 증가)
python ai/ai_model.py --no-4bit

# CPU 모드 사용 (매우 느림)
python ai/ai_model.py --cpu
```

## 3. 사용 가능한 모델

컴퓨터 사양에 따라 다음 모델을 선택할 수 있습니다:

### 저사양 컴퓨터용 모델 (4-6GB VRAM):
- `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B` (권장)
- `deepseek-ai/DeepSeek-V3-lite`

### 중간 사양 컴퓨터용 모델 (8GB VRAM):
- `deepseek-ai/DeepSeek-R1-Distill-Llama-8B`
- `deepseek-ai/DeepSeek-R1-Distill-Qwen-14B`

### 고사양 컴퓨터용 모델 (16GB+ VRAM):
- `deepseek-ai/DeepSeek-V3-0324`
- `deepseek-ai/DeepSeek-R1-Distill-Llama-32B`

## 4. 출결 관리 시스템 설정

1. 웹 애플리케이션을 실행합니다: `python -m http.server`
2. 브라우저에서 접속합니다: `http://localhost:8000`
3. "설정" 탭으로 이동합니다
4. "AI 모델 설정" 섹션에서 "DeepSeek R1 로컬 모델 사용"을 체크합니다
5. "연결 테스트" 버튼을 클릭하여 연결을 확인합니다
6. 원활한 연결이 확인되면 "개인 챗" 탭에서 AI 비서와 대화할 수 있습니다

## 5. 문제 해결

### 메모리 부족 오류
모델이 메모리 부족 오류를 발생시키는 경우:
1. 4비트 양자화가 활성화되어 있는지 확인하세요 (기본 활성화)
2. 더 작은 모델을 사용해보세요
3. 불필요한 프로그램을 종료하여 메모리 확보

### 서버 연결 오류
연결 오류가 발생하는 경우:
1. AI 서버가 실행 중인지 확인하세요
2. 서버 포트가 올바르게 설정되었는지 확인하세요
3. 방화벽 설정을 확인하세요
4. 로그에서 추가 오류 메시지를 확인하세요

### 모델 다운로드 실패
첫 실행 시 모델이 다운로드되지 않는 경우:
1. 인터넷 연결을 확인하세요
2. 프록시 설정을 확인하세요
3. 수동으로 모델을 다운로드하여 `models_cache` 폴더에 저장하세요

## 6. 고급 팁

### 환경 변수 설정
모델 캐시 위치를 변경하려면 환경 변수를 설정하세요:
```bash
# Windows
set TRANSFORMERS_CACHE=D:\models_cache

# Linux/Mac
export TRANSFORMERS_CACHE=/path/to/models_cache
```

### 오프라인 사용
오프라인 환경에서는 미리 모델을 다운로드하여 `models_cache` 폴더에 저장하세요:
```bash
from huggingface_hub import snapshot_download
snapshot_download(repo_id="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B")
```

### 메모리 최적화
메모리 사용량을 더 줄이려면:
1. `--cpu` 옵션 사용 (매우 느림)
2. 더 작은 모델 사용
3. 컨텍스트 길이 제한 