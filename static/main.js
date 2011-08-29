(function() {
  var $, classify, completed, filter, friends, getFriends, getSchedule, handleMessage, selectors, showclass, showuser, t, time;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  this.me = {};
  this.names = {};
  this.times = {};
  this.people = {};
  selectors = ['strpos(lower(message), "3") >= 0', 'strlen(message) >= 100'];
  $ = function(id) {
    return document.getElementById(id);
  };
  t = new Date;
  t.setTime(new Date - 1000 * 60 * 60 * 24 * 7 * 4);
  time = Math.floor(t.getTime() / 1000);
  filter = function(list, func) {
    var x, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      x = list[_i];
      if (func(x)) {
        _results.push(x);
      }
    }
    return _results;
  };
  FB.init({
    appId: '282025336884',
    status: true,
    cookie: true,
    xfbml: true,
    channelUrl: 'channel.html',
    oauth: true
  });
  this.login = function() {
    $('button').disabled = true;
    $('progress').style.display = '';
    return FB.login(function(resp) {
      return FB.api('/me', function(resp) {
        this.me = resp;
        names[me.id] = me.name;
        return getSchedule(me.id, function() {
          var completed;
          completed = 0;
          return getFriends();
        });
      });
    }, {
      scope: 'read_stream,user_status,friends_status'
    });
  };
  completed = 0;
  getSchedule = function(uid, cb) {
    return FB.api({
      method: 'fql.query',
      query: "select message, uid, status_id, time from status where uid=" + uid + " and time > " + time + " and (" + (selectors.join(' or ')) + ")"
    }, function(resp) {
      var classes, sid, status, stime, temp, _i, _len;
      classes = [];
      stime = 0;
      sid = 0;
      for (_i = 0, _len = resp.length; _i < _len; _i++) {
        status = resp[_i];
        temp = handleMessage(uid, status.message);
        if (temp.length > 0) {
          classes = classes.concat(temp);
          sid = status.status_id;
          stime = status.time;
        }
      }
      this.people[uid] = {
        time: stime,
        status_id: sid,
        classes: classes,
        uid: uid
      };
      if (cb) {
        cb();
      }
      if (friends) {
        $('progress').value = (++completed) / friends;
      }
      if (completed / friends === 1) {
        return $('progress').style.display = 'none';
      }
    });
  };
  handleMessage = function(uid, msg) {
    var c, classes, i, item, items, line, lines, name, num, nums, tags, _i, _len;
    log("" + names[uid] + " - " + msg);
    classes = [];
    lines = (function() {
      var _i, _len, _ref, _results;
      _ref = msg.split(/\n|;/);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        _results.push([
          (' ' + line + ' ').toLowerCase().replace(/[a-z]+\?/gi, '').replace(/[^a-z0-9\s]/gi, ' ').replace(/[a-z](\d+)/i, '$1').replace(/(\d+)(st|nd|th|rd)/i, ' $1 ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/\s(i+)\s/g, function(a, b) {
            return " " + b.length + " ";
          }).replace(/\s\d+(\s|$)/g, ' ').replace(/([a-z])\d/g, ' $1 ').replace(/\s[a-z]\s/g, ' ').replace(/(\d+)([a-z])/i, '$1 $2').replace(/^\s+|\s+$/g, ''), line
        ]);
      }
      return _results;
    })();
    items = filter(lines, function(line) {
      var len, parts;
      parts = line[0].split(' ');
      len = parts.length;
      return len < 8 && !/sched/.test(parts[0]);
    });
    if (5 < items.length) {
      nums = ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          i = items[_i];
          _results.push(i[0]);
        }
        return _results;
      })()).join(' ').match(/\d+/g);
      if (!nums || nums.length < 3) {
        items = (function() {
          var _len, _results;
          _results = [];
          for (c = 0, _len = items.length; c < _len; c++) {
            i = items[c];
            _results.push(["" + (c + 1) + " " + i[0], i[1]]);
          }
          return _results;
        })();
      }
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        name = item[1];
        tags = item[0];
        if (num = tags.match(/\d+/)) {
          tags = tags.replace(/\s?\d+\s?/, ' ').replace(/^\s+|\s+$/g, '');
          tags = num[0] + ' ' + tags;
          classes.push(classify(item[1], tags.split(' '), uid));
        }
      }
    }
    return classes;
  };
  classify = function(name, parts, uid) {
    var cls, current, period, slot, tag, teacher, _i, _len;
    if (!name || !parts[0] || parts.length < 2 || !parts.slice(-1)[0]) {
      return;
    }
    period = parts[0];
    parts = parts.slice(1);
    teacher = parts.slice(-1)[0];
    if (times[period] == null) {
      times[period] = {};
    }
    slot = times[period];
    if (slot[teacher] == null) {
      slot[teacher] = {
        tag: [],
        names: [],
        people: []
      };
    }
    cls = slot[teacher];
    for (_i = 0, _len = parts.length; _i < _len; _i++) {
      tag = parts[_i];
      if (__indexOf.call(cls.tag, tag) < 0) {
        cls.tag.push(tag);
      }
    }
    if (__indexOf.call(cls.names, name) < 0) {
      cls.names.push(name);
    }
    if (!cls.el) {
      cls.el = showclass(name);
    }
    [period, teacher];
    if (__indexOf.call(cls.people, uid) < 0) {
      if (uid === me.id) {
        cls.el.className += ' hasme';
      }
      cls.people.push(uid);
      cls.el.appendChild(showuser(uid));
      current = cls.el.querySelector('span').innerText;
      if (name.replace(/^[A-Z]/g, '').length > current.replace(/^[A-Z]/g, '').length && name.length > current.length) {
        cls.el.querySelector('span').innerHTML = "" + (name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>'));
      }
    }
    if (cls.people.length > 1) {
      return cls.el.style.display = '';
    }
  };
  friends = 0;
  getFriends = function() {
    return FB.api('/me/friends', function(resp) {
      var friend, id, name, _i, _len, _ref, _results;
      _ref = resp.data;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        friend = _ref[_i];
        names[friend.id] = friend.name;
      }
      _results = [];
      for (id in names) {
        name = names[id];
        friends++;
        _results.push(getSchedule(id));
      }
      return _results;
    });
  };
  showclass = function(name) {
    var div;
    div = document.createElement('div');
    div.className = 'class';
    div.style.display = 'none';
    div.innerHTML = "<span>" + (name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')) + "</span><br>";
    document.body.appendChild(div);
    return div;
  };
  showuser = function(uid) {
    var a, div, img, span;
    a = document.createElement('a');
    a.href = 'http://facebook.com/' + uid;
    div = document.createElement('div');
    div.className = 'user';
    span = document.createElement('span');
    span.innerHTML = names[uid];
    img = new Image();
    img.src = "https://graph.facebook.com/" + uid + "/picture?type=square";
    div.appendChild(img);
    div.appendChild(span);
    a.appendChild(div);
    return a;
  };
}).call(this);
