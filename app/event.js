(function($){
	/*
		跟 focus 和 blur 一样，mouseenter 和 mouseleave 也不支持事件的冒泡，
		但是 mouseover 和 mouseout 支持事件冒泡，因此，这两个事件的冒泡处理也可以分别用 mouseover 和 mouseout 来模拟。
	*/
	var _zid = 1;
	function zid(element){
		return element._zid || (element._zid = _zid++)
	}
	/*
		parse 函数用来分解事件名和命名空间
	*/
	function parse(event){

		var parts = ('' + event).split('.')
		/*
			ns1 ns2 ns3 
		*/
  		return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
	}
	function remove(element, events, fn, selector, capture){
	    var id = zid(element)
	   ;(events || '').split(/\s/).forEach(function(event){
	        findHandlers(element, event, fn, selector).forEach(function(handler){
	        	//删除handlers对象上的属性
	        	delete handlers[id][handler.i]
	            if ('removeEventListener' in element)
	           	//元素removeEventListener
	        	element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
	        })
	  })
	}
	function matcherFor(ns) {
		//最终生成的正则为 /(?:^| )ns1.* ?ns2.* ?ns3(?: |$)/
 		return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
	}
	/*
		{
		  fn: '', // 函数
		  e: '', // 事件名
		  ns: '', // 命名空间
		  sel: '',  // 选择器
		  i: '', // 函数索引
		  del: '', // 委托函数
		  proxy: '', // 代理函数
		}
	*/
	var handlers = {}
	function findHandlers(element, event, fn, selector) {
		/*
			分隔出 event 参数的事件名和命名空间
		*/
	  	event = parse(event)
	  	//如果命名空间存在
	  	if (event.ns) var matcher = matcherFor(event.ns)
	  		//返回的其实是 handlers[zid(element)] 中符合条件的句柄函数
		  	return (handlers[zid(element)] || []).filter(function(handler) {
			    return handler
			      && (!event.e  || handler.e == event.e)
			      && (!event.ns || matcher.test(handler.ns))
			      && (!fn       || zid(handler.fn) === zid(fn))
			      && (!selector || handler.sel == selector)
			})
	}
	/*
		支持focusin属性只需要检查window对象上是否存在onfocusin属性
	*/
	var focusinSupported = 'onfocusin' in window,
		focus = { focus: 'focusin', blur: 'focusout' },
		hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' };
	function realEvent(type) {
		/*
			由于 focusin/focusout 事件浏览器支持程度还不是很好，
			因此要对浏览器支持做一个检测，如果浏览器支持，则返回，否则，返回原事件名
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
		/*
			compatible 函数用来修正 event 对象的浏览器差异，使返回的event对象具有一致性
			向 event 对象中添加了 isDefaultPrevented、isImmediatePropagationStopped、isPropagationStopped 几个方法，
			对不支持 timeStamp 的浏览器，向 event 对象中添加 timeStamp 属性
		*/
		if (source || !event.isDefaultPrevented) {
		    source || (source = event)

		    $.each(eventMethods, function(name, predicate) {
		      	var sourceMethod = source[name]
		      	event[name] = function(){
		        	this[predicate] = returnTrue
		        	return sourceMethod && sourceMethod.apply(source, arguments)
		      	}
		      	event[predicate] = returnFalse
		    })

		    try {
		      event.timeStamp || (event.timeStamp = Date.now())
		    } catch (ignored) { }

		    if (source.defaultPrevented !== undefined ? source.defaultPrevented :
		        'returnValue' in source ? source.returnValue === false :
		        source.getPreventDefault && source.getPreventDefault())
		      event.isDefaultPrevented = returnTrue
		}
	  	return event
	}
	var ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$|webkitMovement[XY]$)/;
	/*
		事件触发的时候，返回给我们的 event 都不是原生的 event 对象，
		都是代理对象，这个就是代理对象的创建方法
		ignoreProperties 用来排除 A-Z 开头，即所有大写字母开头的属性，
		还有以returnValue 结尾，layerX/layerY ，webkitMovementX/webkitMovementY 结尾的非标准属性
	*/
	function createProxy(event) {
		//在proxy对象的originalEvent中存储event
	  	var key, proxy = { originalEvent: event }
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
	  	return handler.del &&
		    (!focusinSupported && (handler.e in focus)) ||
		    !!captureSetting
	}
	/*
		element // 事件绑定的元素
		events // 需要绑定的事件列表
		fn // 事件执行时的句柄
		data // 事件执行时，传递给事件对象的数据
		selector // 事件绑定元素的选择器
		delegator // 事件委托函数 
		capture // 那个阶段执行事件句柄
		add 方法是向元素添加事件及事件响应，参数比较多
	*/
	function add(element, events, fn, data, selector, delegator, capture){
		//获取或设置 id之后，set 为事件句柄容器
		var id = zid(element),
			 set = (handlers[id] || (handlers[id] = []))
		events.split(/\s/).forEach(function(event){
		    if (event == 'ready') return $(document).ready(fn)
		    var handler   = parse(event)
			//将参数赋给handeler对象，缓存起来
		    handler.fn    = fn
		    handler.sel   = selector
		    // emulate mouseenter, mouseleave
		    if (handler.e in hover) fn = function(e){
		        var related = e.relatedTarget
		        if (!related || (related !== this && !$.contains(this, related)))
		            return handler.fn.apply(this, arguments)
		        }
		    handler.del   = delegator
		    var callback  = delegator || fn
		    handler.proxy = function(e){
		    	//e 为事件执行时的原生 event 对象，拿到统一接口的event对象。
		        e = compatible(e)
		        if (e.isImmediatePropagationStopped()) return
		        //再扩展 e 对象，将 data 存到 e 的 data 属性上
		        e.data = data
		        var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
		        if (result === false) e.preventDefault(), e.stopPropagation()
		        return result
		    }
		    handler.i = set.length
		    //将handler push进handles数组中
		    set.push(handler)
		    if ('addEventListener' in element)
		      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
		})
	}
	var specialEvents={},
	specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

	/*
		创建并初始化一个指定的dom事件对象, 如果给定了props，则将其扩展到事件对象上,
		返回一个经过初始化了的事件对象
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
		//如果提供超过3个参数，则去除前两个参数，将后面的参数作为执行函数 fn 的参
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
	//on 方法来用给元素绑定事件，最终调用的是add方法
	$.fn.on = function(event, selector, data, callback, one){
	    var autoRemove, delegator, $this = this
	    //修正参数
	    if (event && !isString(event)) {
		    $.each(event, function(type, fn){
		      	$this.on(type, selector, data, fn, one)
		    })
		    return $this
	    }
	    if (!isString(selector) && !isFunction(callback) && callback !== false)
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
		        	事件委托函数
		        */
		        if (selector) delegator = function(e){
		        	//closest从事件的目标元素 e.target 开始向上查找，返回第一个匹配 selector 的元素
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
	$.fn.trigger = function(event, args){
	    event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
	    event._args = args
	    return this.each(function(){
	       //如果是 focus/blur 方法，则直接调用 this.focus() 或 this.blur() 方法
	       if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
	       // items in the collection might not be DOM elements
	       else if ('dispatchEvent' in this) this.dispatchEvent(event)
	       else $(this).triggerHandler(event, args)
	    })
	}
})(Zepto)