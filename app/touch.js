;(function($){
  /*
    触屏设备不支持双击事件。双击浏览器窗口，会放大画面。
    在触屏上，单击一个元素，会相应的触发：mousemove mousedown mouseup click，
    只有两个手指都触摸到事件的接收容器时才触发这些手势事件，
    当一个手指放在屏幕上时，会触发touchstart事件，如果另一个手指又放在了屏幕上，则会触发gesturestart事件，随后触发基于该手指的touchstart事件
    如果一个或两个手指在屏幕上滑动，将会触发gesturechange事件，但只要有一个手指移开，则会触发gestureend事件，紧接着又会触发toucheend事件
    由于触摸会导致屏幕动来动去，所以可以在这些事件的事件处理函数内使用event.preventDefault()，来阻止屏幕的默认滚动。
  */
  /*
    zepto支持以下事件：
      swipe: 滑动事件
      swipeLeft: 向左滑动事件
      swipeRight: 向右滑动事件
      swipeUp: 向上滑动事件
      swipeDown: 向下滑动事件
      doubleTap: 屏幕双击事件
      tap: 屏幕点击事件，比 click 事件响应更快
      singleTap: 屏幕单击事件
      longTap: 长按事件
  */
  //touch 对象保存的是触摸过程中的信息
  var touch = {},
    touchTimeout, tapTimeout, swipeTimeout, longTapTimeout,
    longTapDelay = 750,
    gesture

  /*
     首先判断x方向的差值是否大于y方向的差值
     x方向为left和right
     y方向为up和down
  */
  function swipeDirection(x1, x2, y1, y2) {
    return Math.abs(x1 - x2) >=
      Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  //长按事件处理
  function longTap() {
    longTapTimeout = null
    //last 保存的是最后触摸的时间
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }
  //将延时取消掉，longTap将不会被触发
  function cancelLongTap() {
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }
  /*
    清除所有事件的执行,
    其实就是清除所有相关的定时器，最后将 touch 对象设置为 null 
  */
  function cancelAll() {
    if (touchTimeout) clearTimeout(touchTimeout)
    if (tapTimeout) clearTimeout(tapTimeout)
    if (swipeTimeout) clearTimeout(swipeTimeout)
    if (longTapTimeout) clearTimeout(longTapTimeout)
    touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
    touch = {}
  }
  /*
    是否为主触点
  */
  function isPrimaryTouch(event){
    //pointerType 可为 touch 、 pen 和 mouse 
    return (event.pointerType == 'touch' ||
      event.pointerType == event.MSPOINTER_TYPE_TOUCH)
      && event.isPrimary
  }
  /*
    是否是触屏事件
    在低版本的移动端 IE 浏览器中，只实现了 PointerEvent ，并没有实现 TouchEvent
  */
  function isPointerEventType(e, type){
    return (e.type == 'pointer'+type ||
      e.type.toLowerCase() == 'mspointer'+type)
  }
  /*
    now 用来保存当前时间， delta 用来保存两次触摸之间的时间差， 
    deltaX 用来保存 x轴 上的位移， 
    deltaY 来用保存 y轴 上的位移， 
    firstTouch 保存初始触摸点的信息， 
    _isPointerType 保存是否为 pointerEvent 的判断结果。
  */
  $(document).ready(function(){
    var now, delta, deltaX = 0, deltaY = 0, firstTouch, _isPointerType
    /*
      IE 的手势使用，需要经历三步：
        创建手势对象
        设置事件目标
        指定手势识别时需要处理的指针
    */
    if ('MSGesture' in window) {
      gesture = new MSGesture()
      //将target设置为body
      gesture.target = document.body
    }

    $(document)
      /*
        手势事件结束
      */
      .bind('MSGestureEnd', function(e){
        //velocityX 和 velocityY 分别为 x轴 和 y轴 上的速率。这里以 1 或 -1 为临界点，判断 swipe 的方向。
        var swipeDirectionFromVelocity =
          e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null
        //如果手势存在，则触发swipe
        if (swipeDirectionFromVelocity) {
          touch.el.trigger('swipe')
          touch.el.trigger('swipe'+ swipeDirectionFromVelocity)
        }
      })
      /*
        touchstart、MSPointerDown、pointerdown类似, 都是点击事件
      */
      .on('touchstart MSPointerDown pointerdown', function(e){
        //非触屏事件return
        if((_isPointerType = isPointerEventType(e, 'down')) &&
          !isPrimaryTouch(e)) return
        //因为 TouchEvent 支持多点触碰，这里只取触碰的第一点存入 firstTouch 变量
        firstTouch = _isPointerType ? e : e.touches[0]
        if (e.touches && e.touches.length === 1 && touch.x2) {
          /*
            正常情况下，touch 对象会在 touchEnd 或者 cancel 的时候清空，
            但是如果用户自己调用了 preventDefault 等，就可能会出现没有清空的情况。
            这里手动对我们赋予touch对象的x2、y2进行清空
          */
          touch.x2 = undefined
          touch.y2 = undefined
        }
        now = Date.now()
        delta = now - (touch.last || now)
        /*
          如果 target 不是标签节点时，取父节点作为目标元素。这会在点击伪类元素时出现。
        */
        touch.el = $('tagName' in firstTouch.target ?
          firstTouch.target : firstTouch.target.parentNode)
        touchTimeout && clearTimeout(touchTimeout)
        touch.x1 = firstTouch.pageX
        touch.y1 = firstTouch.pageY
        //Zepto 将两次点击的时间间隔小于 250ms 时，作为 doubleTap 事件处理，将 isDoubleTap 设置为 true 。
        if (delta > 0 && delta <= 250) touch.isDoubleTap = true
        //将 touch.last 设置为当前时间。这样就可以记录两次点击时的时间差了
        touch.last = now
        longTapTimeout = setTimeout(longTap, longTapDelay)
        // 指定手势识别时需要处理的指针(IE处理)
        if (gesture && _isPointerType) gesture.addPointer(e.pointerId)
      })
      //手指移动
      .on('touchmove MSPointerMove pointermove', function(e){
        //非触屏事件return
        if((_isPointerType = isPointerEventType(e, 'move')) &&
          !isPrimaryTouch(e)) return
        firstTouch = _isPointerType ? e : e.touches[0]
        //因为有移动，肯定就不是长按了
        cancelLongTap()
        touch.x2 = firstTouch.pageX
        touch.y2 = firstTouch.pageY
        //更新deltaX和deltaY计算起点到终点之间的位移
        deltaX += Math.abs(touch.x1 - touch.x2)
        deltaY += Math.abs(touch.y1 - touch.y2)
      })
      //触摸结束
      .on('touchend MSPointerUp pointerup', function(e){
        if((_isPointerType = isPointerEventType(e, 'up')) &&
          !isPrimaryTouch(e)) return
        //进入 end 时，立刻清除 longTap 定时器的执行
        cancelLongTap()

        // 起点和终点的距离超过 30 时，会被判定为 swipe 滑动事件。
        if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
            (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))
          //swipe 事件并不是在 end 系列事件触发时立即触发的，而是设置了一个 0ms 的定时器，让事件异步触发
          swipeTimeout = setTimeout(function() {
            if (touch.el){
              touch.el.trigger('swipe')
              touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
            }
            touch = {}
          }, 0)

        /*
          如果触发了 start ， last肯定是存在的，但是如果触发了长按事件，touch对象会被清空，这时不会再触发 tap 事件
        */
        else if ('last' in touch)
          /*
            如果手指移动超过30px移动不算做tap事件
          */
          if (deltaX < 30 && deltaY < 30) {
            /*
              异步触发是为了在 scroll 的过程中和外界调用 cancelTouch 方法时， 可以将事件取消,
              tap事件在scroll事件前触发
            */
            tapTimeout = setTimeout(function() {
              // trigger universal 'tap' with the option to cancelTouch()
              // (cancelTouch cancels processing of single vs double taps for faster 'tap' response)
              var event = $.Event('tap')
              event.cancelTouch = cancelAll
              // [by paper] fix -> "TypeError: 'undefined' is not an object (evaluating 'touch.el.trigger'), when double tap
              if (touch.el) touch.el.trigger(event)
              // trigger double tap immediately
              if (touch.isDoubleTap){
                if (touch.el) touch.el.trigger('doubleTap')
                touch = {}
              }
              else {
                touchTimeout = setTimeout(function(){
                  touchTimeout = null
                  // trigger single tap after 250ms of inactivity
                  if (touch.el) touch.el.trigger('singleTap')
                  touch = {}
                }, 250)
              }
            }, 0)
          } else {
            touch = {}
          }
          deltaX = deltaY = 0

      })
      // when the browser window loses focus,
      // for example when a modal dialog is shown,
      // cancel all ongoing events
      .on('touchcancel MSPointerCancel pointercancel', cancelAll)

    // scrolling the window indicates intention of the user
    // to scroll, not tap or swipe, so cancel all ongoing events
    $(window).on('scroll', cancelAll)
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
    'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(eventName){
    $.fn[eventName] = function(callback){ return this.on(eventName, callback) }
  })
})(Zepto)