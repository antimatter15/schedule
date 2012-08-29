@me = {};
@names = {}
@times = {}
@people = {}
direct_friend = {}
friends = 0
completed = 0
current_status = null

selectors = [
  'strpos(lower(message), "4") >= 0',
  'strpos(lower(message), "5") >= 0',
  'strlen(message) >= 100'
]

$ = (id) -> document.getElementById(id)

t = new Date
t.setTime(new Date - 1000 * 60 * 60 * 24 * 7 * 4) #4 weeks in the past
old_thresh = Math.floor(t.getTime()/1000)

filter = (list, func) -> x for x in list when func(x)

FB.init {
  appId  : '282025336884',
  status : true, # check login status
  cookie : true, # enable cookies to allow the server to access the session
  xfbml  : true, # parse XFBML
  channelUrl : 'http://schedule-compare.appspot.com/channel.html', # channel.html file
  oauth  : true # enable OAuth 2.0
}

progress_value = 0
anim_state = -1

progressAnimation = ->
  if progress_value is 0
    $('progress_val').style.width = (anim_state -= 0.5) + '%'
    if anim_state < 0
      anim_state = -1
      $('progress_val').style.left = '0'
      $('progress_val').style.right = ''
      $('progress_val').style.width = '0'
      return
    $('progress_val').style.left = ''
    $('progress_val').style.right = '0'
    $('progress_val').style.marginLeft = 'auto'
    setTimeout progressAnimation, 10
  else if progress_value is -1
    $('progress_val').style.marginLeft = ''
    $('progress_val').style.width = '10%'
    $('progress_val').style.left = (((anim_state += 0.5) % 110) - 10) + '%'
    setTimeout progressAnimation, 10
  else 
    $('progress_val').style.left = '0'
    anim_state = -1
    
setProgress = (val) ->
  progress_value = val
  $('progress').style.display = ''
  if anim_state == -1 and val <= 0
    if val == 0
      anim_state = 100
    progressAnimation()
  else
    anim_state = -1
    $('progress_val').style.marginLeft = ''
    $('progress_val').style.width = 100 * val + '%'


@login = ->
  $('buttonparent').style.display = 'none'
  # $('share').style.display = 'none'
  $('shareplz').style.display = ''
  setProgress -1
  FB.login (resp) ->
    FB.api '/me', (resp) ->
      @me = resp      
      names[me.id] = me.name
      getSchedule me.id, (classes) ->
        me.classes = {}
        if @people[me.id]
          for [time, teacher] in @people[me.id].classes
            me.classes[time+teacher] = 1 
        
        [cb1, cb2] = race processSearch
        if classes.length > 0
          searchClasses me.id, cb1
        else
          $("submit").style.display = ''
        completed = 0
        getFriends cb2

  , {scope: 'read_stream,user_status,friends_status'}


race = (cb) -> 
  gcb1 = false
  gcb2 = false
  ccb = ->
    cb(gcb1, gcb2) if gcb1 and gcb2
  cb1 = (a) ->
    gcb1 = a || true
    ccb()
  cb2 = (b) ->
    gcb2 = b || true
    ccb()
  [cb1, cb2]


processSearch = (json) ->
  for cls, classes of json
    [time, teacher] = cls.split(";")
    strangers = {}
    for student in classes
      [name, uid, status_id] = student
      strangers[uid] = 1
      checkFriendship(uid, time, teacher, name, status_id) if uid isnt me.id

    
searchClasses = (uid, process) ->
  str = JSON.stringify(cls.join(';') for cls in @people[uid].classes)
  xhr = new XMLHttpRequest
  xhr.open 'get', "/search?uid=#{me.id}&classes=#{encodeURIComponent(str)}", true
  xhr.onreadystatechange = ->
    process(JSON.parse(xhr.responseText)) if xhr.readyState == 4
  xhr.send()


checkFriendship = (uid, time, teacher, name, status_id) ->
  @people[uid] = {classes: []} unless @people[uid]
  @people[uid].classes.push([time, teacher]) 
  if names[uid]
    classify("X", [time, teacher], {name, uid, status_id, message: ''}) 
  else
    names[uid] = name
    FB.api {method: "friends.getMutualFriends", target_uid: uid}, (mutual)->
      if mutual.length > 1 # >0 should probably be sufficient though
        classify("X", [time, teacher], {name, uid, status_id, message: ''})
        showMutualMessage uid

