var Zepto = (function () {
  	var zepto = {}, $;
  	/*
  		class2type = {
		  "[object Boolean]": "boolean",
		  "[object Number]": "number"
		  ...
		} 
  	*/
  	var lass2type = {},
    toString = class2type.toString;
    //在qsa查找中使用
    var simpleSelectorRE = /^[\w-]*$/,
    	fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    	tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig;
  	/*
  		定义这个空数组是为了取得数组的 concat、filter、slice 方法
  	*/
  	var emptyArray = [],
		concat = emptyArray.concat,
	    filter = emptyArray.filter,
	    slice = emptyArray.slice;
	/*
		当传入元素为tr时，需要被tbody包裹
	*/
	var table = document.createElement('table'),
        tableRow = document.createElement('tr'),
		containers = {
		  'tr': document.createElement('tbody'),
		  'tbody': table,
		  'thead': table,
		  'tfoot': table,
		  'td': tableRow,
		  'th': tableRow,
		  '*': document.createElement('div')
		};
	function compact(array) {
		/*
			删除数组中的 null 和 undefined
			null 各 undefined 都会先转换成 false 再进行比较。
		*/
	  	return filter.call(array, function(item) {
	  	  	return item != null
	  	})
	}
	function flatten(array) {
		/*
			数组扁平化，例如将数组 [1,[2,3],[4,5],6,[7,[89]] 
			变成 [1,2,3,4,5,6,7,[8,9]],
			只拍平一层
		*/
  		return array.length > 0 ? $.fn.concat.apply([], array) : array
	}
	var uniq = function(array) {
		/*
			数组去重的原理是检测 item 在数组中第一次出现的位置是否和 item 所处的位置相等，
			如果不相等，则证明不是第一次出现，将其过滤掉。
		*/
	  	return filter.call(array, function(item, idx) {
	    	return array.indexOf(item) == idx
	  	})
	}
	var camelize = function(str) {
		/*
			将 word-word 的形式的字符串转换成 wordWord 的形式， - 可以为一个或多个。
			正则表达式匹配了一个或多个 - ，（.）捕获组是捕获 - 号后的第一个字母，并将字母变成大写。
		*/
	  	return str.replace(/-+(.)?/g, function(match, chr) {
	    	return chr ? chr.toUpperCase() : ''
		})
	}
		/*
		第一个正则表达式是将字符串中的 :: 替换成 / 。a 变成 A6DExample/Before
		第二个正则是在出现一次或多次大写字母和出现一次大写字母和连续一次或多次小写字母之间加入 _。a 变成 A6D_Example/Before
		第三个正则是将出现一次小写字母或数字和出现一次大写字母之间加上 _。a 变成A6_D_Example/Before
		第四个正则表达式是将 _ 替换成 -。a 变成A6-D-Example/Before
		最后是将所有的大写字母转换成小写字母。a 变成 a6-d-example/before
	*/
	function dasherize(str) {
    	return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  	}
  	//判断传入obj的类型
  	function type(obj) {
  		/*
  			如果 obj == null ，也就是 null 和 undefined，返回的是字符串 null 或 undefined
			Object.prototype.toString （toString = class2type.toString）方法，将返回的结果作为 class2type 的 key 取值。
			Object.prototype.toString 对不同的数据类型会返回形如 [object Boolean] 的结果
  		*/
	  	return obj == null ? String(obj) :
	  	class2type[toString.call(obj)] || "object"
	}
	/*
		调用type函数，直接获得返回值(不用纠结instanceof和typeof)
	*/
	function isFunction(value) {
	    return type(value) === 'function'
	}
	function isObject(obj) {
	    return type(obj) == 'object'
	}
	//如果isArray方法存在，则使用isArray
	var isArray = Array.isArray || 
  		 function(object) { return object instanceof Array}
	/*
		判断是否为浏览器的 window 对象,
		要为 window 对象首先要满足的条件是不能为 null 或者 undefined，并且obj.window 为自身的引用。
	*/
	function likeArray(obj) {
		/*
			由于对null与undefined用!操作符时都会产生true的结果
			所以!!obj用来判断变量是否存在
		*/
	 	var length = !!obj &&
		      			'length' in obj && // obj 中必须存在 length 属性
		      			obj.length, // 返回 length的值
		      type = $.type(obj);

		    return 'function' != type &&  // 不为function类型
		    	!isWindow(obj) &&  // 并且不为window类型
		    	(
		    		'array' == type || length === 0 || // 如果为 array 类型或者length 的值为 0，返回true
		    (typeof length == 'number' && length > 0 && (length - 1) in obj)  // 或者 length 为数字，并且 length的值大于零，并且 length - 1 为 obj 的 key
		  )
		}
	function isWindow(obj) {
  		return obj != null && obj == obj.window
	}
	/*
		判断是否为 document 对象
		节点上有 nodeType 属性，每个属性值都有对应的常量。document 的 nodeType 值为 9 ，常量为 DOCUMENT_NODE。
	*/
	function isDocument(obj) {
  		return obj != null && obj.nodeType == obj.DOCUMENT_NODE
	}
	/*
		判断是否为纯粹的对象
		纯粹对象首先必须是对象 isObject(obj)
		并且不是 window 对象 !isWindow(obj)
		并且原型要和 Object 的原型相等
	*/
	function isPlainObject(obj) {
  		return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
	}
	/*
		当 deep 为 true 时为深度复制， false 时为浅复制。
	*/
	function extend(target, source, deep) {
        for (key in source)  // 遍历源对象的属性值
            if (deep && (isPlainObject(source[key]) || isArray(source[key]))) { // 如果为深度复制，并且源对象的属性值为纯粹对象或者数组
                if (isPlainObject(source[key]) && !isPlainObject(target[key])) // 如果为纯粹对象
                    target[key] = {}  // 如果源对象的属性值为纯粹对象，并且目标对象对应的属性值不为纯粹对象，则将目标对象对应的属性值置为空对象
                if (isArray(source[key]) && !isArray(target[key])) // 如果源对象的属性值为数组，并且目标对象对应的属性值不为数组，则将目标对象对应的属性值置为空数组
                    target[key] = []
                extend(target[key], source[key], deep) // 递归调用extend函数
            } else if (source[key] !== undefined) target[key] = source[key]  // 不对undefined值进行复制
    }
    /*
    	判断第一个参数 target 是否为布尔值，如果为布尔值，表示第一个参数为 deep ，
    	那么第二个才为目标对象，因此需要重新为 target 赋值为 args.shift() 。
    */
    $.extend = function(target) {
        var deep, args = slice.call(arguments, 1)
        if (typeof target == 'boolean') {
            deep = target
            target = args.shift()
        }
        args.forEach(function(arg) { extend(target, arg, deep) })
        return target
    }
    $.each = function(elements, callback) {
        var i, key
        if (likeArray(elements)) {  
        	//类数组包含数组和类数组对象，直接用for循环用数字索引遍历
            for (i = 0; i < elements.length; i++)
                if (callback.call(elements[i], i, elements[i]) === false) return elements
        } else { // 对象使用for in 循环
            for (key in elements)
                if (callback.call(elements[key], key, elements[key]) === false) return elements
        }
        return elements
    }
    $.map = function(elements, callback) {
        var value, values = [],
            i, key
        if (likeArray(elements))
            for (i = 0; i < elements.length; i++) {
                value = callback(elements[i], i)
                if (value != null) values.push(value)
            }
        else
            for (key in elements) {
                value = callback(elements[key], key)
                if (value != null) values.push(value)
            }
        //最后拍平数组
        return flatten(values)
    }
    $.contains = document.documentElement.contains ?
        function(parent, node) {
        	//contains方法存在的时候，只需要把相等情况排除
            return parent !== node && parent.contains(node)
        } :
        //当contains方法不存在的时候，使用while循环(相当于递归调用)
        function(parent, node) {
            while (node && (node = node.parentNode))
                if (node === parent) return true
            return false
        }
    $.grep = function(elements, callback) {
        return filter.call(elements, callback)
    }
    //直接使用indexOf
    $.inArray = function(elem, array, i) {
        return emptyArray.indexOf.call(array, elem, i)
    }
    $.isArray = isArray
    $.isFunction = isFunction
    $.isPlainObject = isPlainObject
    $.isWindow = isWindow
    /*
    	在需要传递回调函数作为参数，但是又不想在回调函数中做任何事情的时候传递一个空函数即可
    */
    $.noop = function() {}
    //在浏览器支持的情况下直接提供原生方法
    if (window.JSON) $.parseJSON = JSON.parse
    //增加str是否为null的判断
    $.trim = function(str) {
  		return str == null ? "" : String.prototype.trim.call(str)
	}
	$.type = type
    /*
    	判断是否为数值，需要满足以下条件
		不为 null
		不为布尔值
		不为NaN(当传进来的参数不为数值或如'123'这样形式的字符串时，都会转换成NaN)
		为有限数值
		当传进来的参数为字符串的形式，如'123' 时，会用到下面这个条件来确保字符串为数字的形式，而不是如 123abc 这样的形式。(type != 'string' || val.length) && !isNaN(num) 。
		这个条件的包含逻辑如下：如果为字符串类型，并且为字符串的长度大于零，并且转换成数组后的结果不为NaN，则断定为数值。（因为 Number('') 的值为 0）
    */
    $.isNumeric = function(val) {
        var num = Number(val), // 将参数转换为Number类型
            type = typeof val
        return val != null && 
          type != 'boolean' &&
            (type != 'string' || val.length) &&
          !isNaN(num) &&
          isFinite(num) 
          || false
    }
	function Z(doms) {
	    var len = doms.length 
	    for (var i = 0; i < len; i++) {
	        this[i] = doms[i]
	    }
	    /*
	    	{
				0: doms[0],
				1: doms[1],
				length: doms.length
	    	}
	    */
	    this.length = doms.length
	}

	zepto.Z = function(doms) {
	    return new Z(doms)
	}

	zepto.isZ = function(object) {
  		return object instanceof zepto.Z
	}
	/*
		simpleSelectorRE = /^[\w-]*$/,
		a-z、A-Z、0-9、下划线、连词符 组合起来的单词，这其实就是单个 id 和 class 的命名规则。
		
		先从#号判断是否是Id,
		再从.号判断是否class,
		最后再判断是否为单个选择器
	*/
	zepto.qsa = function(element, selector) {
        var found,  // 已经找的到DOM
            maybeID = selector[0] == '#',  // 是否为ID
            maybeClass = !maybeID && selector[0] == '.', // 是否为class
            nameOnly = maybeID || maybeClass ? selector.slice(1) : selector,  // 将id或class前面的符号去掉
            isSimple = simpleSelectorRE.test(nameOnly)  // 是否为单个选择器
        return (element.getElementById && isSimple && maybeID) ? 
            ((found = element.getElementById(nameOnly)) ? [found] : []) :
            (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
            //slice.call将类数组转化成数组
            slice.call(
                isSimple && !maybeID && element.getElementsByClassName ? 
                maybeClass ? element.getElementsByClassName(nameOnly) : 
                element.getElementsByTagName(selector) : 
                element.querySelectorAll(selector) 
            )
    }
    /*
    	fragment 的作用的是将html片断转换成dom数组形式。
    */
    zepto.fragment = function(html, name, properties) {
	  	var dom, nodes, container
	  	/*
	  		首先判断是否为单标签的形式 singleTagRE.test(html) （如<div></div>）, 
	  		如果是，则采用该标签名来创建dom对象 dom = $(document.createElement(RegExp.$1))，不用再作其他处理
	  	*/
	  	if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))
	  	//如果不是单标签
	  	if (!dom) {
	  		/*
	  			对 html 进行修复，如<p class="test" /> 修复成 <p class="test" /></p> 。
	  			正则表达式为 tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig
	  		*/
		    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
		    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
		    //in containers说明是特殊元素
		    if (!(name in containers)) name = '*'
		    container = containers[name]
		    container.innerHTML = '' + html
		    dom = $.each(slice.call(container.childNodes), function() {
		      container.removeChild(this)
		    })
	  	}
	  	if (isPlainObject(properties)) {
		    nodes = $(dom)
		    $.each(properties, function(key, value) {
		       /*
		       		methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset']
		       		这些属性有单独的方法，其他都是使用attr
		       */
		       if (methodAttributes.indexOf(key) > -1) nodes[key](value)
		       else nodes.attr(key, value)
		    })
		}
	  	return dom
	}

	zepto.init = function(selector, context) {
		/*
			$(doms)通过调用init方法，调用Z函数
			返回新的对象
		*/
	    var dom  // dom 集合
	    //当没有传入选择器的时候
  		if (!selector) return zepto.Z()
	    else if (typeof selector == 'string') { // 分支2
		    selector = selector.trim()
		    /*
		    	fragmentRE = /^\s*<(\w+|!)[^>]*>/
		    	用来判断字符串是否为标签。
		    	如果selector 的第一个字符为 < ，并且为html标签 
		    */
		    if (selector[0] == '<' && fragmentRE.test(selector))
		      dom = zepto.fragment(selector, RegExp.$1, context), selector = null
		      else if (context !== undefined) return $(context).find(selector)
		      else dom = zepto.qsa(document, selector)
		}
		/*
			$(function() {})  在页面加载完毕后，再执行回调方法：$(document).ready(selector)
		*/
		else if (isFunction(selector)) return $(document).ready(selector) // 分支3
		/*
			如果参数已经为 Z 对象（zepto.isZ(selector)），直接原对象返回就可以了。
		*/
		else if (zepto.isZ(selector)) return selector  // 分支4
		else { // 分支5
			/*
				如果为数组时（isArray(selector)）, 将数组展平(dom = compact(selector))
			*/
		    if (isArray(selector)) dom = compact(selector)
		    else if (isObject(selector))
		      dom = [selector], selector = null
		      else if (fragmentRE.test(selector))
		        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
		        else if (context !== undefined) return $(context).find(selector)
		        else dom = zepto.qsa(document, selector)
		}
		return zepto.Z(dom, selector)
	}

	$ = function() {
	    return zepto.init()
	}

	$.fn = {
	    constructor: zepto.Z,
	    method: function(){
	        return this
	    }
	}
	//将Z函数原型赋给$.fn，从Z函数构造返回的对象拥有fn上的方法
	zepto.Z.prototype = Z.prototype = $.fn

	return $
})()
window.Zepto = Zepto
//如果window.$ 是undefined则window.$ = Zepto
window.$ === undefined && (window.$ = Zepto)