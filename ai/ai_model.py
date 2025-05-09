import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
import logging
import time
import os
import json
import subprocess
import sys
from pathlib import Path

# llama.cpp 지원을 위한 imports 추가 (설치된 경우)
try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# 캐시 디렉토리 명시적 설정
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(ROOT_DIR, "models_cache")
GGUF_DIR = os.path.join(ROOT_DIR, "gguf_models")
os.environ["TRANSFORMERS_CACHE"] = CACHE_DIR
os.environ["HF_HOME"] = CACHE_DIR
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# 전역 변수로 모델과 토크나이저 선언
model = None
tokenizer = None
model_name = None
is_loaded = False
is_llama_cpp = False

def is_model_loaded():
    """모델이 로드되었는지 확인합니다."""
    return is_loaded

def check_cuda_available():
    """CUDA 사용 가능 여부를 확인합니다."""
    return torch.cuda.is_available()

def install_llama_cpp():
    """llama-cpp-python을 설치합니다."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "llama-cpp-python"])
        logger.info("llama-cpp-python 설치 완료!")
        return True
    except Exception as e:
        logger.error(f"llama-cpp-python 설치 실패: {str(e)}")
        return False

def download_gguf_model(model_name):
    """해당 모델의 1bit 양자화 GGUF 모델을 다운로드합니다."""
    os.makedirs(GGUF_DIR, exist_ok=True)
    
    # 모델명에 따라 적절한 GGUF 모델 매핑
    gguf_models = {
        "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B": {
            "repo": "TheBloke/deepseek-llm-7B-chat-GGUF",  # B가 대문자
            "file": "deepseek-llm-7b-chat.Q2_K.gguf"  # Q2_K가 정확한 파일명
        },
        "deepseek-ai/DeepSeek-V3-lite": {
            "repo": "TheBloke/DeepSeek-Coder-V2-Lite-GGUF",
            "file": "deepseek-coder-v2-lite.Q2_K.gguf"
        },
        "deepseek-ai/DeepSeek-R1-Distill-Llama-8B": {
            "repo": "TheBloke/deepseek-llm-7B-chat-GGUF",  # B가 대문자
            "file": "deepseek-llm-7b-chat.Q2_K.gguf"
        }
    }
    
    model_info = gguf_models.get(model_name)
    if not model_info:
        logger.warning(f"모델 '{model_name}'에 대한 GGUF 버전을 찾을 수 없습니다. 기본 모델을 사용합니다.")
        model_info = {
            "repo": "TheBloke/deepseek-llm-7B-chat-GGUF",  # B가 대문자
            "file": "deepseek-llm-7b-chat.Q2_K.gguf"
        }
    
    target_repo = model_info["repo"]
    target_file = model_info["file"]
    gguf_path = os.path.join(GGUF_DIR, target_file)
    
    if os.path.exists(gguf_path):
        logger.info(f"GGUF 모델이 이미 존재합니다: {gguf_path}")
        return gguf_path
    
    try:
        logger.info(f"GGUF 모델 다운로드 중: {target_repo}/{target_file}")
        print(f"1bit 양자화 모델 다운로드 중: {target_file}. 파일 크기가 크므로 시간이 걸릴 수 있습니다...")
        
        # Hugging Face Hub에서 모델 다운로드
        from huggingface_hub import hf_hub_download
        gguf_file = hf_hub_download(
            repo_id=target_repo,
            filename=target_file,
            local_dir=GGUF_DIR,
            local_dir_use_symlinks=False
        )
        
        logger.info(f"GGUF 모델 다운로드 완료: {gguf_file}")
        return gguf_file
    except Exception as e:
        logger.error(f"GGUF 모델 다운로드 실패: {str(e)}")
        return None

def load_model(model_name_or_path="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", use_4bit=False, use_1bit=True, use_cpu=True):
    """모델과 토크나이저를 로드합니다."""
    global model, tokenizer, model_name, is_loaded, is_llama_cpp
    
    model_name = model_name_or_path
    logger.info(f"모델 로딩 시작: {model_name_or_path}")
    start_time = time.time()
    
    # 캐시 디렉토리 생성
    os.makedirs(CACHE_DIR, exist_ok=True)
    logger.info(f"모델 캐시 디렉토리: {CACHE_DIR}")
    
    # CUDA 사용 가능 여부 확인
    cuda_available = check_cuda_available()
    if not cuda_available and not use_cpu:
        logger.warning("CUDA를 사용할 수 없습니다. CPU 모드로 전환합니다.")
        use_cpu = True
    
    try:
        # CPU 모드에서 1bit 양자화를 위해 llama.cpp 사용
        if use_cpu and use_1bit and LLAMA_CPP_AVAILABLE:
            logger.info("CPU에서 1bit 양자화를 위해 llama.cpp 사용")
            
            # GGUF 모델 다운로드
            gguf_path = download_gguf_model(model_name_or_path)
            if not gguf_path:
                raise ValueError("GGUF 모델 다운로드 실패")
            
            # llama.cpp로 모델 로드
            model = Llama(
                model_path=gguf_path,
                n_ctx=2048,
                n_batch=512,
                verbose=False
            )
            
            # 토크나이저는 사용하지 않음 (llama.cpp 내장 토크나이저 사용)
            tokenizer = None
            is_llama_cpp = True
            logger.info(f"llama.cpp로 1bit 양자화 모델 로드 완료! 소요 시간: {time.time() - start_time:.2f}초")
            is_loaded = True
            save_model_info(model_name_or_path, "llama_cpp_1bit")
            return True
            
        # CPU 모드에서 양자화 없이 float16 사용
        elif use_cpu:
            logger.info("CPU 모드에서 float16으로 모델 로드")
            device_map = "cpu"
            
            model = AutoModelForCausalLM.from_pretrained(
                model_name_or_path,
                device_map=device_map,
                torch_dtype=torch.float16,
                low_cpu_mem_usage=True,
                cache_dir=CACHE_DIR
            )
            
            # 토크나이저 로드
            tokenizer = AutoTokenizer.from_pretrained(model_name_or_path, cache_dir=CACHE_DIR)
            is_llama_cpp = False
            
        # GPU 환경에서의 양자화 설정
        else:
            device_map = "auto"
            logger.info("GPU 모드로 모델 로드")
            
            if use_1bit:
                logger.info("1bit 양자화 모드로 모델 로드 (메모리 사용량 최소화)")
                quantization_config = BitsAndBytesConfig(
                    load_in_8bit=True,
                    llm_int8_threshold=0.0,
                    llm_int8_has_fp16_weight=False,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4"
                )
            elif use_4bit:
                logger.info("4bit 양자화 모드로 모델 로드")
                quantization_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4"
                )
            else:
                logger.info("양자화 없이 모델 로드")
                quantization_config = None
            
            # 양자화 설정에 따라 모델 로드
            if quantization_config:
                model = AutoModelForCausalLM.from_pretrained(
                    model_name_or_path,
                    device_map=device_map,
                    quantization_config=quantization_config,
                    low_cpu_mem_usage=True,
                    cache_dir=CACHE_DIR
                )
            else:
                model = AutoModelForCausalLM.from_pretrained(
                    model_name_or_path, 
                    device_map=device_map,
                    low_cpu_mem_usage=True,
                    cache_dir=CACHE_DIR
                )
            
            # 토크나이저 로드
            tokenizer = AutoTokenizer.from_pretrained(model_name_or_path, cache_dir=CACHE_DIR)
            is_llama_cpp = False
        
        logger.info(f"모델 로딩 완료! 소요 시간: {time.time() - start_time:.2f}초")
        is_loaded = True
        save_model_info(model_name_or_path)
        return True
        
    except Exception as e:
        logger.error(f"모델 로드 실패: {str(e)}")
        
        # llama-cpp-python이 설치되지 않았고 CPU에서 1bit 양자화를 시도하는 경우 설치 시도
        if use_cpu and use_1bit and not LLAMA_CPP_AVAILABLE:
            logger.info("llama-cpp-python 설치 시도...")
            if install_llama_cpp():
                logger.info("llama-cpp-python 설치 완료. 모델 로드 재시도...")
                return load_model(model_name_or_path, use_4bit, use_1bit, use_cpu)
        
        is_loaded = False
        return False

def save_model_info(model_name, model_type="transformers"):
    """현재 로드된 모델 정보를 저장합니다."""
    info = {
        "model_name": model_name,
        "model_type": model_type,
        "loaded_time": time.time(),
        "status": "loaded" if is_loaded else "failed"
    }
    try:
        with open(os.path.join(CACHE_DIR, "model_info.json"), "w") as f:
            json.dump(info, f)
    except Exception as e:
        logger.error(f"모델 정보 저장 실패: {str(e)}")

def get_available_models():
    """사용 가능한 모델 목록을 반환합니다."""
    return [
        {"id": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", "name": "DeepSeek R1 Distill 7B (권장)", "size": "7B"},
        {"id": "deepseek-ai/DeepSeek-V3-lite", "name": "DeepSeek V3 Lite (저사양 권장)", "size": "3B"},
        {"id": "deepseek-ai/DeepSeek-R1-Distill-Llama-8B", "name": "DeepSeek R1 Llama 8B", "size": "8B"}
    ]

def generate_response(prompt, max_length=1000, temperature=0.7):
    """프롬프트에 대한 응답을 생성합니다."""
    global model, tokenizer, is_loaded, is_llama_cpp
    
    if not is_loaded:
        result = load_model()  # 기본 모델 로드 시도
        if not result:
            return "모델이 로드되지 않았습니다. 서버 로그를 확인해주세요."
    
    try:
        # DeepSeek 모델 프롬프트 형식으로 변환
        if not prompt.startswith("User:") and not "User:" in prompt:
            formatted_prompt = f"User: {prompt}\n\nA:"
        else:
            formatted_prompt = prompt
            if not formatted_prompt.endswith("A:"):
                formatted_prompt += "\n\nA:"
        
        logger.info(f"최종 프롬프트: {formatted_prompt[:100]}...")
        
        # llama.cpp 모델과 transformers 모델 구분하여 처리
        if is_llama_cpp:
            # llama.cpp 모델 사용
            output = model(
                formatted_prompt,
                max_tokens=max_length,
                temperature=temperature,
                top_p=0.9,
                echo=False,
                stop=["User:", "\n\nUser:"]  # DeepSeek 모델의 중지 토큰
            )
            
            if isinstance(output, dict) and "choices" in output and len(output["choices"]) > 0:
                response = output["choices"][0]["text"].strip()
                logger.info(f"응답 생성 완료 (llama.cpp): {response[:50]}...")
            else:
                logger.error(f"llama.cpp 응답 형식 오류: {output}")
                response = "응답 생성 중 오류가 발생했습니다. 응답 형식이 잘못되었습니다."
        else:
            # transformers 모델 사용
            inputs = tokenizer(formatted_prompt, return_tensors="pt").to(model.device)
            
            with torch.no_grad():
                outputs = model.generate(
                    inputs["input_ids"],
                    max_new_tokens=max_length,
                    temperature=temperature,
                    do_sample=True,
                    top_p=0.9,
                    pad_token_id=tokenizer.eos_token_id
                )
            
            response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
            logger.info(f"응답 생성 완료 (transformers): {response[:50]}...")
        
        return response
    except Exception as e:
        logger.error(f"응답 생성 중 오류 발생: {str(e)}")
        return f"응답 생성 중 오류가 발생했습니다: {str(e)}"

# 모듈이 직접 실행될 때 테스트를 위한 코드
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='AI 모델 테스트')
    parser.add_argument('--model', type=str, default="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", 
                        help='사용할 모델 (기본값: DeepSeek-R1-Distill-Qwen-7B)')
    parser.add_argument('--no-4bit', action='store_true', 
                        help='4bit 양자화 비활성화')
    parser.add_argument('--no-1bit', action='store_true', 
                        help='1bit 양자화 비활성화')
    parser.add_argument('--gpu', action='store_true', 
                        help='GPU 모드 사용 (기본값: CPU 모드)')
    parser.add_argument('--prompt', type=str, 
                        default="안녕하세요, 저는 출결 관리 시스템 AI 비서입니다. 무엇을 도와드릴까요?", 
                        help='테스트할 프롬프트')
    
    args = parser.parse_args()
    
    print(f"모델 '{args.model}' 로딩 중...")
    use_4bit = not args.no_4bit and not args.no_1bit  # 둘 다 비활성화되지 않은 경우 4bit 사용
    use_1bit = not args.no_1bit  # 1bit가 비활성화되지 않은 경우 사용
    use_cpu = not args.gpu  # GPU 옵션이 지정되지 않은 경우 CPU 사용
    
    # 실행 설정 정보 출력
    print(f"CPU 모드: {use_cpu}")
    print(f"1bit 양자화: {use_1bit}")
    print(f"4bit 양자화: {use_4bit and not use_1bit}")
    
    result = load_model(args.model, use_4bit, use_1bit, use_cpu)
    
    if result:
        print("모델 로드 성공!")
        response = generate_response(args.prompt)
        print(f"\n프롬프트: {args.prompt}")
        print(f"\n응답: {response}")
    else:
        print("모델 로드 실패!") 