getSchedule = (uid, cb) ->
  FB.api {
    method: 'fql.query',
    query: "select message, uid, status_id, time from status where uid=#{uid} and time > #{old_thresh} and (#{selectors.join(' or ')})"
  }, (resp) ->
    classes = []
    stime = 0
    sid = 0
    for status in resp
      temp = handleMessage(status)
      if temp.length > 0
        classes = classes.concat(temp) 
        sid = status.status_id
        stime = status.time
    if classes.length > 0
      @people[uid] = {time: stime, status_id: sid, classes, uid, message: status.message}
      showMutualMessage uid
    cb(classes) if cb
    if friends
      setProgress (++completed)/friends
    if completed/friends == 1
      setProgress 0
      $('share').style.display = ''
      uploadClasses()



uploadClasses = ->
  dense = for uid, friend of people
    [names[uid], uid, friend.status_id, friend.time-0, cls.join(';') for cls in friend.classes, friend.message]
  xhr = new XMLHttpRequest
  xhr.open 'post', '/upload', true
  xhr.setRequestHeader 'Content-Type', "application/x-www-form-urlencoded"
  xhr.send("data=#{encodeURIComponent(JSON.stringify(dense))}")

handleMessage = (status) ->
  [uid, msg] = [status.uid, status.message]
  classes = []
  if !/\n/.test(msg.replace(/^\s+|\s+$/g, ''))
    split_regex = /\n|;/
  else
    split_regex = /\n/
  lines = for line in msg.split split_regex
    [(' ' + line + ' ').toLowerCase()
        .replace(/[a-z]+\?/gi, '')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/[a-z](\d+)/i, '$1')
        .replace(/(\d+)(st|nd|th|rd)/i, ' $1 ')
        .replace(/\s+/g, ' ')
        .replace(/\s[a-z]\s/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s(i+)\s/g, (a,b) -> " #{b.length} ")
        .replace(/\s\d+(\s|$)/g, ' ')
        .replace(/([a-z])\d/g, ' $1 ')
        .replace(/(\d+)([a-z])/i, '$1 $2')
        .replace(/^\s+|\s+$/g, ''), line]
  items = filter lines, (line) ->
    parts = line[0].split ' '
    llen = line[0].length
    len = parts.length
    llen > 3 and len < 8 and !/sched/i.test(line[0])
    
  for item in items
    last = item[0].split(' ').slice(-1)[0]
    if last and last in "you,now,status,is,me,love,truth,go,yet,like,teeth,time,fine,also,beautiful,tomorrow,awesome,bible".split(',')
      return []
  
  if 3 < items.length < 16
    #console.log(item[0] for item in items) if items.length > 0 
    nums = (i[0] for i in items).join('').match(/\d+/g)
    if !nums or nums.length < 3
      items = (["#{c+1} #{i[0]}",i[1]] for i,c in items)
    for item in items
      name = item[1]
      tags = item[0]
      if num = tags.match(/\d+/)
        tags = tags
          .replace(/\s?\d+\s?/, ' ')
          .replace(/^\s+|\s+$/g, '')
        tags = num[0] + ' ' + tags
        cls = classify(item[1], tags.split(' '), status)
        classes.push(cls) if cls
  if classes.length > 2
    classes
  else
    []

classify = (name, parts, status) ->
  uid = status.uid
  return if !name or !parts[0] or parts.length < 2 or !parts.slice(-1)[0]
  period = parts[0]
  parts = parts.slice(1)
  teacher = parts.slice(-1)[0]
  times[period] = {} unless times[period]?
  slot = times[period]
  slot[teacher] = {tag:[],names:[],people:[]} unless slot[teacher]?
  cls = slot[teacher]
  
  for tag in parts
    cls.tag.push(tag) unless tag in cls.tag

  cls.names.push(name) unless name in cls.names
  
  cls.el = showclass(name, uid, period, teacher) unless cls.el
  unless uid in cls.people
    if uid is me.id
      cls.el.className += ' hasme'
    cls.people.push(uid) 
    cls.el.appendChild(showuser(status))
    
    current = cls.el.querySelector('span').innerHTML.replace(/<.+?>/g, '')
    if name.replace(/^[A-Z]/g,'').length > current.replace(/^[A-Z]/g,'').length #and name.length > current.length
      cls.el.querySelector('span').innerHTML = "#{name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')}"

  if cls.people.length > 1
    cls.el.style.display = ''  
  [period, teacher]

