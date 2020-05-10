
/**
	*-- 开始：var myKeyboard = new Keyboard(selector, options)
	*-----------------------------------------------------------------------------------------------------------------
	*-- @param selector  		string			需用到键盘输入的元素id、class
	*-----------------------------------------------------------------------------------------------------------------
	*-- @param options			object
	*-----------------------------------------------------------------------------------------------------------------
	*---------- header 		 	boolean  		键盘头部
	*------------- show 	 	boolean 		是否显示头部，默认：true
	*------------- title 	 	string 			标题内容，默认：安全键盘
	*------------- titleColor 	string 			标题颜色
	*------------- iconShow 	boolean 		是否显示图标，默认：true
	*------------- iconUrl 		string 			图标URL
	*------------- rightShow 	boolean 		是否显示右边按钮，默认：true
	*------------- rightText 	string 			右边按钮内容，默认：完成
	*------------- rightColor 	string 			右边按钮颜色
	*-----------------------------------------------------------------------------------------------------------------
	*---------- keyboardType  	string   		键盘类型，默认：'standard'，标准键盘：'standard'，纯数字键盘：'number'
	*-----------------------------------------------------------------------------------------------------------------
	*---------- skin 		 	string/object  	键盘皮肤
	*------------- mode 	 	string 			默认：'light'，明亮：'light'，黑暗：'dark'（全键盘修改）
	*------------- style     	string 			默认：'succinct'，简洁：'succinct'，支付宝：'alipay'（只修改数字键盘）
	*-----------------------------------------------------------------------------------------------------------------
	*---------- decimal		 	boolean			是否显示小数点，默认：true（纯数字键盘生效）
	*-----------------------------------------------------------------------------------------------------------------
	*---------- random		 	boolean			是否乱序，默认：false（纯数字键盘生效）
	*-----------------------------------------------------------------------------------------------------------------
	*---------- thousand		boolean			是否开启数字千分位，默认：false（纯数字键盘生效）
	*-----------------------------------------------------------------------------------------------------------------
	*---------- mask 		 	boolean			是否开启掩码，默认：false
	*-----------------------------------------------------------------------------------------------------------------
	*---------- maxlength	 	boolean			输入框最大输入长度限制
	*-----------------------------------------------------------------------------------------------------------------
	*---------- placeholder 	string 			输入框无值时的提示信息
	*-----------------------------------------------------------------------------------------------------------------
	*---------- inputStyle 	 	object 			输入框样式，{width:'100%',height:100%,......}
	*-----------------------------------------------------------------------------------------------------------------
	*---------- complete 	 	function		点击完成、确定触发的回调函数，返回明文、掩码值，例：{value:'123',mask:'•••'}
	*-----------------------------------------------------------------------------------------------------------------
	*---------- keypress 	 	function		点击按键后触发的回调函数，返回当前键值
	*-----------------------------------------------------------------------------------------------------------------
	*-- @method
	*-----------------------------------------------------------------------------------------------------------------
	*---------- focus			function		输入框获取焦点并弹出键盘，例：myKeyboard.focus()
	*-----------------------------------------------------------------------------------------------------------------
	*---------- blur			function		输入框失去焦点并隐藏键盘，例：myKeyboard.blur()
	*-----------------------------------------------------------------------------------------------------------------
	*---------- getValue		function		获取输入框值，例：myKeyboard.getValue()
	*-----------------------------------------------------------------------------------------------------------------
	*---------- getMask			function		获取输入框带掩码的值，例：myKeyboard.getMask()
	*-----------------------------------------------------------------------------------------------------------------
	*---------- setValue		function		设置输入框值，例：myKeyboard.setValue(value)
	*-----------------------------------------------------------------------------------------------------------------
	*---------- clear			function		清空输入框值，例：myKeyboard.clear()
	*-----------------------------------------------------------------------------------------------------------------
	*/

