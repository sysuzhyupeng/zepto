var Zepto = (function () {
  	//
  	var zepto = {}, $;

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