(function() {
  var $, anim_state, checkFriendship, classify, completed, countmutual, current_status, direct_friend, filter, friends, getFriends, getSchedule, handleMessage, old_thresh, processSearch, progressAnimation, progress_value, race, searchClasses, selectors, setProgress, showMutualCount, showMutualMessage, showclass, showuser, t, uploadClasses;
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
  direct_friend = {};
  friends = 0;
  completed = 0;
  current_status = null;
  selectors = ['strpos(lower(message), "4") >= 0', 'strpos(lower(message), "5") >= 0', 'strlen(message) >= 100'];
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
    channelUrl: 'http://schedule-compare.appspot.com/channel.html',
    oauth: true
  });
  progress_value = 0;
  anim_state = -1;
  progressAnimation = function() {
    if (progress_value === 0) {
      $('progress_val').style.width = (anim_state -= 0.5) + '%';
      if (anim_state < 0) {
        anim_state = -1;
        $('progress_val').style.left = '0';
        $('progress_val').style.right = '';
        $('progress_val').style.width = '0';
        return;
      }
      $('progress_val').style.left = '';
      $('progress_val').style.right = '0';
      $('progress_val').style.marginLeft = 'auto';
      return setTimeout(progressAnimation, 10);
    } else if (progress_value === -1) {
      $('progress_val').style.marginLeft = '';
      $('progress_val').style.width = '10%';
      $('progress_val').style.left = (((anim_state += 0.5) % 110) - 10) + '%';
      return setTimeout(progressAnimation, 10);
    } else {
      $('progress_val').style.left = '0';
      return anim_state = -1;
    }
  };
  setProgress = function(val) {
    progress_value = val;
    $('progress').style.display = '';
    if (anim_state === -1 && val <= 0) {
      if (val === 0) {
        anim_state = 100;
      }
      return progressAnimation();
    } else {
      anim_state = -1;
      $('progress_val').style.marginLeft = '';
      return $('progress_val').style.width = 100 * val + '%';
    }
  };
  this.login = function() {
    $('buttonparent').style.display = 'none';
    $('share').style.display = 'none';
    setProgress(-1);
    return FB.login(function(resp) {
      return FB.api('/me', function(resp) {
        this.me = resp;
        names[me.id] = me.name;
        return getSchedule(me.id, function(classes) {
          var cb1, cb2, teacher, time, _i, _len, _ref, _ref2, _ref3;
          me.classes = {};
          if (this.people[me.id]) {
            _ref = this.people[me.id].classes;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              _ref2 = _ref[_i], time = _ref2[0], teacher = _ref2[1];
              me.classes[time + teacher] = 1;
            }
          }
          _ref3 = race(processSearch), cb1 = _ref3[0], cb2 = _ref3[1];
          if (classes.length > 0) {
            searchClasses(me.id, cb1);
          } else {
            $("submit").style.display = '';
          }
          completed = 0;
          return getFriends(cb2);
        });
      });
    }, {
      scope: 'read_stream,user_status,friends_status'
    });
  };
  race = function(cb) {
    var cb1, cb2, ccb, gcb1, gcb2;
    gcb1 = false;
    gcb2 = false;
    ccb = function() {
      if (gcb1 && gcb2) {
        return cb(gcb1, gcb2);
      }
    };
    cb1 = function(a) {
      gcb1 = a || true;
      return ccb();
    };
    cb2 = function(b) {
      gcb2 = b || true;
      return ccb();
    };
    return [cb1, cb2];
  };
  processSearch = function(json) {
    var classes, cls, name, status_id, strangers, student, teacher, time, uid, _ref, _results;
    _results = [];
    for (cls in json) {
      classes = json[cls];
      _ref = cls.split(";"), time = _ref[0], teacher = _ref[1];
      strangers = {};
      _results.push((function() {
        var _i, _len, _results2;
        _results2 = [];
        for (_i = 0, _len = classes.length; _i < _len; _i++) {
          student = classes[_i];
          name = student[0], uid = student[1], status_id = student[2];
          strangers[uid] = 1;
          _results2.push(uid !== me.id ? checkFriendship(uid, time, teacher, name, status_id) : void 0);
        }
        return _results2;
      })());
    }
    return _results;
  };
  searchClasses = function(uid, process) {
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
    xhr.open('get', "/search?uid=" + me.id + "&classes=" + (encodeURIComponent(str)), true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        return process(JSON.parse(xhr.responseText));
      }
    };
    return xhr.send();
  };
  checkFriendship = function(uid, time, teacher, name, status_id) {
    if (!this.people[uid]) {
      this.people[uid] = {
        classes: []
      };
    }
    this.people[uid].classes.push([time, teacher]);
    if (names[uid]) {
      return classify("X", [time, teacher], {
        name: name,
        uid: uid,
        status_id: status_id,
        message: ''
      });
    } else {
      names[uid] = name;
      return FB.api({
        method: "friends.getMutualFriends",
        target_uid: uid
      }, function(mutual) {
        if (mutual.length > 1) {
          classify("X", [time, teacher], {
            name: name,
            uid: uid,
            status_id: status_id,
            message: ''
          });
          return showMutualMessage(uid);
        }
      });
    }
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
        showMutualMessage(uid);
      }
      if (cb) {
        cb(classes);
      }
      if (friends) {
        setProgress((++completed) / friends);
      }
      if (completed / friends === 1) {
        setProgress(0);
        $('share').style.display = '';
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
    var c, classes, cls, i, item, items, last, line, lines, msg, name, num, nums, split_regex, tags, uid, _i, _j, _len, _len2, _ref, _ref2;
    _ref = [status.uid, status.message], uid = _ref[0], msg = _ref[1];
    classes = [];
    if (!/\n/.test(msg.replace(/^\s+|\s+$/g, ''))) {
      split_regex = /\n|;/;
    } else {
      split_regex = /\n/;
    }
    lines = (function() {
      var _i, _len, _ref2, _results;
      _ref2 = msg.split(split_regex);
      _results = [];
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        line = _ref2[_i];
        _results.push([
          (' ' + line + ' ').toLowerCase().replace(/[a-z]+\?/gi, '').replace(/[^a-z0-9\s]/gi, ' ').replace(/[a-z](\d+)/i, '$1').replace(/(\d+)(st|nd|th|rd)/i, ' $1 ').replace(/\s+/g, ' ').replace(/\s[a-z]\s/g, ' ').replace(/^\s+|\s+$/g, '').replace(/\s(i+)\s/g, function(a, b) {
            return " " + b.length + " ";
          }).replace(/\s\d+(\s|$)/g, ' ').replace(/([a-z])\d/g, ' $1 ').replace(/(\d+)([a-z])/i, '$1 $2').replace(/^\s+|\s+$/g, ''), line
        ]);
      }
      return _results;
    })();
    items = filter(lines, function(line) {
      var len, llen, parts;
      parts = line[0].split(' ');
      llen = line[0].length;
      len = parts.length;
      return llen > 3 && len < 8 && !/sched/i.test(line[0]);
    });
    for (_i = 0, _len = items.length; _i < _len; _i++) {
      item = items[_i];
      last = item[0].split(' ').slice(-1)[0];
      if (last && __indexOf.call("you,now,status,is,me,love,truth".split(','), last) >= 0) {
        return [];
      }
    }
    if ((3 < (_ref2 = items.length) && _ref2 < 16)) {
      nums = ((function() {
        var _j, _len2, _results;
        _results = [];
        for (_j = 0, _len2 = items.length; _j < _len2; _j++) {
          i = items[_j];
          _results.push(i[0]);
        }
        return _results;
      })()).join('').match(/\d+/g);
      if (!nums || nums.length < 3) {
        items = (function() {
          var _len2, _results;
          _results = [];
          for (c = 0, _len2 = items.length; c < _len2; c++) {
            i = items[c];
            _results.push(["" + (c + 1) + " " + i[0], i[1]]);
          }
          return _results;
        })();
      }
      for (_j = 0, _len2 = items.length; _j < _len2; _j++) {
        item = items[_j];
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
      cls.el = showclass(name, uid, period, teacher);
    }
    if (__indexOf.call(cls.people, uid) < 0) {
      if (uid === me.id) {
        cls.el.className += ' hasme';
      }
      cls.people.push(uid);
      cls.el.appendChild(showuser(status));
      current = cls.el.querySelector('span').innerHTML.replace(/<.+?>/g, '');
      if (name.replace(/^[A-Z]/g, '').length > current.replace(/^[A-Z]/g, '').length) {
        cls.el.querySelector('span').innerHTML = "" + (name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>'));
      }
    }
    if (cls.people.length > 1) {
      cls.el.style.display = '';
    }
    return [period, teacher];
  };
  getFriends = function(cb) {
    return FB.api('/me/friends', function(resp) {
      var friend, id, name, _i, _len, _ref, _results;
      _ref = resp.data;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        friend = _ref[_i];
        direct_friend[friend.id] = names[friend.id] = friend.name;
      }
      if (cb) {
        cb();
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
  countmutual = function(uid1, uid2) {
    var cls, idx, mutual, other, _len, _ref;
    mutual = 0;
    _ref = this.people[uid1].classes;
    for (idx = 0, _len = _ref.length; idx < _len; idx++) {
      cls = _ref[idx];
      other = this.people[uid2].classes[idx];
      if (cls.join('') === other.join('')) {
        mutual++;
      }
    }
    return mutual;
  };
  showMutualCount = function() {
    var teacher, time, uid, _i, _len, _ref, _ref2, _results;
    _ref = this.people[this.me.id].classes;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      _ref2 = _ref[_i], time = _ref2[0], teacher = _ref2[1];
      _results.push((function() {
        var _j, _len2, _ref3, _results2;
        _ref3 = this.times[time][teacher].people;
        _results2 = [];
        for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
          uid = _ref3[_j];
          _results2.push(uid !== me.id ? showMutualMessage(uid) : void 0);
        }
        return _results2;
      }).call(this));
    }
    return _results;
  };
  showMutualMessage = function(uid, classes) {
    var count, el, teacher, time, _i, _j, _len, _len2, _ref, _ref2, _results;
    if (classes == null) {
      classes = this.people[uid].classes;
    }
    if (uid === me.id) {
      return;
    }
    count = 0;
    for (_i = 0, _len = classes.length; _i < _len; _i++) {
      _ref = classes[_i], time = _ref[0], teacher = _ref[1];
      if (me.classes[time + teacher]) {
        count++;
      }
    }
    if (count > 1) {
      _ref2 = document.getElementsByName('u' + uid);
      _results = [];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        el = _ref2[_j];
        _results.push(!el.added_count ? (el.added_count = true, el !== el.parentNode.firstChild.nextSibling ? el.parentNode.insertBefore(el, el.parentNode.firstChild.nextSibling.nextSibling) : void 0, el.getElementsByTagName('div')[1].innerHTML += "<br><span style='font-size:xx-small'>" + count + " classes with you</span>") : void 0);
      }
      return _results;
    }
  };
  showclass = function(name, uid, period, teacher) {
    var div;
    div = document.createElement('div');
    div.className = 'class';
    div.style.display = 'none';
    if (uid !== me.id) {
      div.innerHTML = "<a style='float:right' href='#expand' onclick='expand_class(this, " + (JSON.stringify([period, teacher])) + ");return false'>+</a>";
    }
    div.innerHTML += "<div class='classname'><span>" + (name.replace(/[^\w]/g, ' ').replace(/([a-z]?\d)/i, '<b>$1</b>')) + "</span></div>";
    $('results').appendChild(div);
    return div;
  };
  this.expand_class = function(el, arr) {
    var teacher, time, xhr;
    el.style.display = 'none';
    time = arr[0], teacher = arr[1];
    xhr = new XMLHttpRequest;
    xhr.open('get', "/expand?period=" + time + "&teacher=" + teacher, true);
    xhr.onreadystatechange = function() {
      var name, status_id, student, uid, _i, _len, _ref, _results;
      if (xhr.readyState === 4) {
        _ref = JSON.parse(xhr.responseText);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          student = _ref[_i];
          name = student[0], uid = student[1], status_id = student[2];
          _results.push(uid !== me.id ? checkFriendship(uid, time, teacher, name, status_id) : void 0);
        }
        return _results;
      }
    };
    return xhr.send();
  };
  showuser = function(status) {
    var a, div, img, name, uid;
    uid = status.uid;
    a = document.createElement('a');
    a.target = '_blank';
    a.name = "u" + status.uid;
    if (direct_friend[uid] || uid === me.id) {
      a.href = 'http://facebook.com/' + uid + '/posts/' + status.status_id;
    } else {
      a.href = 'http://facebook.com/' + uid;
    }
    div = document.createElement('div');
    div.className = 'user';
    name = document.createElement('div');
    name.innerHTML = '<span>' + names[uid] + '</span>';
    img = new Image();
    img.src = "https://graph.facebook.com/" + uid + "/picture?type=square";
    div.appendChild(img);
    div.appendChild(name);
    a.appendChild(div);
    return a;
  };
}).call(this);
