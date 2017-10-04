(function($){
  /*
    zepto 针对 ajax 的发送过程，定义了以下几个事件，正常情况下的触发顺序如下：

      ajaxstart : XMLHttpRequest 实例化前触发
      ajaxBeforeSend： 发送 ajax 请求前触发
      ajaxSend : 发送 ajax 请求时触发
      ajaxSuccess / ajaxError : 请求成功/失败时触发
      ajaxComplete： 请求完成（无论成功还是失败）时触发
      ajaxStop: 请求完成后触发，这个事件在 ajaxComplete 后触发。
  */
  /*
    type： HTTP 请求的类型；
    url: 请求的路径；
    data： 请求参数；
    processData: 是否需要将非 GET 请求的参数转换成字符串，默认为 true ，即默认转换成字符串；
    contentType: 设置 Content-Type 请求头；
    mineType ： 覆盖响应的 MIME 类型，可以是 json、 jsonp、 script、 xml、 html、 或者 text；
    jsonp: jsonp 请求时，携带回调函数名的参数名，默认为 callback；
    jsonpCallback： jsonp 请求时，响应成功时，执行的回调函数名，默认由 zepto 管理；
    timeout: 超时时间，默认为 0；
    headers：设置 HTTP 请求头；
    async： 是否为同步请求，默认为 false；
    global： 是否触发全局 ajax 事件，默认为 true；
    context： 执行回调时（如 jsonpCallbak）时的上下文环境，默认为 window。
    traditional: 是否使用传统的浅层序列化方式序列化 data 参数，默认为 false，例如有 data 为 {p1:'test1', p2: {nested: 'test2'} ，在 traditional 为 false 时，会序列化成 p1=test1&p2[nested]=test2， 在为 true 时，会序列化成 p1=test&p2=[object+object]；
    xhrFields：xhr 的配置；
    cache：是否允许浏览器缓存 GET 请求，默认为 false；
    username：需要认证的 HTTP 请求的用户名；
    password： 需要认证的 HTTP 请求的密码；
    dataFilter： 对响应数据进行过滤；
    xhr： XMLHttpRequest 实例，默认用 new XMLHttpRequest() 生成；
    accepts：从服务器请求的 MIME 类型；
    beforeSend： 请求发出前调用的函数；
    success: 请求成功后调用的函数；
    error： 请求出错时调用的函数；
    complete： 请求完成时调用的函数，无论请求是失败还是成功。
  */
  var jsonpID = +new Date(),
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/,
      originAnchor = document.createElement('a')

  originAnchor.href = window.location.href

  // 用来触发一个事件，并且如果该事件禁止浏览器默认事件时，返回 false
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.isDefaultPrevented()
  }

  // 调用的triggerAndReturn方法，暴露不同的api。如果有指定上下文对象，则在指定的上下文对象上触发，否则在 document 上触发。
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  /*
    触发全局的 ajaxStart 事件。
    如果 global 设置为 true，则 $.active 的值增加1。
    如果 global 为 true ，并且 $.active 在更新前的数量为 0，则触发全局的 ajaxStart 事件。
  */
  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  /*
    触发全局 ajaxStop 事件。
    如果 global 为 true ，则将 $.active 的数量减少 1。
    如果 $.active 的数量减少至 0，即没有在执行中的 ajax 请求时，触发全局的 ajaxStop 事件
  */
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  /*
    触发 ajaxBeforeSend事件和 ajaxSend 事件。
    只不过 ajaxBeforedSend 事件可以通过外界的配置来取消事件的触发。
  */
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings, deferred) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    if (deferred) deferred.resolveWith(context, [data, status, xhr])
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings, deferred) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    if (deferred) deferred.rejectWith(context, [xhr, type, error])
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  function ajaxDataFilter(data, type, settings) {
    if (settings.dataFilter == empty) return data
    var context = settings.context
    return settings.dataFilter.call(context, data, type)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options, deferred){
    if (!('type' in options)) return $.ajax(options)

    var _callbackName = options.jsonpCallback,
      callbackName = ($.isFunction(_callbackName) ?
        _callbackName() : _callbackName) || ('Zepto' + (jsonpID++)),
      script = document.createElement('script'),
      originalCallback = window[callbackName],
      responseData,
      abort = function(errorType) {
        $(script).triggerHandler('error', errorType || 'abort')
      },
      xhr = { abort: abort }, abortTimeout

    if (deferred) deferred.promise(xhr)

    $(script).on('load error', function(e, errorType){
      clearTimeout(abortTimeout)
      $(script).off().remove()

      if (e.type == 'error' || !responseData) {
        ajaxError(null, errorType || 'error', xhr, options, deferred)
      } else {
        ajaxSuccess(responseData[0], xhr, options, deferred)
      }

      window[callbackName] = originalCallback
      if (responseData && $.isFunction(originalCallback))
        originalCallback(responseData[0])

      originalCallback = responseData = undefined
    })

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return xhr
    }

    window[callbackName] = function(){
      responseData = arguments
    }

    script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
    document.head.appendChild(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      //返回xhr对象
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    // IIS returns Javascript as "application/x-javascript"
    accepts: {
      script: 'text/javascript, application/javascript, application/x-javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
    //Used to handle the raw response data of XMLHttpRequest.
    //This is a pre-filtering function to sanitize the response.
    //The sanitized response should be returned
    dataFilter: empty
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }
  //增加url后面的参数，如果传入第二个参数，则增加&+ query
  //因为有可能存在还没有参数的情况，所以
  function appendQuery(url, query) {
    if (query == '') return url
    //最少匹配1次且最多匹配2次, 假设出现了?&, 改成?
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  //将options的引用传递过来，直接序列化参数并添加到url上
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET' || 'jsonp' == options.dataType))
      options.url = appendQuery(options.url, options.data), options.data = undefined
  }

  $.ajax = function(options){
    //获得传递过来的options副本作为settings
    var settings = $.extend({}, options || {}),
        //deferred 为 deferred 对象
        deferred = $.Deferred && $.Deferred(),
        urlAnchor, hashIndex
    //遍历默认设置，如果options没设置，则使用默认设置的
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)
    /*
      判断是否跨域
      originAnchor 是当前页面链接，已经在上面定义。创建一个a节点，将 href 属性设置为当前请求的地址，
      然后获取节点的 protocol 和 host，看跟当前页面的链接用同样方式拼接出来的地址是否一致。
      协议加host可以确定是否跨域

      注意到这里的 urlAnchor 进行了两次赋值，这是因为 ie 默认不会对链接 a 添加端口号，
      但是会对 window.location.href 添加端口号，如果端口号为 80 时，会出现不一致的情况
    */
    if (!settings.crossDomain) {
      urlAnchor = document.createElement('a')
      urlAnchor.href = settings.url
      urlAnchor.href = urlAnchor.href
      settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host)
    }
    //如果没有配置 url ，则用当前页面的地址作为请求地址
    if (!settings.url) settings.url = window.location.toString()
    //如果请求的地址带有 hash， 则取hash之前的url，因为 hash 并不会传递给后端
    if ((hashIndex = settings.url.indexOf('#')) > -1) settings.url = settings.url.slice(0, hashIndex)
    //序列化传递过来的参数
    serializeData(settings)

    var dataType = settings.dataType, 
      //判断是否有?=占位符
      hasPlaceholder = /\?.+=\?/.test(settings.url)
    //如果已经有?=占位符，则为jsop
    if (hasPlaceholder) dataType = 'jsonp'
    //清除浏览器缓存的方式也很简单，就是往请求地址的后面加上一个时间戳，这样每次请求的地址都不一样
    //如果配置了缓存，就不加时间戳
    if (settings.cache === false || (
         (!options || options.cache !== true) &&
         ('script' == dataType || 'jsonp' == dataType)
        ))
      settings.url = appendQuery(settings.url, '_=' + Date.now())

    if ('jsonp' == dataType) {
      if (!hasPlaceholder)
        //如果还没有 ?= 占位符
        settings.url = appendQuery(settings.url,
          settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?')
        //转向jsonp处理
      return $.ajaxJSONP(settings, deferred)
    }
    //获取mime类型
    var mime = settings.accepts[dataType],
        //headers 为请求头
        headers = { },
        //修改headers的方法
        setHeader = function(name, value) { headers[name.toLowerCase()] = [name, value] },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        //获得new 返回的xhr对象
        xhr = settings.xhr(),
        //nativeSetHeader 为 xhr 实例上的 setRequestHeader 方法。
        nativeSetHeader = xhr.setRequestHeader,
        abortTimeout
    //如果 deferred 对象存在，则调用 promise 方法，以 xhr 为基础生成一个 promise
    if (deferred) deferred.promise(xhr)
    /*
      如果不是跨域，
      这个请求头的作用是告诉服务端，这个请求为 ajax 请求。
    */
    if (!settings.crossDomain) setHeader('X-Requested-With', 'XMLHttpRequest')
    //设置客户端接受的资源类型。
    setHeader('Accept', mime || '*/*')
    if (mime = settings.mimeType || mime) {
      /*
        当 mime 存在时，调用 overrideMimeType 方法来重写 response 的 content-type ，
        使得服务端返回的类型跟客户端要求的类型不一致时，可以按照指定的格式来解释。
        https://segmentfault.com/a/1190000004322487
      */
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    //发送信息至服务器时内容编码类型
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded')
    //如果options中传入了headers，遍历增加到header上
    if (settings.headers) for (name in settings.headers) setHeader(name, settings.headers[name])
    xhr.setRequestHeader = setHeader

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'))

          if (xhr.responseType == 'arraybuffer' || xhr.responseType == 'blob')
            result = xhr.response
          else {
            result = xhr.responseText

            try {
              // http://perfectionkills.com/global-eval-what-are-the-options/
              // sanitize response accordingly if data filter callback provided
              result = ajaxDataFilter(result, dataType, settings)
              if (dataType == 'script')    (1,eval)(result)
              else if (dataType == 'xml')  result = xhr.responseXML
              else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
            } catch (e) { error = e }

            if (error) return ajaxError(error, 'parsererror', xhr, settings, deferred)
          }

          ajaxSuccess(result, xhr, settings, deferred)
        } else {
          ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred)
        }
      }
    }
    //调用 ajaxBeforeSend 方法，如果返回的为 false ，则中止 ajax 请求。
    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      ajaxError(null, 'abort', xhr, settings, deferred)
      return xhr
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async, settings.username, settings.password)

    if (settings.xhrFields) for (name in settings.xhrFields) xhr[name] = settings.xhrFields[name]

    for (name in headers) nativeSetHeader.apply(xhr, headers[name])

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings, deferred)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // 返回配置文件
  function parseArguments(url, data, success, dataType) {
    //如果data没有传
    if ($.isFunction(data)) dataType = success, success = data, data = undefined
    //如果success回调函数没有传
    if (!$.isFunction(success)) dataType = success, success = undefined
    return {
      url: url
    , data: data
    , success: success
    , dataType: dataType
    }
  }
  /*
    这三个方法都是拿到调用的参数之后，再拼接option传递给$.ajax
  */
  $.get = function(/* url, data, success, dataType */){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(/* url, data, success, dataType */){
    //获得options之后，再增加type属性
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(/* url, data, success */){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }
  //escape为URI编码
  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, 
        array = $.isArray(obj), 
        hash = $.isPlainObject(obj)
    //遍历obj
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope :
        scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    //在容器 params 上定义了一个 add 方法，供 serialize 调用。params为参数数组
    params.add = function(key, value) {
      //如果value是函数，则执行
      if ($.isFunction(value)) value = value()
      if (value == null) value = ""
      this.push(escape(key) + '=' + escape(value))
    }
    serialize(params, obj, traditional)
    //最后将容器中的数据用 & 连接起来，并且将空格替换成 + 号。
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)