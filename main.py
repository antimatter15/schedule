#!/usr/bin/env python
import webapp2
# from google.appengine.ext import webapp2
# from google.appengine.ext.webapp2 import util
# from django.utils import simplejson
import json
from google.appengine.ext import db
from google.appengine.api import memcache
from google.appengine.api import urlfetch

import urllib
import datetime
import time



class Reminder(db.Model):
  created = db.DateTimeProperty()
  expires = db.DateTimeProperty()
  purpose = db.StringProperty()

class Student(db.Model):
  name = db.StringProperty()
  status_id = db.StringProperty()
  status = db.TextProperty()
  time = db.DateTimeProperty()
  school = db.StringProperty()
  location = db.StringProperty()
  class_year = db.StringProperty()
  source = db.StringProperty()

  t00 = db.StringProperty() #for some cool school that has a zeroeth period
  t01 = db.StringProperty()
  t02 = db.StringProperty()
  t03 = db.StringProperty()
  t04 = db.StringProperty()
  t05 = db.StringProperty()
  t06 = db.StringProperty()
  t07 = db.StringProperty()
  t08 = db.StringProperty()
  t09 = db.StringProperty()
  t10 = db.StringProperty()
  t11 = db.StringProperty()
  t12 = db.StringProperty()
  t13 = db.StringProperty() #I think whoever is unlucky enough to have a fourteenth period has no time to use the internet
  

class UploadHandler(webapp2.RequestHandler):
  def post(self):
    me = self.request.get('actor')
    users = json.loads(self.request.get('data'))
    for user in users:
      [name, uid, status_id, time, school, location, class_year, classes, status] = user
      if memcache.get(uid) is None or me == uid:
        memcache.add(uid, 1, 60 * 60 * 24 * 30)
        student = Student.get_by_key_name(uid)
        if student is None:
          student = Student(key_name = uid)
        student.name = name
        student.status = status
        student.status_id = status_id
        student.time = datetime.datetime.fromtimestamp(float(time))
        student.school = school
        student.location = location
        student.class_year = class_year
        if me == uid:
          student.source = 'self'
        else:
          student.source = me

        for c in classes:
          [period, teacher] = c.split(";", 1)
          period = int(period)
          if period is 0:
            student.t00 = teacher
          elif period is 1:
            student.t01 = teacher
          elif period is 2:
            student.t02 = teacher
          elif period is 3:
            student.t03 = teacher
          elif period is 4:
            student.t04 = teacher
          elif period is 5:
            student.t05 = teacher
          elif period is 6:
            student.t06 = teacher
          elif period is 7:
            student.t07 = teacher
          elif period is 8:
            student.t08 = teacher
          elif period is 9:
            student.t09 = teacher                                                            
          elif period is 10:
            student.t10 = teacher          
          elif period is 11:
            student.t11 = teacher          
          elif period is 12:
            student.t12 = teacher          
          elif period is 13:
            student.t13 = teacher
        student.put()
        self.response.out.write(uid+",")
    

class SearchHandler(webapp2.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'application/json'
    classes = json.loads(self.request.get('classes'))
    searcher = self.request.get('uid')
    results = {}
    for c in classes:
      results[c] = []
      [period, teacher] = c.split(";", 1)
      if len(period) is 1:
        period = "0"+period
      q = Student.all()
      q.filter("time >", datetime.datetime.now() - datetime.timedelta(weeks = 4))
      q.filter("t"+period + " =", teacher)
      for user in q.fetch(121):
        uid = user.key().name()
        if uid != searcher:
          results[c].append([user.name, uid, user.status_id])
    self.response.out.write(json.dumps(results))
      

class ExpandHandler(webapp2.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'application/json'
    period = self.request.get("period")
    teacher = self.request.get("teacher")
    results = []
    if len(period) is 1:
      period = "0"+period
    q = Student.all()
    q.filter("time >", datetime.datetime.now() - datetime.timedelta(weeks = 4))
    q.filter("t"+period + " =", teacher)
    for user in q.fetch(121):
      uid = user.key().name()
      results.append([user.name, uid, user.status_id])
    self.response.out.write(json.dumps(results))
      
class LookupHandler(webapp2.RequestHandler):
  def get(self):
    self.response.headers['Content-Type'] = 'application/json'
    uid = self.request.get("uid")
    student = Student.get_by_key_name(uid)
    if student is None:
      self.response.out.write('{}')
    else:
      self.response.out.write(json.dumps({
        "name": student.name,
        "status_id": student.status_id,
        "status": student.status,
        "time": time.mktime(student.time.timetuple()),
        "school": student.school,
        "t00": student.t00, "t01": student.t01, "t02": student.t02, "t03": student.t03,
        "t04": student.t04, "t05": student.t05, "t06": student.t06, "t07": student.t07,
        "t08": student.t08, "t09": student.t09, "t10": student.t10, "t11": student.t11,
        "t12": student.t12, "t13": student.t13
      }))
      


class FlushHandler(webapp2.RequestHandler):
  def get(self):
    self.response.out.write(str(memcache.flush_all()))
    

class RemindHandler(webapp2.RequestHandler):
  def post(self):
    uid = self.request.get('uid')
    days = self.request.get('days')
    reminder = Reminder.get_by_key_name(uid)
    try:
      int(days)

      if reminder is None:
        reminder = Reminder(key_name = uid)
        self.response.out.write('create')
      else:
        self.response.out.write('update')
      reminder.created = datetime.datetime.now()
      reminder.expires = datetime.datetime.now() + datetime.timedelta(days = int(days))
      reminder.purpose = self.request.get('purpose')
      reminder.put()

    except ValueError:
      if reminder is None:
        self.response.out.write('naught')
      else:
        reminder.delete()
        self.response.out.write('delete')
  
  def get(self):
    uid = self.request.get('uid')
    reminder = Reminder.get_by_key_name(uid)
    if reminder is None:
      self.response.out.write('narp')
    else:
      self.response.out.write(time.mktime(reminder.expires.timetuple()))


class RemindDispatcher(webapp2.RequestHandler):
  def get(self):
    if self.request.headers.get('X-Appengine-Cron') != "true":
      return
    q = Reminder.all()
    q.filter("expires <", datetime.datetime.now())
    q.order("expires")
    results = q.fetch(10)

    client_id = "282025336884"
    client_secret = "ece4f1c624e5e3fd58d01df6e7f54a0d"
    access_token = None
    for reminder in results:
      if access_token is None:
        # memcache it?
        result = urlfetch.fetch("https://graph.facebook.com/oauth/access_token?client_id=" + client_id + "&client_secret=" + client_secret + "&grant_type=client_credentials")
        access_token = result.content
      form_data = {
        "template": "Daisy, Daisy, Give me your answer, do. ",
        "href": "https://schedule-compare.appspot.com/"
      }
      reminder.delete()
      post_result = urlfetch.fetch("https://graph.facebook.com/" + reminder.key().name() + "/notifications?" + access_token,
                    payload=urllib.urlencode(form_data),
                    method=urlfetch.POST,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'})
      


application = webapp2.WSGIApplication([('/upload', UploadHandler),
                                        ('/search', SearchHandler),
                                        ('/expand', ExpandHandler),
                                        ('/lookup', LookupHandler),
                                        ('/flush', FlushHandler),
                                        ('/remind', RemindHandler),
                                        ('/royksopp', RemindDispatcher)],
                     debug=True)
