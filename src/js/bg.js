/**
 * 数据通信
 */

;(function() {
    var storage = localStorage;

    // 
    chrome.runtime.onConnect.addListener(function(port) {
        port.onMessage.addListener(function(msg) {
            // 更新设置
            switch (msg.type) {
                case 'update':
                    port.postMessage({
                        refreshStart: storage['refreshStart'],
                        refreshFrequency: storage['refreshFrequency'],
                        submitDelay: storage['submitDelay'],
                        regulate: storage['regulate']
                    });
                    break;
                default:
                    break;
            }
        });
    });
})();
