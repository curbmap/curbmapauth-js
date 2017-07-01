'use strict';
let postgres = require('../model/postgresModels')
describe('postgresTest', () => {
  let foundUser = undefined;
  beforeEach((done) => {
    postgres.User.findOne({ where: { username: 'curbmaptest'}})
    .then(user => {
      foundUser = user;
      done();
    })
  })
  xit('should test to make sure curbmaptest user exists', () => {
    expect(foundUser).not.toBeUndefined();
    expect(foundUser.username).toMatch(/curbmaptest/)
  })
})
