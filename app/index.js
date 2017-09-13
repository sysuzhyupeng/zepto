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
  	/*
  		定义这个空数组是为了取得数组的 concat、filter、slice 方法
  	*/
  	var emptyArray = [],
		concat = emptyArray.concat,
	    filter = emptyArray.filter,
	    slice = emptyArray.slice;
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

	zepto.init = function(doms) {
		/*
			$(doms)通过调用init方法，调用Z函数
			返回新的对象
		*/
	    var doms = ['domObj1','domObj2','domObj3']
	    return zepto.Z(doms)
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