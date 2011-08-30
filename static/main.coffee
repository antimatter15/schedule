@me = {};
@names = {}
@times = {}
@people = {}
direct_friend = {}
friends = 0
completed = 0
current_status = null

selectors = [
  'strpos(lower(message), "3") >= 0',
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

@login = ->
  $('button').style.display = 'none'
  $('progress').style.display = ''
  FB.login (resp) ->
    FB.api '/me', (resp) ->
      @me = resp      
      names[me.id] = me.name
      getSchedule me.id, (classes) ->
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
    for student in classes
      [name, uid, status_id] = student
      checkFriendship(uid, time, teacher, name, status_id) if uid isnt me.id

searchClasses = (uid, process) ->
  str = JSON.stringify(cls.join(';') for cls in @people[uid].classes)
  xhr = new XMLHttpRequest
  xhr.open 'get', "/search?uid=#{me.id}&classes=#{encodeURIComponent(str)}", true
  xhr.onreadystatechange = ->
    process(JSON.parse(xhr.responseText)) if xhr.readyState == 4
  xhr.send()


checkFriendship = (uid, time, teacher, name, status_id) ->
  if names[uid]
    classify("X", [time, teacher], {name, uid, status_id, message: ''}) 
  else
    FB.api {method: "friends.getMutualFriends", target_uid: uid}, (mutual)->
      if mutual.length > 1 # >0 should probably be sufficient though
        names[uid] = name
        classify("X", [time, teacher], {name, uid, status_id, message: ''}) 
  

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
      @people[uid] = {time: stime, status_id: sid, classes, uid}
    
    cb(classes) if cb
    $('progress').value = (++completed)/(friends) if friends
    if completed/friends == 1
      $('progress').style.display = 'none'
      $('share').style.display = ''
      uploadClasses()



uploadClasses = ->
  dense = for uid, friend of people
    [names[uid], uid, friend.status_id, friend.time-0, cls.join(';') for cls in friend.classes]
  xhr = new XMLHttpRequest
  xhr.open 'post', '/upload', true
  xhr.setRequestHeader 'Content-Type', "application/x-www-form-urlencoded"
  xhr.send("data=#{encodeURIComponent(JSON.stringify(dense))}")

handleMessage = (status) ->
  [uid, msg] = [status.uid, status.message]
  classes = []
  
  lines = for line in msg.split /\n|;/
    [(' ' + line + ' ').toLowerCase()
        .replace(/[a-z]+\?/gi, '')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/[a-z](\d+)/i, '$1')
        .replace(/(\d+)(st|nd|th|rd)/i, ' $1 ')
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s(i+)\s/g, (a,b) -> " #{b.length} ")
        .replace(/\s\d+(\s|$)/g, ' ')
        .replace(/([a-z])\d/g, ' $1 ')
        .replace(/\s[a-z]\s/g, ' ')
        .replace(/(\d+)([a-z])/i, '$1 $2')
        .replace(/^\s+|\s+$/g, ''), line]
  items = filter lines, (line) ->
    parts = line[0].split ' '
    len = parts.length
    len < 8 and !/sched/.test(parts[0])
    
  for item in items
    last = item[0].split(' ').slice(-1)[0]
    if last and last in "you,now,status,is,me,love,truth".split(',')
      return []
      
  if 5 < items.length < 14
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
  classes

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
  
  cls.el = showclass(name) unless cls.el
  unless uid in cls.people
    if uid is me.id
      cls.el.className += ' hasme'
    cls.people.push(uid) 
    cls.el.appendChild(showuser(status))
    
    current = cls.el.querySelector('span').innerHTML.replace(/<.+?>/g, '')
    if name.replace(/^[A-Z]/g,'').length > current.replace(/^[A-Z]/g,'').length and name.length > current.length
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
      
    
    
showclass = (name) ->
  div = document.createElement('div')
  div.className = 'class'
  div.style.display = 'none'
  div.innerHTML = "<span>#{name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')}</span><br>"
  $('results').appendChild(div)
  div
    
showuser = (status) ->
  uid = status.uid
  a = document.createElement('a')
  a.target = '_blank'
  if direct_friend[uid] or uid is me.id
    a.href = 'http://facebook.com/' + uid + '/posts/'+status.status_id
  else
    a.href = 'http://facebook.com/' + uid
  div = document.createElement('div')
  div.className = 'user'
  span = document.createElement('span')
  span.innerHTML = names[uid]#.replace(/(\w+)/,"<b>$1</b>")
  img = new Image()
  img.src = "https://graph.facebook.com/#{uid}/picture?type=square"
  div.appendChild(img)
  div.appendChild span
  a.appendChild div
  a
    
    
