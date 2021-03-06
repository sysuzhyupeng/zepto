(function($){
	/*
		event主要做了这几件事：
		统一不同浏览器的 event 对象
		事件缓存池，方便手动触发事件和解绑事件（因此手动触发事件是同步的操作）。
		事件委托
	*/
	//这个方法用来标记已经绑定过事件的元素，方便查找。
	var _zid = 1;
	function zid(element){
		/*
			这里的element为与原生对象，这里在上面加了一个_zid的属性，这个属性会跟随其由始至终，不会丢失，
			如果是zepto封装的dom对象的话，就很容易丢失，因为每次根据$()创建的dom都是新的
		*/
		return element._zid || (element._zid = _zid++)
	}
	/*
		parse 函数用来分解事件名和命名空间
	*/
	function parse(event){

		var parts = ('' + event).split('.')
		/*
			'click.ui.button'
			返回的对象中，e 为事件名，ns的value为排序后，以空格相连的命名空间字符串，形如ui button... 的形式。
		*/
  		return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
	}
	function matcherFor(ns) {
		//生成匹配命名空间的表达式
		//最终生成的正则为 /(?:^| )ui.* ?button.* ?(?: |$)/
 		return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
	}
	function remove(element, events, fn, selector, capture){
	    var id = zid(element)
	   ;(events || '').split(/\s/).forEach(function(event){
	        findHandlers(element, event, fn, selector).forEach(function(handler){
	        	//删除handlers该id下的缓存
	        	delete handlers[id][handler.i]
	            if ('removeEventListener' in element)
	           	//元素removeEventListener，必须是原来相同的事件代理函数才能remove
	        	element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
	        })
	  })
	}
	/*
		handler事件对象如下，以数组形式存储在handlers的元素id下
		{
		  fn: '', // 回调函数
		  e: '', // 事件名
		  ns: '', // 命名空间
		  sel: '',  // 选择器
		  i: '', // 函数索引
		  del: '', // 委托函数
		  proxy: '', // 代理函数, 绑定时若是使用的是匿名函数的话，其引用会丢失
		}
	*/
	/*
		外部闭包环境handlers对象，每一个id对应的为一个数组，这个与绑定先后顺序相关
		每个元素对应一个id，id下的数组记录绑定的事件
	*/
	var handlers = {}
	function findHandlers(element, event, fn, selector) {
		/*
			分隔出 event 参数的事件名和命名空间
		*/
	  	event = parse(event)
	  	//如果命名空间存在
	  	if (event.ns) var matcher = matcherFor(event.ns)
	  	//从id获取元素，然后获取该元素的事件对象数组
	    //返回handler事件对象
	  	return (handlers[zid(element)] || []).filter(function(handler) {
		    return handler
		      && (!event.e  || handler.e == event.e)
		      //通过matcher正则是检测handler的ns
		      && (!event.ns || matcher.test(handler.ns))
		      && (!fn       || zid(handler.fn) === zid(fn))
		      && (!selector || handler.sel == selector)
		})
		/*
			返回的句柄必须满足5个条件：
				句柄必须存在
				如果 event.e 存在，则句柄的事件名必须与 event 的事件名一致
				如果命名空间存在，则句柄的命名空间必须要与事件的命名空间匹配（ matcherFor 的作用 ）
				如果指定匹配的事件句柄为 fn ，则当前句柄 handler 的 _zid 必须与指定的句柄 fn 相一致
				如果指定选择器 selector ，则当前句柄中的选择器必须与指定的选择器一致
			否则返回空数组
		*/
	}
	/*
		支持focusin属性只需要检查window对象上是否存在onfocusin属性，
		这是一个全局变量
	*/
	var focusinSupported = 'onfocusin' in window,
		//做一个转换配置
		focus = { focus: 'focusin', blur: 'focusout' },
		hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' };
	function realEvent(type) {
		/*
			将 focus/blur 转换成 focusin/focusout ，
			将 mouseenter/mouseleave 转换成 mouseover/mouseout 事件。
		*/
		/*
			focus 事件和 blur 事件并不支持事件冒泡
			但是focusin支持事件冒泡
			mouseenter 和 mouseleave 也不支持事件的冒泡，
			但是 mouseover 和 mouseout 支持事件冒泡，
			因此，这两个事件的冒泡处理也可以分别用 mouseover 和 mouseout 来模拟。
		*/
	    return hover[type] || (focusinSupported && focus[type]) || type
	}
	var returnTrue = function(){return true},
		returnFalse = function(){return false},
		eventMethods = {
		  	preventDefault: 'isDefaultPrevented',
		  	stopImmediatePropagation: 'isImmediatePropagationStopped',
		  	stopPropagation: 'isPropagationStopped'
		};
	function compatible(event, source) {
		//isDefaultPrevented() 方法返回指定的 event 对象上是否调用了 preventDefault() 方法
		/*
			compatible 函数用来修正 event 对象的浏览器差异，
			向 event 对象中添加了 
			isDefaultPrevented、isImmediatePropagationStopped、isPropagationStopped 几个方法，
			对不支持 timeStamp 的浏览器，向 event 对象中添加 timeStamp 属性
			使返回的event对象具有一致性
		*/
		/*
			调用时可以使用
			compatible(proxy, event)
			或者
			compatible(e)修正原生事件对象
		*/
		//如果传入source或者event连isDefaultPrevented都没有
		if (source || !event.isDefaultPrevented) {
			//如果 source 不存在，则将 event 赋值给 source
		    source || (source = event)
		    //遍历上面的配置
		    $.each(eventMethods, function(name, predicate) {
		      	var sourceMethod = source[name]
		      	event[name] = function(){
		        	this[predicate] = returnTrue
		        	return sourceMethod && sourceMethod.apply(source, arguments)
		      	}
		      	//直接将isDefaultPrevented等初始化为 returnFalse 方法
		      	event[predicate] = returnFalse
		    })

		    try {
		        event.timeStamp || (event.timeStamp = Date.now())
		    } catch (ignored) { }
		   	/*
		   		event.preventDefault()方法是用于取消事件的默认行为，
		   		但此方法并不被ie支持，在ie下需要用window.event.returnValue = false;
		   	*/
		    if (source.defaultPrevented !== undefined ? source.defaultPrevented :
		        'returnValue' in source ? source.returnValue === false :
		        source.getPreventDefault && source.getPreventDefault())
		      event.isDefaultPrevented = returnTrue
		}
	  	return event
	}
	var ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$|webkitMovement[XY]$)/;
	/*
		创建代理对象
		事件触发的时候，zepto返回的 event 都不是原生的 event 对象，
		都是代理对象，这个就是代理对象的创建方法
		ignoreProperties 用来排除 A-Z 开头，即所有大写字母开头的属性，
		还有以returnValue 结尾，layerX/layerY ，webkitMovementX/webkitMovementY 结尾的非标准属性
	*/
	function createProxy(event) {
		//在proxy对象的originalEvent中存储event
	  	var key, 
	  		proxy = { originalEvent: event }
	  	//代理对象的originalEvent保存原始event的引用
	  	//将非大写属性拷贝，排除掉不需要的属性和值为 undefined 的属性
	  	for (key in event)
	  		//然后进行拷贝
	    	if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]
	    return compatible(proxy, event)
	}
	/*
		返回 true 表示在捕获阶段执行事件句柄，否则在冒泡阶段执行。

		如果存在事件代理，并且事件为 focus/blur 事件，
		在浏览器不支持 focusin/focusout 事件时，设置为 true ，
		在捕获阶段处理事件，间接达到冒泡的目的
	*/
	function eventCapture(handler, captureSetting) {
		//返回使用冒泡还是捕获，捕获返回true
	  	return handler.del &&
		    (!focusinSupported && (handler.e in focus)) ||
		    !!captureSetting
	}
	/*
		element // 事件绑定的dom元素
		events // 需要绑定的事件列表
		fn // 事件执行时的句柄
		data // 事件执行时，传递给事件对象的数据
		selector // 事件绑定元素的选择器
		delegator // 事件委托函数 
		capture // 那个阶段执行事件句柄
		add 方法是向元素添加事件及事件响应，参数比较多
	*/
	function add(element, events, fn, data, selector, delegator, capture){
		//获取或设置 id之后，set为事件句柄容器
		var id = zid(element),
			//handlers为全局对象
			set = (handlers[id] || (handlers[id] = []))
		//以空格隔开
		events.split(/\s/).forEach(function(event){
			//如果是ready的话，直接绑定$(document)
		    if (event == 'ready') return $(document).ready(fn)
		    //分解命名空间，返回一个对象
			/*
				{e: parts[0], ns: parts.slice(1).sort().join(' ')}
			*/
		    var handler   = parse(event)
			//将参数赋给handeler对象，缓存起来
		    handler.fn    = fn
		    handler.sel   = selector
		    //hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' };
		    //对于hover事件的模拟
		    if (handler.e in hover) fn = function(e){
		        var related = e.relatedTarget
		        if (!related || (related !== this && !$.contains(this, related)))
		            return handler.fn.apply(this, arguments)
		        }
		    //del为delegator
		    handler.del   = delegator
		    //如果有事件委托函数，先使用事件委托函数
		    var callback  = delegator || fn
		    handler.proxy = function(e){
		    	//e 为事件执行时的原生 event 对象，拿到统一接口的event对象。
		    	// 返回的event对象为拷贝
		        e = compatible(e)
		        if (e.isImmediatePropagationStopped()) return
		        //再扩展 e 对象，将 data 存到 e 的 data 属性上
		        e.data = data
		        //事件代理通过闭包拿到事件处理函数，和一起传递的参数
		        var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
		        //如果返回了false，自动阻止传递
		        if (result === false) e.preventDefault(), e.stopPropagation()
		        return result
		    }
		    /*
		    	i属性用来存储hander在handles[id]的数组中的索引
		    	handler = {
					i: number,
					fn: fn,
					sel: selector,
					proxy: proxyFn
		    	}
		    */
		    handler.i = set.length
		    //将挂载信息的handler对象push进handles数组中
		    set.push(handler)
		    if ('addEventListener' in element)
		    	//realEvent修改hover事件等
		    	/*
		    		target.addEventListener(type, listener[, useCapture]);
		    		listener 必须是一个实现了 EventListener 接口的对象，或者是一个事件处理函数
					capture:  Boolean，表示 listener 会在该类型的事件捕获或者冒泡阶段传播到该 EventTarget 时触发。
		    	*/
		    	//element.addEventListener('click', 事件代理， 事件处理函数);
		    	//这里直接调用了事件代理函数，把event对象作为参数传入事件代理
		        element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
		})
	}
	var specialEvents={},
	specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

	/*
		创建并初始化一个指定的dom事件对象, 如果给定了props，则将其扩展到事件对象上,
		返回一个经过初始化了的事件对象

		document.createEvent()
		event.initEvent()
		element.dispatchEvent()
	*/
	$.Event = function(type, props) {
	    if (!isString(type)) props = type, type = props.type
	    /*
	    	createEvent(eventType)该方法将创建一种新的事件类型，该类型由参数eventType指定
	    	event.initEvent(type, bubbles, cancelable)初始化事件，
	    	bubbles是一个 Boolean 值，决定是否事件是否应该向上冒泡. 一旦设置了这个值，只读属性Event.bubbles也会获取相应的值. 
	    	cancelable是一个 Boolean 值，决定该事件的默认动作是否可以被取消. 一旦设置了这个值, 只读属性 Event.cancelable 也会获取相应的值.
		*/
	    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
		//for in循环拷贝传入的props对象属性到event上
	    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
	    event.initEvent(type, bubbles, true)
	    return compatible(event)
	}
	//返回的是一个代理后改变执行上下文的函数。
	$.proxy = function(fn, context) {
		//如果提供超过3个参数，则去除前两个参数，将后面的参数作为执行函数 fn 的参数
		//2 in argenments相当于arguments.length >= 2
	    var args = (2 in arguments) && slice.call(arguments, 2)
	    if (isFunction(fn)) {
	        var proxyFn = function(){ return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments) }
	        proxyFn._zid = zid(fn)
	        return proxyFn
	    } else if (isString(context)) {
		    if (args) {
		        args.unshift(fn[context], fn)
		        return $.proxy.apply(null, args)
		    } else {
		        return $.proxy(fn[context], fn)
		    }
	    } else {
	        throw new TypeError("expected function")
	    }
	}
	/*
		$('xx').on('click', 'li', {}, function(){ 
			console.log('clicked');
		})
	*/
	//on 方法来用给元素绑定事件，最终调用的是add方法
	/*
		on(type, [selector], function(e){ ... })   
		on(type, [selector], [data], function(e){ ... })   
		on(type, [selector], [data], function(e){ ... }, true) 
		on({ type: handler, type2: handler2, ... }, [selector])   
		on({ type: handler, type2: handler2, ... }, [selector], [data])   
	*/
	$.fn.on = function(event, selector, data, callback, one){
	    var autoRemove, delegator, $this = this
	    if (event && !isString(event)) {
	    	//当event不是字符串的时候，假设event是一个数组或对象
		    $.each(event, function(type, fn){
		      	$this.on(type, selector, data, fn, one)
		    })
		    return $this
	    }
	    if (!isString(selector) && !isFunction(callback) && callback !== false)
	    	//当selector不是字符串，假设为seletor没有传递，把selector改成undefined
	        callback = data, data = selector, selector = undefined
	        if (callback === undefined || data === false)
	            callback = data, data = undefined

	      		if (callback === false) callback = returnFalse   

	        return $this.each(function(_, element){
		      	/*
		      		autoRemove 表示在执行完事件响应后，自动解绑的函数
		      		autoRemove主要调用remove方法去除事件绑定，并且通过闭包拿到callback回调
		      	*/
		        if (one) autoRemove = function(e){
		            remove(element, e.type, callback)
		            return callback.apply(this, arguments)
		        }
		        /*
		        	如果传递了selector，说明要使用事件委托，事件委托函数
		        */
		        if (selector) delegator = function(e){
		        	//closest从事件的目标元素 e.target 开始向上查找，返回第一个满足selector和element的元素
		            var evt, match = $(e.target).closest(selector, element).get(0)
		            //如果找到匹配的委托元素
		            if (match && match !== element){
		          	/*
		          		调用 createProxy 方法，为当前事件对象创建代理对象，
		          		再调用 $.extend 方法，为代理对象扩展 currentTarget 和 liveFired 属性，将代理元素和触发事件的元素保存到事件对象中
		          		最后执行句柄函数，以代理元素 match 作为句柄的上下文，用代理后的 event 对象 evt 替换掉原句柄函数的第一个参数
		          	*/
		            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
		            	return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
		            }
		        }
		        add(element, event, callback, data, selector, delegator || autoRemove)
	        })
	}
	$.fn.off = function(event, selector, callback){
	    var $this = this
	    //修正参数
	    if (event && !isString(event)) {
		    $.each(event, function(type, fn){
		    	//修正之后重新调用
		        $this.off(type, selector, fn)
		    })
		    return $this
	    }

	    if (!isString(selector) && !isFunction(callback) && callback !== false)
	    	callback = selector, selector = undefined
	    	//也可以给callback传入布尔值
	    	if (callback === false) callback = returnFalse

	    	return $this.each(function(){
	      		remove(this, event, callback, selector)
	    	})
	}
	$.fn.bind = function(event, data, callback){
		return this.on(event, data, callback)
	}
	$.fn.unbind = function(event, callback){
  		return this.off(event, callback)
	}
	$.fn.one = function(event, selector, data, callback){
		//在on方法的最后一个参数传入一个非false值
		return this.on(event, selector, data, callback, 1)
	}
	//事件委托，也是调用 on 方法，只是 selector 一定要传递。
	$.fn.delegate = function(selector, event, callback){
  		return this.on(event, selector, callback)
	}
	$.fn.undelegate = function(selector, event, callback){
  		return this.off(event, selector, callback)
	}
	$.fn.live = function(event, callback){
		//live获取当前的zepto对象进行事件绑定
  		$(document.body).delegate(this.selector, event, callback)
  		return this
	}
	$.fn.die = function(event, callback){
  		$(document.body).undelegate(this.selector, event, callback)
  		return this
	}
	//直接触发事件回调函数
	/*
		这里模拟了一个事件，
		并改变事件的target
		然后直接获取handler上的事件代理，以模拟事件为参数触发
	*/
	$.fn.triggerHandler = function(event, args){
	    var e, result
	    this.each(function(i, element){
	    	//如果 event 为字符串时，则调用 $.Event 工具函数来初始化一个事件对象，再调用 createProxy 来创建一个 event 代理对象。
	        e = createProxy(isString(event) ? $.Event(event) : event)
	    	e._args = args
	    	e.target = element
	    	$.each(findHandlers(element, event.type || event), function(i, handler){
	      		result = handler.proxy(e)
	      		if (e.isImmediatePropagationStopped()) return false
	        })
	    })
	    return result
	}
	/*
	    如果dispatchEvent存在，则直接dispatchEvent
	    dispatchEvent是一个同步过程，不是异步过程
	*/
	$.fn.trigger = function(event, args){
	    event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
	    event._args = args
	    return this.each(function(){
	       //如果是 focus/blur 方法，则直接调用 this.focus() 或 this.blur() 方法
	       if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
	       //
	       else if ('dispatchEvent' in this) this.dispatchEvent(event)
	       else $(this).triggerHandler(event, args)
	    })
	}
	//传入 Zepto 对象
})(Zepto)