zepto源码分析
--
`npm install`之后，使用命令`npm start`可以在浏览器中测试。源码及注释在`app/index.js`中。下面对zepto的主方法再进行简介，详细可以参考链接http://blog.csdn.net/sysuzhyupeng/article/details/54632922

入口
-
zepto入口结构如下所示：
```javascript
  var Zepto = (function(){ 
  }()
  window.Zepto = Zepto;
  window.$ === undefined && (window.$ = Zepto) 
```
将$符赋予Zepto对象，Zepto会返回一个构造函数。

构造函数
-
我们看一下init函数。
```javascript
  zepto.init = function(selector, context){
        var dom;
        // 根据传入的selector对通过document.getElementById等方法获取dom节点，并传入Z函数中
        return zepto.Z(dom, selector)
    }
```
接下来看一下Z函数
```javascript
    function Z(dom, selector){
        var i, len = dom ? dom.length : 0
        //进行一次浅拷贝
        for(i = 0; i < len; i++) this[i] = dom[i]
        this.length = len
        this.selector = selector || ''
    }
    zepto.Z = function(dom, selector){
        return new Z();
    }
    zepto.Z.prototype = Z.prototype = $.fn
```
通过给Z函数传递dom节点，将dom节点按照数组的key值存到返回对象上。同时记录length和selector属性。在`new Z()`的过程中，由于`zepto.Z.prototype`指向`$.fn`，所以返回对象也含有`$.fn`上的方法。

$.fn
-
zepto的核心方法都挂载在这上面。

