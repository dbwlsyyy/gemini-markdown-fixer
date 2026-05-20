(function() {
    'use strict';

    // 1. Trusted Types 정책의 안전한 생성
    let policy;
    try {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            const policyName = 'gemini-fix-policy-v2';
            const existingPolicies = Array.from(window.trustedTypes.getPolicyNames());
            if (!existingPolicies.includes(policyName)) {
                policy = window.trustedTypes.createPolicy(policyName, {
                    createHTML: (input) => input
                });
            }
        }
    } catch (e) {
        console.error('Trusted Types policy creation failed:', e);
    }

    // 2. 마크다운 수정 로직
    function fixMarkdown(element) {
        // 텍스트 노드만 순회하며 수정하여 HTML 태그 파괴 방지
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToReplace = [];

        while (node = walker.nextNode()) {
            const text = node.nodeValue;
            
            // 패턴 1: **텍스트**한글 -> **텍스트** 한글 (공백 추가)
            const spaceRegex = /(\*\*[^\*]+\*\*)([가-힣]+)/g;
            
            // 패턴 2: 렌더링되지 않은 **텍스트**를 <b>텍스트</b>로 강제 변환 (사용자 피드백 반영)
            // 주의: 이미 HTML로 변환된 경우(<strong> 등)는 건드리지 않음
            const boldRegex = /\*\*([^\*]+)\*\*/g;

            if (spaceRegex.test(text) || boldRegex.test(text)) {
                nodesToReplace.push(node);
            }
        }

        if (nodesToReplace.length > 0) {
            // 무한 루프 방지를 위해 observer 일시 중단
            if (globalObserver) globalObserver.disconnect();

            nodesToReplace.forEach(node => {
                let newText = node.nodeValue;
                
                // 공백 수정
                newText = newText.replace(/(\*\*[^\*]+\*\*)([가-힣]+)/g, '$1 $2');
                
                // 볼드체 강제 렌더링 (HTML 태그로 변환)
                // 텍스트 노드를 HTML로 바꾸려면 부모 요소의 innerHTML을 건드려야 함
                const span = document.createElement('span');
                const htmlContent = newText.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
                
                if (policy) {
                    span.innerHTML = policy.createHTML(htmlContent);
                } else {
                    span.innerHTML = htmlContent;
                }

                if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                }
            });

            startObserving();
        }
    }

    // 3. MutationObserver 설정
    let globalObserver;
    const observerCallback = (mutations) => {
        // 성능을 위해 디바운싱 적용 가능하지만, 여기서는 즉시 처리
        const targets = document.querySelectorAll('.markdown, .markdown-main-panel, [data-message-author-role="assistant"]');
        targets.forEach(target => fixMarkdown(target));
    };

    globalObserver = new MutationObserver(observerCallback);

    function startObserving() {
        globalObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true // 텍스트 변경 감지 (스트리밍 대응)
        });
    }

    // 초기 실행 및 반복 실행 (스트리밍 대응)
    startObserving();
    
    // 제미나이의 동적 로딩 대응을 위해 주기적으로 체크 (보조 장치)
    setInterval(() => {
        const targets = document.querySelectorAll('.markdown, .markdown-main-panel, [data-message-author-role="assistant"]');
        if (targets.length > 0) {
            observerCallback([]);
        }
    }, 2000);
})();
