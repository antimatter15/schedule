#!/usr/bin/env python

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from django.utils import simplejson
from google.appengine.ext import db
import datetime

class Student(db.Model):
  #uid = db.StringProperty()
  name = db.StringProperty()
  status_id = db.StringProperty()
  time = db.DateProperty()
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
  t13 = db.StringProperty() #I think whoever is unlucky enough to have a fourteenth period cant use the internet
  

class UploadHandler(webapp.RequestHandler):
  def post(self):
    users = simplejson.loads(self.request.get('data'))
    for user in users:
      [name, uid, status_id, time, classes] = user
      student = Student.get_or_insert(uid)
      student.name = name
      student.status_id = status_id
      student.time = datetime.date.fromtimestamp(time)
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
      self.response.out.write(uid)


class SearchHandler(webapp.RequestHandler):
  def get(self):
    classes = simplejson.loads(self.request.get('classes'))
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
        results[c].append([user.name, user.key().name(), user.status_id])
    self.response.out.write(simplejson.dumps(results))
      
  

def main():
  application = webapp.WSGIApplication([('/upload', UploadHandler),
                                        ('/search', SearchHandler)],
                     debug=True)
  util.run_wsgi_app(application)


if __name__ == '__main__':
  main()
