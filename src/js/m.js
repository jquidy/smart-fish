/*
 * 自动刷新抢宝 Smart Fish v1.0.6
 * javascript.heliang@gmail.com
 *
 * 1. 支持空格提交
 * 2. 支持过滤掉回车键周围的非字母字符、数字字符、大写字母转化成小写字母
 * 3. 支持用户忘记选择sku情况下帮你选中一个 
 * 4. 支持两字全拼时候输入中文自动帮你提交对应的全拼 （目前只支持Mac系统下的搜狗输入法）
 * 5. 支持三字全拼时候输入的是中文情况下按下shift键自动提交（目前只支持Mac系统下的搜狗输入法）
 * 6. 支持秒杀开始后看不清问题，按下0键换题
 * 7. 秒杀成功后自动播放音乐
 *
 */

//Serialize an array of form elements or a set of
//key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = key + "=" + value;
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( /%20/g, "+" );
};

(function($) {
    // 秒杀开始时间
    var start,

        // 获取是否还有库存接口
        stockUrl = 'http://m.ajax.taobao.com/stock2.htm?id=',

        // 获取秒杀问题接口
        questUrl = 'http://m.ajax.taobao.com/qst.htm?id=',

        // 音乐文件地址
        soundUrl = chrome.extension.getURL('/media/sound.mp3'),
        
        // 过滤不小心输入的特殊非法字符正则
        regexp = /[-_=+{}\[\]\|\\\:;"'<>,\.\?\/\d]/g,

        storage = localStorage,

        head = document.head, 

        body = document.body;

    function SmartFish() {
        // 默认150ms刷新一次
        this.delay = 150;

        // 定时器id 
        this.interval = 0;

        // 秒杀提交的表单
        this.bidForm = null;

        this.itemId = '';

        // 答题输入框
        this.answerInput = null;

        // 秒杀问题 
        this.questImg = null;

        // 秒杀开始具体时间
        this.upper = '';

        // 秒杀几点几分开始，14:30
        this.minute = '';
        
        // 记录输入的拼音
        this.pinyin = '';

        // 全拼
        this.total = '';

        // 首字母
        this.first = '';

        // 汉字
        this.chinese = '';

        // 提交表单sign
        this.sign = '';

        // 刷新抢宝按钮状态
        this.refreshing = false;
        
        //
        this.useTime = null;

        // 是否已提交过表单
        this.flag = false;

        // 表单提交返回信息
        this.resultsMsg = null;

        // 创建订单返回信息
        this.doubleCheck = null;

        // 表单提交日志
        this.log = null;

        // 音乐播放器元素
        this.audio = null;
    }

    SmartFish.prototype = {
        // 
        constructor: SmartFish,
        
        init: function() {
            this.pageDiff();
        },

        pageDiff: function() {
            var href = location.href;

            // 1元特价页面
            if (href.indexOf('tejia.taobao.com/one.htm') > -1) {
                // TODO
            } else if (href.indexOf('miao.item.taobao.com') > -1) { // 秒杀商品页面
                this.domReady();
            }
        },

        // 依赖的元素是否准备好
        domReady: function() {
            var that = this;
            
            if ($('.upper')[0]) {
                this.prefetch();
                this.initView();
                this.getUpper();
                this.syncTime();
                this.initForm();
                this.addEvent();
            } else {
                setTimeout(function() {
                    that.domReady();      
                }, 1);
            }
        },

        // dns 预解析，提升接口请求、显示图片和提交订单速度
        prefetch: function() {
            var domains = [
                    '//m.ajax.taobao.com',
                    '//img1.tbcdn.cn',
                    '//buy.taobao.com'
                ];

            $.each(domains, function(index, domain) {
                $('<link rel="dns-prefetch" href="' + domain + '">').prependTo(head); 
            });
        },

        initView: function() {
            var elem = $('#J_SecKill'),
                table = [];

            // 添加smart fish 命名空间
            $(body).addClass('smart-fish');

            // 秒杀开始时间
            elem.before('<div class="secKill-startTime" id="startTime"></div>');

            // 倒计时elem
            elem.before('<div class="countdown" id="countdown"></div>');

            table = [
                '<table>',
                '<tbody>',
                '<tr>',
                '<td>',
                '提交答案：',
                '</td>',
                '<td>',
                '<span id="answer-msg" class="answer-time">-</span>',
                '</td>',
                '</tr>',
                '</tr>',
                '<tr>',
                '<td>',
                '出图用时：',
                '</td>',
                '<td>',
                '<span id="appear-time" class="appear-time answer-time">-</span>',
                '毫秒',
                '</td>',
                '</tr>',

                '<tr>',
                '<td>',
                '答题用时：',
                '</td>',
                '<td>',
                '<span class="front-answer answer-time">-</span>',
                '秒',
                '</td>',
                '</tr>',
                '<tr>',
                '<td>',
                '提交时间：',
                '</td>',
                '<td>',
                '<span class="submit-answer answer-time">-</span>',
                '秒',
                '</td>',
                '</tr>',
                '</tr>',
                '<tr>',
                '<td>',
                '返回时间：',
                '</td>',
                '<td>',
                '<span class="stock2-answer answer-time">-</span>',
                '秒',
                '</td>',
                '</tr>',
                '</tobdy>',
                '</table>'
            ];

            // 秒杀用时
            elem.after('<div class="spend-time" id="spendTime"><h2>答题信息：</h2>' + table.join('') + '</div>');

            // 库存信息 
            // elem.after('<div class="secKill-stock" id="secKillStock"><h2>库存信息：</h2><table><tbody><tr><td><span id="stockNum" class="stockNum">' + $('#J_SpanStock').text() + '</span>件</td><td></td></tr></tbody></table></div>');

            // 秒杀结果
            // elem.after('<div class="secKill-results" id="secKillResults"><h2>秒杀结果：</h2><table><tbody><tr><td id="results" class="results">-</td><td></td></tr></tbody></table></div>');

            // 日志信息 
            elem.after('<div class="secKill-log" id="secKillLog"><h2>日志信息：</h2><div class="secKillLog-cont"><table><tbody id="log" class="log"><tr><td>-</td></tr></tbody></table></div></div>');

            // 表单提交返回信息
            $(body).append('<div id="resultsMsg" class="results-msg"></div>');

            // 
            $(body).append('<div id="doubleCheck" class="double-check"></div>');

            // 音乐播放器
            $(body).append('<audio src="' + soundUrl + '" id="audio" class="audio"></audio>');
            
            //
            this.selectSKU();

            // 秒杀提交的表单元素
            this.bidForm = $('#J_FrmBid');

            // 商品id
            this.itemId = $('input[name="item_id"]').val();

            // 秒杀用时元素
            this.useTime = $('#spendTime');

            // 
            this.resultsMsg = $('#resultsMsg');

            //
            this.doubleCheck = $('#doubleCheck');

            // 
            this.log = $('#log');

            // 
            this.audio = $('#audio');

            // 秒杀问题区域调整
            setTimeout(function() {
                $('#J_ImgBooth')[0].scrollIntoView();
            }, 10);
        },

        getUpper: function() {
            var elem = $('.upper'),
            
                date;

            this.minute = $('.time', elem).text();

            // 开始日期
            date = $('.date', elem).text();

            // 显示秒杀开始时间
            $('#startTime').html('<span class="start-time">秒杀开始时间：</span></span><span class="date">' + date + '</span><span class="time">' + this.minute + '</span>');

            // 
            this.upper = new Date(date.replace(/年|月/g, '-').replace(/日/, '') + ' ' + this.minute  + ':00');   
        },

        // 同步服务器时间到本地
        syncTime: function() {
            var that = this;
            
            // 获取服务器时间需要异步
            this.getDiff().done(function(diff) {
                //
                that.startup(that.timer(diff, that));
            });
        },

        addEvent: function() {
            var that = this;

            $(document).on('keydown', function(e) {
                switch (e.keyCode) {
                    case 13: // 回车提交
                        that.submit();
                        break;
                    case 16: // shift 键提交，适用于处于中文输入法状态，需要输入全拼的情况
                        // 输入的是三字全拼，四字首字母情况
                        if (that.answerInput && (that.answerInput.val() || '').split(/'/).length >= 3) {
                            that.submit();
                        }
                        break;
                    case 27: // esc键提交首字母
                        if (that.first) {
                            that.answerInput.val(that.first);     

                            // esc键提交首字母
                            that.submit();
                        }
                        break;
                    case 32: // 空格提交
                        that.submit();
                        break;
                    case 48: // 0键自动更换题目 
                        // 秒杀开始时候，换题功能生效
                        if (start) {
                            // 重新获取秒杀问题
                            that.getQuest().done(function(data) {
                                data = JSON.parse(data);

                                // 秒杀已经开始
                                if (data && data.qst) {
                                    that.log.append('<tr><td>重新获取问题成功，请重新答题</td></tr>');

                                    // 显示秒杀问题
                                    that.initQuest(data.qst);

                                    // 提交表单token
                                    that.sign = data.sign;

                                    // 答案输入框获取焦点
                                    that.answerInput.focus();
                                } else {
                                    that.flag = true;

                                    that.log.append('<tr><td>重新获取问题失败，秒杀已结束</td></tr>');
                                }
                            }).always(function() {
                                // TODO 
                            });
                        }

                        // 清空输入框
                        setTimeout(function() {
                            that.answerInput.val('');
                        }, 0);
                        break;
                    default:
                        break;
                }
            });

            // 过滤掉不小心输错的字符、大写转化为小写
            this.answerInput[0].addEventListener('input', function() {
                // this.value = this.value.replace(/[-_=+{}\[\]\|\\\:;"'<>,\.\?\/]/g, '').toLowerCase();
                that.parse(this.value);
            }, false);

            $('.J_Submit').on('click', function(e) {
                e.preventDefault(); 
                
                that.submit();
            });
        },

        // 启动
        startup: function(fn) {
            var that = this;

            // 先清除上次定时
            clearInterval(this.interval);

            this.interval = setInterval(function() {
                fn();
            }, this.delay);
        },

        // 显示倒计时
        timer: function(diff, that) {
            return function() {
                var d1,
                    d2;

                d1 = new Date();
                d2 = new Date();

                d1.setTime(d2.getTime() - diff);
                
                // 倒计时
                that.countdown(d1);

                // 到一定时间改变刷新频率
                that.compare(d1); 
            }
        },

        // 获取本地与服务器相差时间
        getDiff: function() {
            var url,

                // 发送ajax请求之前的时间
                before,

                // 接收到服务器响应之后的时候
                after,

                // 响应头时间
                date,
                
                // 平均时间
                round,
                
                // 本地时间和服务器相差的时间
                diff,
                
                dfd;

            dfd = $.Deferred();
            url = 'http://a.tbcdn.cn/p/fp/2011a/assets/space.gif?r=' + (new Date).getTime();
            before = new Date(); 

            // 
            this.ajax({url: url}).done(function(data, textStatus, xhr) {
                after = new Date();
                date = new Date(xhr.getResponseHeader('date')); 
                round = Math.floor((after.getTime() - before.getTime()) / 2);

                diff = after.getTime() - date.getTime() - round;

                dfd.resolveWith(null, [diff]);
            });

            return dfd.promise();
        },

        countdown: function(date) {
            var hh,

                // 分钟
                mm,

                // 秒数
                ss,

                // 毫秒数
                ms,

                // 当前服务器时间
                cur,
                
                diff;

            hh = this.formatDate(date.getHours())
            mm = this.formatDate(date.getMinutes());
            ss = this.formatDate(date.getSeconds());
            // ms
             
            diff = ((this.upper.getTime() - date.getTime()) / 1000).toFixed(0);

            // 参考安百主拍器显示时间
            if (diff > 0) {
                cur = '<span class="server-time">距开始还有：</span><span class="m-second remain-time">' + diff + ' 秒...</span>';
                $('#countdown').html(cur);      
            }
            // cur = '<span class="server-time">服务器时间：</span><span class="m-hour">' + hh + '</span>:<span class="m-minute">' + mm + '</span>:<span class="m-second">' + ss + '</span>';
        },

        // 选择sku，如果没有选择sku则帮其选中一个
        selectSKU: function() {
            var elems,
                lis;  

            elems = $('.tb-skin .tb-prop');
            $.each(elems, function() {
                lis = $('li', this);

                // 如果没有选择sku，则选中第一个
                if (!lis.hasClass('tb-selected')) {
                    lis.first().addClass('tb-selected');
                }
            });
        },

        // 提交答案
        submit: function() {
            var that = this,
                
                button,
                
                // 秒杀结束时间
                end,
                
                // 本次秒杀用时
                time;

            button = $('.J_Submit')[0];
            // 首先检查是否有提交按钮     
            if (!button) {
                return; 
            }

            // 检查是否有答案输入框
            if (this.answerInput && $.trim(this.answerInput.val()) === '') {
                return;
            }

            // 判断是否选择了sku
            this.selectSKU();

            // 填写答案过滤
            this.filter(this.answerInput);

            end = +new Date();

            time = end - start;

            // 如果用时小于1810ms，则延迟到1810ms再提交
            if (time < 1720) {
                setTimeout(function() {
                    that.submitForm();
                }, 1720 - time);
            } else {
                this.submitForm();
            }
        },

        filter: function(input) {
            var value;

            // 如果输入的是中文则帮提交 首字母、全拼
            // 如果是拼音则只提交默认表单
            if (/[\u4e00-\u9fa5]/g.test(this.chinese)) {
                // 输入的是两个汉字，则提交全拼
                if (this.chinese.replace(/[^\x00-\xff]/g,"**").length === 4) {
                    input.val(this.total);
                } else {
                    // 三字中文，首字母、全拼情况
                }
            }

            value = input.val();
            value = value.replace(regexp, '').toLowerCase();
            input.val(value);
        },

        submitForm: function() {
            var that = this,
            
                // jquery elem
                bidForm,

                // 答题输入框
                input,

                // 答案
                value,
                
                //
                url;

            bidForm = this.bidForm || $('#J_FrmBid');

            input = this.answerInput;

            value = $.trim(input.val());

            // 
            if (!this.sign || this.flag) {
                return;
            }

            url = stockUrl + this.itemId + '&skuId=' + $('#skuId').val() + '&an=' + value;

            // 正在进行库存验证
            this.log.append('<tr><td>正在进行库存验证...</td></tr>');

            this.ajax({url: url}).done(function(data) {
                var answer,
                    sign,
                    extra;

                data = data || {};

                // 转化成JSON
                data = JSON.parse(data);

                // 提交时间 
                that.spendTime('submit');

                // 验证库存返回时间
                that.spendTime('stock2', data.now - that.upper.getTime());

                answer = $('input[name="answer"]', bidForm);
                sign = answer.next();
                extra = answer.prev().get(0);

                // 中文情况下对答案进行GBK编码
                answer.val($URL.encode(value));
                sign.val(that.sign);
                if (!data.timkn || !data.timk) {
                    // 
                    that.log.append('<tr><td>库存: ' + data.stock + ' sku: ' + data.sku + ' 商品库存不足</td></tr>');
                     
                    return;
                } else {
                    that.log.append('<tr><td>库存: ' + data.stock + ' sku: ' + data.sku + ' 还有库存，提交订单中...</td></tr>');
                }

                extra.name = data.timkn;
                extra.value = data.timk;

                // 提交表单
                // bidForm.submit();
                
                // ajax提交表单
                that.ajax({
                    url: bidForm.attr('action'),
                    type: 'POST',
                    dataType: 'text',
                    data: bidForm.serialize(),
                    cache: false,
                    contentType: 'application/x-www-form-urlencoded'
                }).done(function(data) {
                    // TODO
                    that.log.append('<tr><td>订单提交成功，正在等待处理结果...</td></tr>');

                    // 
                    storage.setItem('response-text', data);

                    // 显示订单提交处理结果
                    that.progress(data);
                }).fail(function() {
                    // TODO
                });
            }).fail(function() {
                // TODO 
                that.flag = false;

                // 再次提交 
                that.submitForm();
            });

            // 显示提交的答案
            $('#answer-msg').text(value);

            // 填写完答案，提交答案的时间 
            this.spendTime('front');

            // 避免反复提交
            this.flag = true;
        },

        // 表单提交结果处理
        progress: function(data) {
            var that = this,
            
                match,
            
                results,
                
                code,

                input,

                name,

                href,
                
                // 
                hold;

            data = data || '';
            match = (data || '').match(/<!-- resultMsg :  -->\r\n([\s\S]+)<!-- Content End -->/);

            if (match) { // 
                results = match[1]; 

                // 表单提交结果显示到当前页面
                this.resultsMsg.html(results);

                input = $('input', this.resultsMsg);
                name = input.attr('name');

                switch (name) {
                    case 'resultCode': //
                        code = input.val();

                        switch(code) {
                            case '-13':
                                this.log.append('<tr><td>对不起，您要购买的商品库存不足</td></tr>');
                                break;
                            case '1111':
                            case '1113':
                            case '1150':
                                this.log.append('<tr><td>对不起，系统繁忙，请稍候再试</td></tr>');
                                break;
                            case '1115':
                                this.log.append('<tr><td>对不起，无法购买</td></tr>');
                                break;
                            case '1118':
                                this.log.append('<tr><td>对不起，此宝贝已不能购买</td></tr>');
                                break;
                            case '1121': // 答题超速，重新提交
                                this.log.append('<tr><td>答题超速，重新获取问题中...</td></tr>');

                                // 清空答案，重新答题
                                this.answerInput.val('').focus();

                                // 重新获取秒杀问题
                                this.getQuest().done(function(data) {
                                    data = JSON.parse(data);

                                    // 秒杀已经开始
                                    if (data && data.qst) {
                                        that.log.append('<tr><td>重新获取问题成功，请重新答题</td></tr>');

                                        // 显示秒杀问题
                                        that.initQuest(data.qst);

                                        // 提交表单token
                                        that.sign = data.sign;

                                        // 答案输入框获取焦点
                                        that.answerInput.focus();
                                    } else {
                                        that.flag = true;

                                        that.log.append('<tr><td>重新获取问题失败，秒杀已结束</td></tr>');
                                    }
                                }).always(function() {
                                    // TODO 
                                });

                                this.flag = false;
                                break;
                            case '1127': // 
                                this.log.append('<tr><td>该宝贝秒杀只针对固定用户开放</td></tr>');
                                break;
                            case '1138':
                                this.log.append('<tr><td>答案错误，重新获取问题中...</td></tr>');

                                // 清空答案，重新答题
                                this.answerInput.val('').focus();

                                // 重新获取秒杀问题
                                this.getQuest().done(function(data) {
                                    data = JSON.parse(data);

                                    // 秒杀已经开始
                                    if (data && data.qst) {
                                        that.log.append('<tr><td>重新获取问题成功，请重新答题</td></tr>');

                                        // 显示秒杀问题
                                        that.initQuest(data.qst);

                                        // 提交表单token
                                        that.sign = data.sign;

                                        // 答案输入框获取焦点
                                        that.answerInput.focus();
                                    } else {
                                        that.flag = true;

                                        that.log.append('<tr><td>重新获取问题失败，秒杀已结束</td></tr>');
                                    }
                                }).always(function() {
                                    // TODO 
                                });

                                this.flag = false;
                                break;
                            default:
                                // 其他情况处理
                                this.log.append('<tr><td>' + input.prev().text() + '</td></tr>');

                                storage.setItem('xxxxxxx', results); 
                                break;
                        }
                        break;
                    case 'waitTime': // 创建订单，服务器返回的延迟double check时间
                        hold = parseInt(input.val(), 10);

                        this.log.append('<tr><td>创建订单，延迟' + (hold / 1000).toFixed(3) + '秒才能再次提交</td></tr>');
                         
                        setTimeout(function() {
                            that.submitDouble(data);
                        }, hold);
                        break;
                    default:
                        storage.setItem('not resultsCode and not waitTime', results); 
                        break;
                }
            } else { 
                // 秒杀成功
                if (data.indexOf('doAlipayPay') > -1) {
                    match = data.match(/window\.location\s*=\s*"([\s\S]+)";/);

                    if (match) {
                        href = match[1];
                        this.log.append('<tr><td>抢拍成功，快去<a class="secKill-pay" title="点击到支付宝支付" href="' + href + '" target="_blank">付款</a>吧！</td></tr>');

                        // 抢拍成功后播放音乐
                        this.play(); 
                    }
                }
            }
        },

        // 创建订单无延迟自动提交double check
        submitDouble: function(data) {
            var that = this,
            
                match,
            
                html,
                
                form; 

            match = data.match(/<!-- resultMsg :  -->\r\n([\s\S]*?)<\/body>/);

            if (match) {
                html = match[1];

                // 添加到当前页面
                this.doubleCheck.html(html);

                // double check form
                form = $('form', this.doubleCheck);

                // ajax提交表单
                this.ajax({
                    url: 'http://buy.taobao.com' + form.attr('action'),
                    type: 'POST',
                    dataType: 'text',
                    data: form.serialize(),
                    cache: false,
                    contentType: 'application/x-www-form-urlencoded'
                }).done(function(data) {
                    // TODO
                    that.log.append('<tr><td>再次提交订单成功，正在等待处理结果...</td></tr>');

                    // 
                    storage.setItem('response-double-text' + (new Date().getTime()), data);

                    // 显示订单提交处理结果
                    that.progress(data);
                }).fail(function() {
                    // TODO
                });
            }
        },

        // 检测还有多长时间开始秒杀 
        compare: function(cur) {
            var date,// 秒杀开始时间 
                
                // 当前时间（以毫秒计）
                t1,
                
                // 秒杀开始时间（以毫秒计）
                t2,
                
                // 还有多久开始
                time;

            date = this.upper;
            t1 = cur.getTime();
            t2 = date.getTime();
            
            // 秒杀已结束
            if (!t2 || t2 < 0) {
                return;
            } else {
                time = t2 - t1;

                // 还有20s时候开启自动刷新抢宝
                if (time <= 20000) {
                    // 启动刷新抢宝
                    this.refresh();
                }
            }
        },

        refresh: function() {
            var that = this,
            
                // 答案输入框
                input,

                // 刷新抢宝按钮
                button;

            if (!this.refreshing) {
                this.getQuest().done(function(data) {
                    data = JSON.parse(data);
                    
                    // 秒杀已经开始
                    if (data && data.qst) {
                        // 显示秒杀问题
                        that.initQuest(data.qst);

                        // 记录秒杀开始时间
                        start = +new Date();

                        // 显示出图时间
                        $('#appear-time').text(data.now - that.upper.getTime());

                        // 提交表单token
                        that.sign = data.sign;

                        // 倒计时停止
                        that.stop();

                        // 答案输入框获取焦点
                        that.answerInput.focus();
                    }
                }).always(function() {
                    // 成功或者失败都移除loading
                    that.questImg.html('');

                    // 设置刷新状态标示
                    that.refreshing = false;
                });
            } else {
                // TODO 
            }

            // 已经在刷新了，防止接口阻塞了还在刷新
            this.refreshing = true;

            this.questImg.html('<img src="http://img03.taobaocdn.com/tps/i3/T1e2X3XoJaXXXXXXXX-16-16.gif" /> 刷新中，请稍候...');
        },

        // 获取秒杀问题
        getQuest: function() {
            return this.ajax({url: questUrl + this.itemId, timeout: 500});
        },

        initQuest: function(qst) {
            this.questImg.css({
                'background-blend-mode': 'hard-light',
                'background': 'url(' + qst + ') no-repeat center center #fff',
                'border': 'none'
            });
        },

        initForm: function() {
            var table = [
                    '<table>',
                    '<tr><td style="vertical-align: top">问题：</td><td><span class="quest-img" id="quest-img"></span></td></tr>',
                    '<tr class="answer"><td>答案：</td><td><input type="text" class="answer-input" id="answer-input"></td></tr>',
                    '<tr style="margin-top:15px"><td>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td><a href="#" class="J_Submit submit"></a></td></tr>',
                    '</table>'
                ].join('');
            
            $('#J_SecKill').html(table);

            this.answerInput = $('#answer-input');
            this.questImg = $('#quest-img');
            this.answerInput.focus();
        },

        // 解析输入的答案
        parse: function(value) {
            var that = this,
                str,
                letters;

            if ($.trim(value) === '') { // 清空首字母、全拼、中文
                this.first = ''; 
                this.total = ''; 
                this.chinese = '';
            } else if (/^\w+'/.test(value)) { // 是否是 shan'li'lai  这种形式 
                this.pinyin = value;
            } else { // 山里来 这种形式
                this.chinese = value.replace(regexp, '').toLowerCase();

                // 输入了中文说明本次输入结束 
                if (this.pinyin) {
                    // 全拼字母
                    str = this.pinyin;
                    letters = str.split("'"); 

                    // 赋值前先清空
                    this.first = '';
                    $.each(letters, function(i, letter) {
                        // 首字母
                        that.first += letter.charAt(0);
                    });

                    // 过滤掉不小心输错的字符、大写转化为小写
                    this.first = this.first.replace(regexp, '').toLowerCase();
                    
                    // 全拼
                    this.total = str.replace(/'/g, '').replace(regexp, '').toLowerCase();
                }
            }
        },

        // 秒杀耗时
        spendTime: function(type, value) {
            var now,
                time;

            if (typeof value !== 'undefined') {
                time = value;                 
            } else {
                now = +new Date();
                time = now - start;      
            }

            // 转化成秒
            time = (time / 1000).toFixed(3);

            $('.' + type + '-answer', this.useTime).text(time);
        },

        stop: function() {
            clearInterval(this.interval); 
        },

        ajax: function(option) {
            var settings = $.extend({}, {
                // 请求类型
                type: 'GET',

                // 请求超时设置
                timeout: 5000
            }, option);

            return $.ajax(settings);
        },

        formatDate: function(value) {
            return (value + '').length > 1 ? value : '0' + value;
        },

        // 秒杀成功之后播放音乐
        play: function() {
            if (this.audio && this.audio[0]) {
                this.audio[0].play();
            }
        }
    }

    var smartFish = new SmartFish();
    smartFish.init();
})(jQuery);
