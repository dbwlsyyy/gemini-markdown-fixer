(function() {
    'use strict';

    // 1. Trusted Types 정책의 안전한 생성
    let policy;
    try {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            // 이미 정책이 존재하는지 확인하거나 예외 처리
            const policyName = 'gemini-fix-policy';
            const existingPolicies = Array.from(window.trustedTypes.getPolicyNames());
            
            if (existingPolicies.includes(policyName)) {
                // 이미 존재하면 가져오거나, 여기서는 단순 로직이므로 새로 생성하지 않음
                // 실제로는 window.trustedTypes.getAttributeType 등을 활용할 수 있으나
                // 확장 프로그램 환경에서는 고유한 이름을 사용하는 것이 안전함
            } else {
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
        const originalHtml = element.innerHTML;
        
        // ** 개수가 짝수인지 확인
        const asteriskCount = (originalHtml.match(/\*\*/g) || []).length * 2;
        // 실제로는 ** 하나가 2개이므로 match 결과 * 2가 아니라 match 결과 자체가 **의 개수임
        const doubleAsteriskMatches = originalHtml.match(/\*\*/g);
        const count = doubleAsteriskMatches ? doubleAsteriskMatches.length : 0;
        
        if (count % 2 !== 0) return; // 짝수가 아니면 건너뜀

        // 정규식: 볼드체 뒤에 공백 없이 한글이 오는 경우
        // (\*\*[^\*]+\*\*)([가-힣]+)
        // 이미 공백이 있는 경우는 건너뛰도록 정규식에서 처리하거나 replace 로직에서 확인
        const regex = /(\*\*[^\*]+\*\*)([가-힣]+)/g;
        
        const modifiedHtml = originalHtml.replace(regex, (match, p1, p2) => {
            return `${p1} ${p2}`;
        });

        if (originalHtml !== modifiedHtml) {
            // 무한 루프 방지를 위해 일시적으로 observer 중단은 호출하는 쪽에서 처리
            if (policy) {
                element.innerHTML = policy.createHTML(modifiedHtml);
            } else {
                element.innerHTML = modifiedHtml;
            }
        }
    }

    // 3. MutationObserver 설정
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const targets = document.querySelectorAll('.markdown.markdown-main-panel.stronger');
                if (targets.length > 0) {
                    // 무한 루프 방지: 수정 전 disconnect
                    observer.disconnect();
                    
                    targets.forEach(target => fixMarkdown(target));
                    
                    // 수정 후 다시 observe
                    startObserving();
                }
            }
        }
    });

    function startObserving() {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 초기 실행
    startObserving();
})();
// Update: Added logic for better matching