;(function (win) {
		// 主题模式
	var THEME_MODE = "light",
		// 主题样式
		THEME_STYLE = "succinct",
		// 键盘弹出动画时间毫秒
		KEYBOARD_UP_DELAY = 300;

	var utils = {
			isObject: function (obj) {
				return obj && Object.getPrototypeOf(obj) === Object.prototype && Object.prototype.toString.call(obj) === '[object Object]'
			},
			isArray: Array.isArray || function (obj) {
				return obj instanceof Array
			},
			extend: function (target, source, deep) {
				for (var key in source) {
					if (deep && (this.isObject(source[key]) || this.isArray(source[key]))){
						this.isObject(source[key]) && !this.isObject(target[key]) && (target[key] = {})
						this.isArray(source[key]) && !this.isArray(target[key]) && (target[key] = [])
						this.extend(target[key], source[key], deep)
					} else if (source[key] !== undefined) {
						target[key] = source[key]
					}
				}
				return target;
			},
			hasClass: function (el, cls) {
				return new RegExp(' ' + cls + ' ').test(' ' + el.className + ' ')
			},
			addClass: function (el, cls) {
				if (this.hasClass(el, cls)) return;
				el.className = !el.className ? cls : (el.className + ' ' + cls)
			},
			removeClass: function(el, cls) {
				if (!this.hasClass(el, cls)) return;
		        var newClass = ' ' + el.className.replace(/[\t\r\n]/g, '') + ' ';
		            newClass = newClass.replace(' ' + cls + ' ', ' ');
		        el.className = newClass.replace(/^\s+|\s+$/g, '');
			},
			parents: function (el, selector) {
				var parents = [];
				var parent = el.parentNode;
				while (parent) {
					if (selector) {
						if (this.is(parent, selector)) {parents.push(parent)}
					} else {
						parents.push(parent)
					}
					parent = parent.parentNode;
				}
				return parents
			},
			is: function (el, selector) {
				if (el.matches) {return el.matches(selector)}
				else if (el.webkitMatchesSelector) {return el.webkitMatchesSelector(selector)}
				return document.querySelector(selector) === el
			},
			css: function (el, props, value) {
				if (arguments.length === 2){
					if (typeof props === 'string') {
						return win.getComputedStyle(el, null).getPropertyValue(props); 
					} else {
						for (var prop in props) {
							el.style[prop] = props[prop]
						}
					}
				}
				if (arguments.length === 3 && typeof props === 'string') {
					el.style[props] = value
				}
			},
			thousand: function (num) {
				return num.toString().replace(/\d+/, function (n) {
					return n.replace(/(\d)(?=(\d{3})+$)/g,function ($1) {
						return $1 + ',';
					})
				})
			}
		},
		_doc = win.document,
		blurTimer;

	var Keyboard = function (selector, opt) {
		if(!selector) {
			throw new Error('selector cannot be empty.'); 
			return;
		}
		this.inputWrap = _doc.querySelector(selector);
		if (!this.inputWrap) return;
		var defaultOption = {
			// 头部
			header: {
				show: true,
				iconShow: true,
				iconUrl: '',
				title: '安全键盘',
				titleColor: '',
				rightShow: true,
				rightText: '完成',
				rightColor: ''
			},
			// 键盘类型（standard：标准键盘，number：数字键盘，)
			keyboardType: "standard",
			// 主题
			// skin: "light",
			skin: {
				mode: "light", // light：明亮，dark：黑暗
				style: "succinct" // succinct：简洁，alipay：支付宝
			},
			// 数字键盘小数点
			decimal: true,
			// 数字键盘乱序
			random: false,
			// 数字千分位
	    	thousand: false,
			// 是否开启掩码
			mask: false,
			// 最大输入长度
	    	maxlength: 50,
	    	// 输入框提示信息
	    	placeholder: '',
	    	// 输入框样式
	    	inputStyle: {
	    		width: '100%',
	    		height: '100%'
	    	},
	    	complete: function () {},
	    	keypress: function () {}

		}
		var _id = +new Date() + '-' + (Math.random() * Math.pow(10, 5) | 0);
        this.keyboardId = "_keyboard-" + _id;
        this.keyboardInput = "_keyboard_input-" + _id;
        this.keys = {
        	letter: "QWERTYUIOPASDFGHJKLZXCVBNM",
        	number: "1234567890",
        	symbol: "[]{}<>()\\|~!@#$%^&*-+=:;\"\'/?"
        }
		this.options = utils.extend(defaultOption, opt, true)
		// 大写锁定状态 0：小写，1：大写，2：大写锁定
		this.capslock = '0';
		this.value = '';
		this.init()
	}

	Keyboard.prototype = {
		init: function () {
			// 数字键盘乱序
			if (this.options.random) {
				this.keys.number = this.keys.number.split("").sort(function () {
					return Math.random() - 0.5
				})
			}
			// 主题配置
			this.options.skin = this._initTheme()
			// 默认logo配置
			if (this.options.header.iconShow && !this.options.header.iconUrl) {
				this.options.header.iconUrl = './images/icon-logo-' + this.options.skin.mode + '.png'
			}
			this._createElem()
			this._bind()
		},
		// 初始化主题
		_initTheme: function () {
			var skin = this.options.skin,
				_type = typeof skin,
				_theme = {}
			if (_type === 'string') {
				_theme.mode = !!~['light','dark'].indexOf(skin) ? skin : THEME_MODE
				_theme.style = !!~['alipay','wechat'].indexOf(skin) ? skin : THEME_STYLE
			} else if (_type === 'object') {
				_theme.mode = !!~['light','dark'].indexOf(skin.mode) ? skin.mode : THEME_MODE
				_theme.style = !!~['alipay','wechat'].indexOf(skin.style) ? skin.style : THEME_STYLE
			} else {
				_theme.mode = THEME_MODE
				_theme.style = THEME_STYLE
			}
			return _theme
		},
		// 创建键盘DOM
		_createElem: function () {
			var tpl = '',
				_elem = _doc.createElement('div');
			_elem.className = 'keyboard-wrapper keyboard-transition ' + this.options.skin.mode;
			_elem.id = this.keyboardId
			var _width = win.innerWidth || _doc.documentElement.clientWidth || _doc.body.clientWidth,
				_height = win.innerHeight || _doc.documentElement.clientHeight || _doc.body.clientHeight;
			this.scale = _width / 375
			if (_width > _height) {
		        this.scale = _width / 375 + "," + _height / 1.8 / 280 ;
		    }
		    this._setKeyboardStyle(_elem)
			_doc.body.append(_elem)
			this.$el = _elem
			// 是否显示头部
			if (this.options.header.show) {
				tpl += '<div class="keyboard-header">'
				if (this.options.header.iconShow) tpl += '<img class="keyboard-icon" src="'+this.options.header.iconUrl+'">'
				tpl += '<span style="color:'+this.options.header.titleColor+'">'+this.options.header.title+'</span>';
				if (this.options.header.rightShow) tpl += '<span class="key-btn key-done" key="done" style="color:'+this.options.header.rightColor+'">'+this.options.header.rightText+'</span>';
				tpl += '</div>';
			}
			tpl += '<div class="keyboard-content">';
			if (this.options.keyboardType === 'standard') {
				tpl += [this._getLetterKeyboardHtml('lower'), this._getLetterKeyboardHtml('upper'), this._getSymbolKeyboardHtml()].join('')
			}
			tpl += this.options.skin.style === 'alipay' ? this._getAlipayNumberKeyboardHtml() : (this.options.skin.style === 'wechat' ? this._getWechatNumberKeyboardHtml() : this._getNumberKeyboardHtml());
			tpl += '</div>';
			this.$el.innerHTML = tpl
			this._getInputKeyboardHtml()
		},
		// 生成输入框
		_getInputKeyboardHtml: function () {
			var inputBox = _doc.createElement('div');
			inputBox.id = this.keyboardInput;
			inputBox.className = 'keyboard-inputwrap';
			utils.css(inputBox, this.options.inputStyle)
			var _elem = [
				'<span class="keyboard-input"></span>',
				'<i class="keyboard-cursor">|</i>',
				'<input type="text" style="display:none">',
				'<p class="keyboard-placeholder">'+ this.options.placeholder +'</p>'
			].join('');
			inputBox.innerHTML = _elem
			this.inputWrap.appendChild(inputBox)
		},
		// 生成字母键盘
		_getLetterKeyboardHtml: function (type) {
			var keysLetter = this.keys.letter,
				_capscls = 'lock',
				_display = 'style="display:none"';

			(type == 'lower') && (keysLetter = this.keys.letter.toLocaleLowerCase(), _capscls = '', _display ='')

			var _letterHtml = function (len, diff) {
				var _html = '<div class="keyboard-row">',
					idx = diff;
				for (var i = 0; i < len; i++) {
					_html += idx === 19 ? '<span class="key-btn key-capslock '+ _capscls +'" key="capslock"></span>' : '';
					_html += '<span class="key-btn" key="'+ keysLetter[idx] +'">'+ keysLetter[idx] +'</span>'
					_html += idx === 25 ? '<span class="key-btn key-backspace" key="backspace"></span>' : '';
					idx++
				}
				_html += '</div>';
				return _html
			}

			var letterKeyboard = '<div class="keyboard-main keyboard-letter"'+ _display +' type="'+ type +'">';
			letterKeyboard += [_letterHtml.call(this,10, 0), _letterHtml.call(this,9, 10), _letterHtml.call(this,7,19)].join('');
			letterKeyboard += '<div class="keyboard-row">'
			letterKeyboard += '<span class="key-btn key-number" key="number">123</span>'
			letterKeyboard += '<span class="key-btn key-symbol" key="symbol">#=+</span>'
			letterKeyboard += '<span class="key-btn key-dot" key=".">.</span>'
			letterKeyboard += '<span class="key-btn key-spacebar" key=" ">空格</span>'
			letterKeyboard += '<span class="key-btn key-confirm" key="confirm">确定</span>'
			letterKeyboard += '</div></div>'
			return letterKeyboard
		},
		// 生成字符键盘
		_getSymbolKeyboardHtml: function () {
			var keysSymbol = this.keys.symbol;
			var _symbolHtml = function (len, diff) {
				var _html = '<div class="keyboard-row">',
					idx = diff;
				for (var i = 0; i < len; i++) {
					if (keysSymbol[idx] === '"') {
						_html += "<span class='key-btn' key='\"'>\"</span>"
					} else {
						_html += '<span class="key-btn" key=\"'+ keysSymbol[idx] +'\">'+ keysSymbol[idx] +'</span>'
					}
					_html += idx === 27 ? '<span class="key-btn key-backspace" key="backspace"></span>' : '';
					idx++
				}
				_html += '</div>';
				return _html
			}
			var symbolKeyboard = '<div class="keyboard-main keyboard-letter" style="display:none" type="symbol">';
			symbolKeyboard += [_symbolHtml.call(this,10, 0), _symbolHtml.call(this,10, 10), _symbolHtml.call(this,8,20)].join('');
			symbolKeyboard += '<div class="keyboard-row">'
			symbolKeyboard += '<span class="key-btn key-number" key="number">123</span>'
			symbolKeyboard += '<span class="key-btn key-letter" key="letter">abc</span>'
			symbolKeyboard += '<span class="key-btn key-dot" key=".">.</span>'
			symbolKeyboard += '<span class="key-btn key-spacebar" key=" ">空格</span>'
			symbolKeyboard += '<span class="key-btn key-confirm" key="confirm">确定</span>'
			symbolKeyboard += '</div></div>'
			return symbolKeyboard
		},
		// 生成数字键盘
		_getNumberKeyboardHtml: function () {
			var _display = this.options.keyboardType !== 'number' ? 'style="display:none"' : '';
			var numberKeyboard = '<div class="keyboard-main keyboard-number" '+ _display +' type="number">',
				idx = 0;
			for (var i = 0; i < 3; i++) {
				numberKeyboard += '<div class="keyboard-row">'
				for (var j = 0; j < 3; j++) {
					numberKeyboard += '<span class="key-btn" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span>'
					idx++
				}
				numberKeyboard += '</div>'
			}
			var _keys = 'abc', _keysCode = 'letter';
			if (this.options.keyboardType === 'number') {
				_keys = this.options.decimal ? '.' : ''
				_keysCode = _keys
			}
			numberKeyboard += '<div class="keyboard-row"><span class="key-btn" key="'+ _keysCode +'">'+ _keys +'</span><span class="key-btn" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span><span class="key-btn key-backspace" key="backspace"></span></div></div>';
			return numberKeyboard;
		},
		// 生成支付宝风格数字键盘
		_getAlipayNumberKeyboardHtml: function () {
			var _display = this.options.keyboardType !== 'number' ? 'style="display:none"' : '';
			var numberKeyboard = '<div class="keyboard-main keyboard-number-alipay" '+ _display +' type="number">',
				idx = 0;
			numberKeyboard += '<div class="keyboard-col">';
			for (var i = 0; i < 3; i++) {
				numberKeyboard += '<div class="keyboard-row">';
				for (var j = 0; j < 3; j++) {
					numberKeyboard += '<span class="key-btn" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span>';
					idx++
				}
				numberKeyboard += '</div>';
			}
			numberKeyboard += '<div class="keyboard-row">';
			var _keys = 'abc', _keysCode = 'letter';
			if (this.options.keyboardType === 'number') {
				_keys = this.options.decimal ? '.' : ''
				_keysCode = _keys
			}
			if (_keys) numberKeyboard += '<span class="key-btn" key="'+ _keysCode +'">'+ _keys +'</span><span class="key-btn" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span>';
			if (!_keys) numberKeyboard += '<span class="key-btn" style="flex:2" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span>';
			numberKeyboard += '<span class="key-btn key-hide" key="hide"></span></div></div>';
			numberKeyboard += '<div class="keyboard-col">';
			numberKeyboard += '<div class="keyboard-row"><span class="key-btn key-backspace" key="backspace"></span></div>'
			numberKeyboard += '<div class="keyboard-row"><span class="key-btn key-confirm" key="confirm">确定</span></div></div>'
			return numberKeyboard
		},
		// 生成微信风格数字键盘
		_getWechatNumberKeyboardHtml: function () {
			var _display = this.options.keyboardType !== 'number' ? 'style="display:none"' : '';
			var numberKeyboard = '<div class="keyboard-main keyboard-number-wechat" '+ _display +' type="number">',
				idx = 0;
			numberKeyboard += '<div class="keyboard-col">';
			for (var i = 0; i < 3; i++) {
				numberKeyboard += '<div class="keyboard-row">';
				for (var j = 0; j < 3; j++) {
					numberKeyboard += '<span class="key-btn" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span>';
					idx++
				}
				numberKeyboard += '</div>';
			}
			numberKeyboard += '<div class="keyboard-row">';
			var _keys = 'abc', _keysCode = 'letter';
			if (this.options.keyboardType === 'number') {
				_keys = this.options.decimal ? '.' : ''
				_keysCode = _keys
			}
			numberKeyboard += '<span class="key-btn" style="flex:2.08" key="'+ this.keys.number[idx] +'">'+ this.keys.number[idx] +'</span>';
			if (_keys) numberKeyboard += '<span class="key-btn" key="'+ _keysCode +'">'+ _keys +'</span>';
			numberKeyboard += '</div></div><div class="keyboard-col">';
			numberKeyboard += '<div class="keyboard-row"><span class="key-btn key-backspace" key="backspace"></span></div>'
			numberKeyboard += '<div class="keyboard-row"><span class="key-btn key-confirm" key="confirm">确定</span></div></div>'
			return numberKeyboard
		},
		// 设置键盘样式
		_setKeyboardStyle: function (el, flag) {
			var _transition = 'all ' + KEYBOARD_UP_DELAY + 'ms',
				_transform = 'scale(' + this.scale + ') ';
			if (flag) {
				if (blurTimer) clearTimeout(blurTimer), blurTimer = null;
				utils.css(el, 'display', 'block')
				setTimeout(function () {
					_transform += 'translate3d(0, 0, 0)';
					utils.css(el, {
						webkitTransition: _transition,
						transition: _transition,
						webkitTransform: _transform,
						transform: _transform,
						opacity: 1
					})
				}, 20)
			} else {
				_transform += 'translate3d(0, 100%, 0)';
				utils.css(el, {
					webkitTransition: _transition, 
					transition: _transition,
					webkitTransform: _transform, 
					transform: _transform,
					opacity: 0
				})
				blurTimer = setTimeout(function () {
					utils.css(el, 'display', 'none')
				}, KEYBOARD_UP_DELAY)
			}
		},
		// 切换键盘
		_switchKeyboard: function (type, childEl) {
			var rootEl = this.$el.children;
			rootEl = rootEl.length > 1 ? rootEl[1].children : rootEl[0].children;
			var findElem = function (el, type) {
				var currentEl;
				for (var i = 0; i < el.length; i++) {
					utils.css(el[i], 'display', 'none')
					if (el[i].getAttribute('type') === type) {
						currentEl = el[i]
					}
				}
				return currentEl;
			}
			switch (type) {
				case 'letter':
					this.capslock = '0'
					utils.css(findElem(rootEl, 'lower'), 'display', '')
					break;
				case 'capslock':
					switch (this.capslock) {
						case '0':
							this.capslock = '1'
							utils.css(findElem(rootEl, 'upper'), 'display', '')
							break;
						case '1':
							this.capslock = '2'
							utils.addClass(childEl, 'uplock')
							break;
						case '2':
							this.capslock = '0'
							utils.removeClass(childEl, 'uplock')
							utils.css(findElem(rootEl, 'lower'), 'display', '')
							break;
						default:
					}
					break;
				case 'symbol':
				case 'number':
					utils.css(findElem(rootEl, type), 'display', '')
					break;
				default:
			}
		},
		// 绑定事件
		_bind: function () {
			var self = this,
				keyBtn = self.$el.querySelectorAll('.key-btn');
			// 键盘事件	
			for (var i = 0; i < keyBtn.length; i++) {
				keyBtn[i].addEventListener('touchstart', function (e) {
					e.preventDefault()
					self._presskeyStart.apply(self, [e, this])
					self._keyActive(this, true)
				}, false)
				keyBtn[i].addEventListener('touchend', function(e) {
					e.preventDefault()
					self._presskeyHandler.apply(self, [e, this])
					self._keyActive(this, false)
				}, false)
			}
			// 输入框事件
			self.inputElem = _doc.getElementById(self.keyboardInput);
			self.textWrap = self.inputElem.querySelector('.keyboard-input');
			self.cursorWrap = self.inputElem.querySelector('.keyboard-cursor');
			self.hideInput = self.inputElem.querySelector('input');
			self.placeholderWrap = self.inputElem.querySelector('.keyboard-placeholder');
			self.inputElem.addEventListener('touchstart', function (e) {
				e.preventDefault()
				self.focus()
			}, false)
		},
		// 按键按下处理
		_presskeyStart: function(event, el) {
            var self = this;
            // 如果是删除键，触发长按连续删除功能
            if (utils.hasClass(el, 'key-backspace')) {
                self.deleteDelay = setTimeout(function() {
                    self.deleteTimer = setInterval(function() {
                    	!self.value && clearInterval(self.deleteTimer)
                        self.value = self.value.substring(0, self.value.length - 1);
                        self._setInputVlue()
                    }, 70);
                }, 500);
            }
        },
		// 按键抬起处理
		_presskeyHandler: function (event, el) {
			var keyCode = el.getAttribute('key');
			if (!keyCode) return;
			switch (keyCode) {
				// 隐藏键盘
				case 'hide':
					this.blur()
					break;
				// 完成、确定
				case 'done':
				case 'confirm':
					this.options.complete({value: this.getValue(), mask: this.getMask()})
					this.blur()
					break;
				// 删除、退格
				case 'backspace':
					// 如果没有触发连续删除
                    if (!this.deleteTimer) {
                        this.value = this.value.substring(0, this.value.length - 1);
                    }
                    clearTimeout(this.deleteDelay);
                    clearInterval(this.deleteTimer);
                    this.deleteDelay = this.deleteTimer = null;
					break;
				// 切换字母键盘
				case 'letter':
				// 切换大小写
				case 'capslock':
				// 切换符号键盘
				case 'symbol':
				// 切换数字键盘
				case 'number':
					this._switchKeyboard(keyCode, el)
					break;
				default:
					if (this.value.length < this.options.maxlength) this.value += keyCode
					// 如果大写未被锁定将切换小写
					if (this.capslock === '1' && /[A-Z.]/.test(keyCode)) this._switchKeyboard('letter', el)
			}
			this.options.keypress(keyCode)
			this._setInputVlue()
			if (this.value && utils.css(this.placeholderWrap, 'display') == 'block') {
				utils.css(this.placeholderWrap, 'display', 'none')
			} else if (!this.value && utils.css(this.placeholderWrap, 'display') == 'none') {
				utils.css(this.placeholderWrap, 'display', 'block')
			}
		},
		_keyActive: function (el, flag) {
			var _code = el.getAttribute('key');

			if (/^[qQ\[\~\+]$/.test(_code)) {
				flag ? utils.addClass(el, 'key-active-left') : utils.removeClass(el, 'key-active-left')
			}

			else if (/^[pP\|\-]$/.test(_code)) {
				flag ? utils.addClass(el, 'key-active-right') : utils.removeClass(el, 'key-active-right')
			}

			else if (/^[a-zA-Z]$/.test(_code) || (this.options.keyboardType === 'standard' && _code == '.')) {
				flag ? utils.addClass(el, 'key-active') : utils.removeClass(el, 'key-active')
			}

			else if (/^[\]\{\}\<\>\(\)\\\|\~\!\@\#\$\%\^\&\*\-\+\=\:\;\"\'\/\?]$/.test(_code)) {
				flag ? utils.addClass(el, 'key-active') : utils.removeClass(el, 'key-active')
			}
			else {
				flag ? utils.addClass(el, 'active') : utils.removeClass(el, 'active')
			}
		},
		_setInputVlue: function () {
			if (this.options.keyboardType === 'number' && this.options.thousand) {
				this.textWrap.innerHTML = utils.thousand(this.getValue())
			} else {
				this.textWrap.innerHTML = this.options.mask ? this.getMask() : this.getValue()
			}
			this.hideInput.value = this.getValue()
		},
		// 获取焦点
		focus: function () {
			var self = this;
			utils.addClass(self.inputElem, 'focus')
			var _handler = function (e) {
				var _el = utils.parents(e.srcElement, '#' + self.keyboardId)[0] || utils.parents(e.srcElement, '#' + self.keyboardInput)[0],
					_id = e.srcElement.id || (_el && _el.id);
				if (!_id || (_id !== self.keyboardId && _id !== self.keyboardInput)) {
					self.blur()
					_doc.body.removeEventListener('touchend', _handler, false)
				}
			}
			setTimeout(function () {
				_doc.body.addEventListener('touchend', _handler, false)
			}, 20)
			self._setKeyboardStyle(self.$el, true)
		},
		// 失去焦点
		blur: function () {
			utils.removeClass(this.inputElem, 'focus')
			this._setKeyboardStyle(this.$el, false)
		},
		// 获取输入值
		getValue: function () {
			return this.value
		},
		// 获取掩码值
		getMask: function () {
			return this.value.replace(/./ig, "•")
		},
		// 设置值
		setValue: function (value) {
			this.value = value
			this._setInputVlue()
			return this.value
		},
		// 清空值
		clear: function () {
			this.value = ''
			this._setInputVlue()
		}
	}
	win.Keyboard = Keyboard;
})(window);