/**
 * 参数设置
 *
 */

;(function($) {
    var storage = localStorage,

        // 刷新开始时间
        refreshStart,

        // 刷新频率
        refreshFrequency,

        // 是否开启全拼校正
        regulate,

        // 提交卡时
        submitDelay,

        // 保存按钮
        submitBtn;

    
    refreshStart = $('#refreshStart');
    refreshFrequency = $('#refreshFrequency'); 
    submitDelay = $('#submitDelay');
    submitBtn = $('#setting-submit');

    // 初始化页面
    function initView() {
        if (storage.getItem('refreshStart')) {
            refreshStart.val(storage.getItem('refreshStart'));  
        }

        if (storage.getItem('refreshFrequency')) {
            refreshFrequency.val(storage.getItem('refreshFrequency'));
        }

        if (storage.getItem('submitDelay')) {
            submitDelay.val(storage.getItem('submitDelay'));
        }

        if (storage.getItem('regulate')) {
            $('[name="regulate"][value="' + storage.getItem('regulate') + '"]').prop('checked', true);
        }
    }

    //  保存fn
    function save() {
        storage.removeItem('refreshStart');
        storage.setItem('refreshStart', refreshStart.val());

        storage.removeItem('refreshFrequency');
        storage.setItem('refreshFrequency', refreshFrequency.val()); 

        storage.removeItem('submitDelay');
        storage.setItem('submitDelay', submitDelay.val());

        storage.removeItem('regulate');
        regulate = $('[name="regulate"]:checked');
        storage.setItem('regulate', regulate.val()); 
    }

    // 更新
    function update() {
        if (refreshStart.val() !== storage.getItem('refreshStart')) {
            storage.setItem('refreshStart', refreshStart.val()); 
        }

        if (refreshFrequency.val() !== storage.getItem('refreshFrequency')) {
            storage.setItem('refreshFrequency', refreshFrequency.val()); 
        }

        if (submitDelay.val() !== storage.getItem('submitDelay')) {
            storage.setItem('submitDelay', submitDelay.val()); 
        }

        regulate = $('[name="regulate"]:checked');
        if (regulate.val() !== storage.getItem('regulate')) {
            storage.setItem('regulate', regulate.val()); 
        }
    }

    // 更新设置 
     
    submitBtn.on('click', function() {
        var elem = submitBtn.next();

        // 上次保存操作未完成
        if (submitBtn.data('state')) {
            return;  
        }

        // 更新设置
        update();
        
        // 显示成功提示
        elem.addClass('msg-show');

        //
        submitBtn.data('state', true);

        // 1秒后关闭提示
        setTimeout(function() {
            elem.removeClass('msg-show'); 

            // 
            submitBtn.data('state', false);
        }, 1200);
    });

    // 
    initView();

    // 自动保存
    save();
})(jQuery);