getFriends = (cb) ->
  FB.api '/me/friends', (resp) ->
    direct_friend[friend.id] = names[friend.id] = friend.name for friend in resp.data
    cb() if cb
    for id, name of names
      friends++
      getSchedule(id)
      
countmutual = (uid1, uid2) ->
  mutual = 0
  for cls, idx in @people[uid1].classes
    other = @people[uid2].classes[idx]
    mutual++ if cls.join('') == other.join('')
  mutual

showMutualCount = ->
  for [time, teacher] in @people[@me.id].classes
    for uid in @times[time][teacher].people
      if uid isnt me.id
        showMutualMessage(uid)

showMutualMessage = (uid, classes = @people[uid].classes) ->
  return if uid is me.id
  count = 0
  for [time, teacher] in classes
    if me.classes[time+teacher]
      count++
  if count > 1
    for el in document.getElementsByName('u'+uid)
      if !el.added_count
        el.added_count = true
        if el != el.parentNode.firstChild.nextSibling
          el.parentNode.insertBefore(el, el.parentNode.firstChild.nextSibling.nextSibling)
        el.getElementsByTagName('div')[1].innerHTML += "<br><span style='font-size:xx-small'>#{count} classes with you</span>"

showclass = (name, uid, period, teacher) ->
  div = document.createElement('div')
  div.className = 'class'
  div.style.display = 'none'
  if uid isnt me.id
    div.innerHTML = "<a style='float:right' href='#expand' onclick='expand_class(this, #{JSON.stringify([period,teacher])});return false'>+</a>"
  div.innerHTML += "<div class='classname'><span>#{name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')}</span></div>"
  $('results').appendChild(div)
  div
  
@expand_class = (el, arr) ->
  el.style.display = 'none'
  [time, teacher] = arr
  xhr = new XMLHttpRequest
  xhr.open 'get', "/expand?period=#{time}&teacher=#{teacher}", true
  xhr.onreadystatechange = ->
    if xhr.readyState == 4
      for student in JSON.parse(xhr.responseText)
        [name, uid, status_id] = student
        checkFriendship(uid, time, teacher, name, status_id) if uid isnt me.id
  xhr.send()
    

@expand_user = (uid) ->
  xhr = new XMLHttpRequest
  xhr.open 'get', "/lookup?uid=#{uid}", true
  xhr.onreadystatechange = ->
    if xhr.readyState == 4
      student = JSON.parse(xhr.responseText)
      if student.name
        student.uid = uid
        showsched(student)
  xhr.send()


showsched = (student) ->
  div = document.createElement('div')
  div.className = 'class'
  div.innerHTML = "<div class='classname'>#{student.name.replace(/^([^ ]+)/g, '<b>$1</b>')}</div>"
  img = new Image()
  img.src = "https://graph.facebook.com/#{student.uid}/picture?type=square"
  div.appendChild(img)
  list = document.createElement('div')
  list.className = 'list'
  list.innerText = student.status
  div.appendChild(list)
  $('results').appendChild(div)
  
showuser = (status) ->
  uid = status.uid
  a = document.createElement('a')
  a.target = '_blank'
  a.name = "u"+status.uid
  if direct_friend[uid] or uid is me.id
    a.href = 'http://facebook.com/' + uid + '/posts/'+status.status_id
  else
    a.href = 'http://facebook.com/' + uid
  div = document.createElement('div')
  div.className = 'user'
  name = document.createElement('div')
  name.innerHTML = '<span>'+names[uid]+'</span>'
  img = new Image()
  img.src = "https://graph.facebook.com/#{uid}/picture?type=square"
  div.appendChild(img)
  div.appendChild name
  a.appendChild div
  a
    
@postToFeed = ->
  FB.ui {
    method: 'feed',
    link: 'https://schedule-compare.appspot.com/',
    picture: 'https://schedule-compare.appspot.com/static/schedule.png',
    caption: 'https://schedule-compare.appspot.com/',
    description: 'Instantly compare your class schedule with your friends for coming school year'
  }
