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
})(Zepto)