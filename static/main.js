(function() {
  var $, classify, completed, current_status, filter, friends, getFriends, getSchedule, handleMessage, old_thresh, searchClasses, selectors, showclass, showuser, t, uploadClasses;
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
  current_status = null;
  selectors = ['strpos(lower(message), "3") >= 0', 'strlen(message) >= 100'];
  $ = function(id) {
    return document.getElementById(id);
  };
  t = new Date;
  t.setTime(new Date - 1000 * 60 * 60 * 24 * 7 * 4);
  old_thresh = Math.floor(t.getTime() / 1000);
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
    $('button').style.display = 'none';
    $('progress').style.display = '';
    return FB.login(function(resp) {
      return FB.api('/me', function(resp) {
        this.me = resp;
        names[me.id] = me.name;
        return getSchedule(me.id, function(classes) {
          var completed;
          completed = 0;
          if (classes.length > 0) {
            searchClasses(me.id);
          } else {
            $("submit").style.display = '';
          }
          return getFriends();
        });
      });
    }, {
      scope: 'read_stream,user_status,friends_status'
    });
  };
  completed = 0;
  searchClasses = function(uid) {
    var cls, str, xhr;
    str = JSON.stringify((function() {
      var _i, _len, _ref, _results;
      _ref = this.people[uid].classes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cls = _ref[_i];
        _results.push(cls.join(';'));
      }
      return _results;
    }).call(this));
    xhr = new XMLHttpRequest;
    xhr.open('get', "/search?classes=" + (encodeURIComponent(str)), true);
    xhr.onload = function() {
      var classes, cls, name, status_id, student, teacher, time, _ref, _ref2, _results;
      _ref = JSON.parse(xhr.responseText);
      _results = [];
      for (cls in _ref) {
        classes = _ref[cls];
        _ref2 = cls.split(";"), time = _ref2[0], teacher = _ref2[1];
        _results.push((function() {
          var _i, _len, _results2;
          _results2 = [];
          for (_i = 0, _len = classes.length; _i < _len; _i++) {
            student = classes[_i];
            name = student[0], uid = student[1], status_id = student[2];
            _results2.push(uid !== me.id ? (names[uid] = name, classify("X", [time, teacher], {
              name: name,
              uid: uid,
              status_id: status_id,
              message: ''
            })) : void 0);
          }
          return _results2;
        })());
      }
      return _results;
    };
    return xhr.send();
  };
  getSchedule = function(uid, cb) {
    return FB.api({
      method: 'fql.query',
      query: "select message, uid, status_id, time from status where uid=" + uid + " and time > " + old_thresh + " and (" + (selectors.join(' or ')) + ")"
    }, function(resp) {
      var classes, sid, status, stime, temp, _i, _len;
      classes = [];
      stime = 0;
      sid = 0;
      for (_i = 0, _len = resp.length; _i < _len; _i++) {
        status = resp[_i];
        temp = handleMessage(status);
        if (temp.length > 0) {
          classes = classes.concat(temp);
          sid = status.status_id;
          stime = status.time;
        }
      }
      if (classes.length > 0) {
        this.people[uid] = {
          time: stime,
          status_id: sid,
          classes: classes,
          uid: uid
        };
      }
      if (cb) {
        cb(classes);
      }
      if (friends) {
        $('progress').value = (++completed) / friends;
      }
      if (completed / friends === 1) {
        $('progress').style.display = 'none';
        return uploadClasses();
      }
    });
  };
  uploadClasses = function() {
    var cls, dense, friend, uid, xhr;
    dense = (function() {
      var _results;
      _results = [];
      for (uid in people) {
        friend = people[uid];
        _results.push([
          names[uid], uid, friend.status_id, friend.time - 0, (function() {
            var _i, _len, _ref, _results2;
            _ref = friend.classes;
            _results2 = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              cls = _ref[_i];
              _results2.push(cls.join(';'));
            }
            return _results2;
          })()
        ]);
      }
      return _results;
    })();
    xhr = new XMLHttpRequest;
    xhr.open('post', '/upload', true);
    xhr.setRequestHeader('Content-Type', "application/x-www-form-urlencoded");
    return xhr.send("data=" + (encodeURIComponent(JSON.stringify(dense))));
  };
  handleMessage = function(status) {
    var c, classes, cls, i, item, items, line, lines, msg, name, num, nums, tags, uid, _i, _len, _ref;
    _ref = [status.uid, status.message], uid = _ref[0], msg = _ref[1];
    log("" + names[uid] + " - " + msg);
    classes = [];
    lines = (function() {
      var _i, _len, _ref2, _results;
      _ref2 = msg.split(/\n|;/);
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        line = _ref2[_i];
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
      })()).join('').match(/\d+/g);
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
          cls = classify(item[1], tags.split(' '), status);
          if (cls) {
            classes.push(cls);
          }
        }
      }
    }
    return classes;
  };
  classify = function(name, parts, status) {
    var cls, current, period, slot, tag, teacher, uid, _i, _len;
    uid = status.uid;
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
    if (__indexOf.call(cls.people, uid) < 0) {
      if (uid === me.id) {
        cls.el.className += ' hasme';
      }
      cls.people.push(uid);
      cls.el.appendChild(showuser(status));
      current = cls.el.querySelector('span').innerText;
      if (name.replace(/^[A-Z]/g, '').length > current.replace(/^[A-Z]/g, '').length && name.length > current.length) {
        cls.el.querySelector('span').innerHTML = "" + (name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>'));
      }
    }
    if (cls.people.length > 1) {
      cls.el.style.display = '';
    }
    return [period, teacher];
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
  showuser = function(status) {
    var a, div, img, span, uid;
    uid = status.uid;
    a = document.createElement('a');
    a.target = '_blank';
    a.href = 'http://facebook.com/' + uid + '/posts/' + status.status_id;
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
