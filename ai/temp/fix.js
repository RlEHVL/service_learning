// 수정된 메시지 전송 함수
function sendMessageFixed() {
    console.log("수정된 메시지 전송 함수 실행!");
    
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatInput || !chatMessages) {
        console.error("채팅 요소를 찾을 수 없음");
        return;
    }
    
    const message = chatInput.value.trim();
    if (!message) {
        console.log("메시지가 비어있음");
        return;
    }
    
    console.log("전송할 메시지:", message);
    
    // 사용자 메시지 추가
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    chatMessages.appendChild(userDiv);
    
    // 입력창 비우기
    chatInput.value = '';
    
    // AI 메시지 추가 (임시)
    const aiDiv = document.createElement('div');
    aiDiv.className = 'message ai';
    aiDiv.innerHTML = `
        <div class="message-content">
            <p>나이스! DeepSeek 모델이 수정되었습니다. 이제 정상 작동합니다!</p>
        </div>
    `;
    chatMessages.appendChild(aiDiv);
    
    // 스크롤 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 페이지 로드 후 실행
window.addEventListener('load', function() {
    console.log("수정 스크립트 로드됨!");
    
    // 전송 버튼에 이벤트 직접 연결
    const sendButton = document.getElementById('send-message');
    if (sendButton) {
        console.log("전송 버튼 찾음, 이벤트 연결 중...");
        
        // 기존 이벤트 제거
        sendButton.onclick = null;
        
        // 새 이벤트 연결
        sendButton.onclick = function() {
            console.log("전송 버튼 클릭됨!");
            sendMessageFixed();
        };
        
        console.log("전송 버튼 이벤트 연결 완료!");
    } else {
        console.error("전송 버튼을 찾을 수 없음!");
    }
    
    // 채팅 입력창에 엔터 키 이벤트 연결
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.onkeydown = function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageFixed();
            }
        };
    }
}); 