from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
import time
import os
import json

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='../')
CORS(app)  # 크로스 오리진 요청 허용

# 루트 디렉토리 설정
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/status', methods=['GET'])
def api_status():
    """서버 상태를 확인합니다."""
    from ai_model import is_model_loaded
    
    return jsonify({
        "status": "online",
        "model_loaded": is_model_loaded(),
        "server_time": time.time(),
        "server_version": "1.0.0"
    })

@app.route('/api/generate', methods=['POST'])
def api_generate():
    """텍스트 생성 API 엔드포인트"""
    try:
        # AI 모델 모듈 임포트 (매번 임포트하여 최신 상태 유지)
        from ai_model import generate_response
        
        data = request.json
        prompt = data.get('prompt', '')
        max_length = data.get('max_length', 1000)
        temperature = data.get('temperature', 0.7)
        
        if not prompt:
            return jsonify({"error": "프롬프트가 비어있습니다"}), 400
        
        response = generate_response(prompt, max_length, temperature)
        return jsonify({"response": response})
    
    except Exception as e:
        logger.error(f"API 오류: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """챗봇 API 엔드포인트"""
    try:
        # AI 모델 모듈 임포트
        from ai_model import generate_response
        
        data = request.json
        message = data.get('message', '')
        context = data.get('context', [])
        attendance_data = data.get('attendanceData', {})
        
        if not message:
            return jsonify({"error": "메시지가 비어있습니다"}), 400
        
        # 컨텍스트를 포함한 프롬프트 구성
        full_prompt = ""
        
        # 이전 대화 내역 추가
        if context:
            for msg in context:
                if msg['role'] == 'user':
                    full_prompt += f"User: {msg['content']}\n\n"
                else:
                    full_prompt += f"A: {msg['content']}\n\n"
        
        # 현재 사용자 메시지 추가
        full_prompt += f"User: {message}\n\n"
        full_prompt += "A:"
        
        # 응답 생성
        response = generate_response(full_prompt, 1000, 0.7)
        
        # 응답에서 불필요한 접두어/접미어 제거
        response = response.strip()
        if response.startswith("A:"):
            response = response[2:].strip()
        
        logger.info(f"채팅 응답 생성 완료: {response[:50]}...")
        
        return jsonify({"response": response})
    
    except Exception as e:
        logger.error(f"채팅 API 오류: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/models', methods=['GET'])
def api_models():
    """사용 가능한 모델 목록을 반환합니다."""
    try:
        from ai_model import get_available_models
        models = get_available_models()
        return jsonify({"models": models})
    except Exception as e:
        logger.error(f"모델 목록 조회 중 오류: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/load_model', methods=['POST'])
def api_load_model():
    """지정된 모델을 로드합니다."""
    try:
        from ai_model import load_model
        
        data = request.json
        model_name = data.get('model', 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B')
        use_4bit = data.get('use_4bit', False)
        use_1bit = data.get('use_1bit', True)
        use_cpu = data.get('use_cpu', True)
        
        # 모델 로드
        result = load_model(model_name, use_4bit, use_1bit, use_cpu)
        
        if result:
            return jsonify({"success": True, "message": f"모델 '{model_name}'을 성공적으로 로드했습니다."})
        else:
            return jsonify({"success": False, "message": f"모델 '{model_name}' 로드에 실패했습니다."}), 500
    
    except Exception as e:
        logger.error(f"모델 로드 중 오류: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='AI 서버 실행')
    parser.add_argument('--port', type=int, default=8080, help='서버 포트 (기본값: 8080)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='서버 호스트 (기본값: 0.0.0.0)')
    parser.add_argument('--model', type=str, default='deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', help='사용할 모델')
    parser.add_argument('--no-1bit', action='store_true', help='1bit 양자화 비활성화')
    parser.add_argument('--no-4bit', action='store_true', help='4bit 양자화 비활성화')
    parser.add_argument('--gpu', action='store_true', help='GPU 모드 사용 (기본값: CPU 모드)')
    
    args = parser.parse_args()
    
    # 서버 시작 시 모델 미리 로드 (선택 사항)
    try:
        from ai_model import load_model
        
        use_4bit = not args.no_4bit and not args.no_1bit
        use_1bit = not args.no_1bit
        use_cpu = not args.gpu
        
        logger.info(f"서버 시작 시 모델 '{args.model}' 미리 로드 중...")
        logger.info(f"CPU 모드: {use_cpu}, 1bit 양자화: {use_1bit}, 4bit 양자화: {use_4bit and not use_1bit}")
        
        load_model(args.model, use_4bit, use_1bit, use_cpu)
    except Exception as e:
        logger.warning(f"사전 모델 로드 실패 (요청 시 로드됨): {str(e)}")
    
    print(f"통합 서버를 http://{args.host}:{args.port}/ 에서 실행합니다...")
    app.run(host=args.host, port=args.port, debug=False) 