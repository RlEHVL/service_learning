# DeepSeek R1 로컬 모델 설정 가이드

이 가이드는 DeepSeek R1 모델을 로컬에서 실행하여 출결 관리 시스템과 연동하는 방법을 설명합니다.

## 필수 사항

- **Python 3.8+** 설치
- **CUDA 지원 NVIDIA GPU** (최소 8GB VRAM 권장, 4비트 양자화 사용 시)
- **CUDA 11.8 이상** 설치

## 설치 방법

1. 필요한 패키지 설치:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install transformers accelerate bitsandbytes sentencepiece flask flask-cors
```

2. 소스 코드 다운로드:

`local_model.py` 파일을 `ai` 폴더에 저장합니다.

## 실행 방법

1. 다음 명령어로 DeepSeek 로컬 서버를 시작합니다:

```bash
# 기본 설정으로 실행 (7B 모델, 4비트 양자화)
python ai/local_model.py

# DeepSeek R1 경량화 모델 사용
python ai/local_model.py --model deepseek-ai/DeepSeek-R1-Distill-Qwen-7B

# 다른 포트 사용
python ai/local_model.py --port 8000

# 양자화 비활성화 (더 많은 VRAM 필요)
python ai/local_model.py --no-4bit
```

2. 모델 다운로드 및 초기화가 완료될 때까지 기다립니다 (최초 실행 시 모델 다운로드에 시간이 소요됩니다).

3. 서버가 시작되면 출결 관리 시스템 웹 페이지를 열고 "설정" 탭에서 "로컬 모델 사용"을 선택합니다.

## 주요 DeepSeek R1 모델 옵션

DeepSeek R1은 추론 능력이 뛰어난 최신 모델 시리즈입니다:

- **DeepSeek-R1-Distill-Qwen-7B**: 경량화된 7B 모델, 일반 시스템에 적합
- **DeepSeek-R1-Distill-Qwen-14B**: 14B 모델, 더 높은 성능 제공
- **DeepSeek-R1-Distill-Qwen-32B**: 32B 모델, 고성능 GPU 필요
- **DeepSeek-R1-Distill-Llama-8B**: Llama 기반 8B 모델
- **DeepSeek-R1-Distill-Llama-70B**: 초대형 70B 모델, 서버급 GPU 필요

## 모델 사용 권장사항

DeepSeek R1 모델을 최적으로 활용하기 위한 권장사항:

1. 온도(temperature) 매개변수는 0.5-0.7 사이로 설정 (0.6 권장)
2. 시스템 프롬프트 사용 금지 (모든 지시는 사용자 프롬프트에 포함)
3. 출결 패턴 분석 시 "단계별로 추론하고 최종 결론을 명확히 제시해주세요" 지시 포함
4. 모델 응답 시작을 "<think>\n"으로 설정하여 철저한 추론 유도

## 로컬 모델 사용의 장점

- 인터넷 연결 없이 사용 가능
- API 비용 발생하지 않음
- 개인정보 보호 (데이터가 외부로 전송되지 않음)
- 커스텀 모델 사용 가능

## 문제 해결

- **CUDA 오류**: NVIDIA 드라이버와 CUDA가 올바르게 설치되었는지 확인하세요.
- **메모리 부족**: `--no-4bit` 옵션을 제거하거나 더 작은 모델을 사용하세요.
- **모델 다운로드 실패**: 인터넷 연결을 확인하고 방화벽이 차단하고 있지 않은지 확인하세요.
- **연결 오류**: 포트 번호와 URL이 웹 애플리케이션 설정과 일치하는지 확인하세요.

## 고급 설정

- 모델 파일을 로컬에 캐시하려면 환경 변수를 설정하세요:
  ```bash
  export TRANSFORMERS_CACHE="C:/모델_캐시_폴더"  # Windows
  export TRANSFORMERS_CACHE="/path/to/cache"      # Linux/Mac
  ```

- GPU 메모리가 부족한 경우 CPU 모드를 사용할 수 있습니다:
  ```bash
  # CPU 모드 설정 (매우 느림)
  export CUDA_VISIBLE_DEVICES=""
  ```

## 예제 API 호출

```javascript
// 로컬 API 호출 예제
fetch('http://localhost:8080/api/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        prompt: '학생 출결 패턴을 분석해주세요',
        max_length: 1000,
        temperature: 0.6
    })
})
.then(response => response.json())
.then(data => console.log(data.response));
``` 