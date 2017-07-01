var request = require('supertest')
  , app = require('../app')

describe('loginTest', () => {
  let loggedIn = false;
  beforeEach((done) => {
    request(app)
      .post('/login')
      .set('Content-Type', 'x-www-form-urlencoded')
      .type('form')
      .send({
        'username': 'curbmaptest',
        'password': 'TestCurbm@p1'
      })
      .then(response => {
        if (response.body.username == 'curbmaptest') {
          loggedIn = true
          done();
        }
      })
  })
  xit('should test to make sure login works', () => {
    expect(loggedIn).toBe(true)
  })
})
