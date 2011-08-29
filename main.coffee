@me = {};
@names = {}
@times = {}

selectors = [
  'strpos(lower(message), "3") >= 0',
  'strlen(message) >= 100'
]

$ = (id) -> document.getElementById(id)

t = new Date
t.setTime(new Date - 1000 * 60 * 60 * 24 * 7 * 4) #4 weeks in the past
time = Math.floor(t.getTime()/1000)

filter = (list, func) -> x for x in list when func(x)

FB.init {
  appId  : '282025336884',
  status : true, # check login status
  cookie : true, # enable cookies to allow the server to access the session
  xfbml  : true, # parse XFBML
  channelUrl : 'channel.html', # channel.html file
  oauth  : true # enable OAuth 2.0
}

@login = ->
  $('button').disabled = true
  $('progress').style.display = ''
  FB.login((resp) ->
    FB.api '/me', (resp) ->
      @me = resp
      #console.log(resp)
      names[me.id] = me.name
      getSchedule me.id, ->
        completed = 0
        #console.log("Finding Friends")
        getFriends()

  , {scope: 'read_stream'})
  
completed = 0

getSchedule = (uid, cb) ->
  FB.api {
    method: 'fql.query',
    query: "select message, uid from status where uid=#{uid} and time > #{time} and (#{selectors.join(' or ')})"
  }, (resp) ->
    handleMessage(uid, status.message) for status in resp
    cb() if cb
    $('progress').value = (++completed)/(friends) if friends
    $('progress').style.display = 'none' if completed/friends==1

handleMessage = (uid, msg) ->
  log("#{names[uid]} - #{msg}")
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
  if 5 < items.length
    nums = (i[0] for i in items).join(' ').match(/\d+/g)
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
        classify(item[1], tags.split(' '), uid)

classify = (name, parts, uid) ->
  return if !name or !parts[0] or parts.length < 2 or !parts.slice(-1)[0]
  period = parts[0]
  parts = parts.slice(1)
  teacher = parts.slice(-1)[0]
  times[period] = {} unless times[period]?
  slot = times[period]
  slot[teacher] = {tag:[],names:[],people:[]} unless slot[teacher]?
  cls = slot[teacher]
  
  #console.log(names[uid], period, teacher)
  for tag in parts
    cls.tag.push(tag) unless tag in cls.tag

  cls.names.push(name) unless name in cls.names
  cls.el = showclass(name) unless cls.el


  unless uid in cls.people
    if uid is me.id
      cls.el.className += ' hasme'
    cls.people.push(uid) 
    cls.el.appendChild(showuser(uid))
    
    current = cls.el.querySelector('span').innerText
    if name.replace(/^[A-Z]/g,'').length > current.replace(/^[A-Z]/g,'').length and name.length > current.length
      cls.el.querySelector('span').innerHTML = "#{name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')}"

  if cls.people.length > 1
    cls.el.style.display = ''  

friends = 0
getFriends = () ->
  FB.api '/me/friends', (resp) ->
    names[friend.id] = friend.name for friend in resp.data
    for id, name of names
      friends++
      getSchedule(id)
    
    
    
showclass = (name) ->
  div = document.createElement('div')
  div.className = 'class'
  div.style.display = 'none'
  div.innerHTML = "<span>#{name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')}</span><br>"
  document.body.appendChild(div)
  div
    
showuser = (uid) ->
  div = document.createElement('div')
  div.className = 'user'
  span = document.createElement('span')
  span.innerHTML = names[uid]
  img = new Image()
  img.src = "https://graph.facebook.com/#{uid}/picture?type=square"
  div.appendChild(img)
  #div.style.backgroundImage = "url(https://graph.facebook.com/#{uid}/picture?type=large)"
  div.appendChild(span)
  div
    
    
