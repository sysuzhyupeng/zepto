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
			compatible 函数用来修正 event 对象的浏览器差异，
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
		var id = zid(element), set = (handlers[id] || (handlers[id] = []))
		events.split(/\s/).forEach(function(event){
		    if (event == 'ready') return $(document).ready(fn)
		    var handler   = parse(event)
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
		        e = compatible(e)
		        if (e.isImmediatePropagationStopped()) return
		        e.data = data
		        var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
		        if (result === false) e.preventDefault(), e.stopPropagation()
		        return result
		    }
		    handler.i = set.length
		    set.push(handler)
		    if ('addEventListener' in element)
		      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
		})
	}
})(Zepto)