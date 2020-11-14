const { expect } = require('chai')
const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const { get } = require('../src/bookmarks/bookmarks-router')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures')

describe('Bookmarks Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => db('bookmarks_table').truncate())

  afterEach('cleanup', () => db('bookmarks_table').truncate())

  describe(`Unauthorized requests`, () => {
    const testBookmarks = makeBookmarksArray()

    beforeEach('insert bookmarks', () => {
      return db
        .into('bookmarks_table')
        .insert(testBookmarks)
    })


  })



  
  describe('GET /api/bookmarks', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_table')
          .insert(testBookmarks)
      })

      it('gets the bookmarks from the store', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks_table')
          .insert([maliciousBookmark])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
          })
      })
    })
  })

  describe('GET /api/bookmarks/:bookmark_id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 whe bookmark doesn't exist`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark Not Found` }
          })
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_table')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })

    context(`Given an XSS attack bookmark`, () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks_table')
          .insert([maliciousBookmark])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedBookmark.title)
            expect(res.body.description).to.eql(expectedBookmark.description)
          })
      })
    })
  })




  describe('DELETE /api/bookmarks/:bookmark_id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 whe bookmark doesn't exist`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark Not Found` }
          })
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_table')
          .insert(testBookmarks)
      })

      it('removes the bookmark by ID from the store', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bm => bm.id !== idToRemove)
        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get(`/api/bookmarks`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmarks)
          )
      })
    })
  })



  describe('POST /api/bookmarks', () => {


    it('adds a new bookmark to the store', () => {
      const newBookmark = {
        title: 'test-title',
        url: 'https://test.com',
        description: 'test description',
        rating: 1,
      }
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
        })
        .then(res =>
          supertest(app)
            .get(`/api/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        )
    })

    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(maliciousBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })
  })


  describe.only(`PATCH /api/bookmarks/:bookmark_id`, () => {
    context(`Given no articles`, () => {
      it(`responds with 404`, () => {

      const bookmarkId = 123456
      return supertest(app)
        .patch(`/api/bookmarks/${bookmarkId}`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(404, {error: {message: `Bookmark Not Found`}})
      })
    })

    context(`Given there are bookmarks in the database`, ()=> {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks_table')
          .insert(testBookmarks)
      })

      // It responds with a 204 and no content when successful

      it(`responds with 204 and update bookmark`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated bookmark title',
          url: 'https://updated-url.com',
          description: 'updated bookmark description',
          rating: 3,
        }

        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
            .then(res =>
              supertest(app)
                .get(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(expectedBookmark)
              )
      })

      // It responds with a 400 when no values are supplied for any fields (title, url, description, rating)
      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send ({irrelevantField: 'foo'})
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', 'description' or 'rating'`
            }
          })
      })


      //It allows partial updates, for example, only supplying a new title will only update the title for that item

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated bookmark title',
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          )
      })



    })

  

  })

})
