const { expect } = require('chai')
const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

describe.only('Bookmarks Endpoints', function() {
    let db
  
    before('make knex instance', () => {
      db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
      })

      app.set('db', db)
    })
  

    after('disconnect from db', () => db.destroy())
  
    before('clean the table', () => db('bookmarks_table').truncate())

    afterEach('cleanup', () => db('bookmarks_table').truncate())

    describe(`GET /bookmarks`, () => {

        context(`Given no bookmarks`, () => {
            it(`responds with 200 and an empty list`, () => {
              return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, [])
            })
          })

        context('Given there are articles in the database', () => {
            const testArticles = makeBookmarksArray()
      
            beforeEach('insert bookmarks', () => {
              return db
                .into('bookmarks_table')
                .insert(testArticles)
            })
      
            it('responds with 200 and all of the bookmarks', () => {
              return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, testArticles)
            })
        })
  

      })
  

    describe(`Get /bookmarks/:bookmark_id`, () => {
        
        context(`Given there are no bookmarks`, () => {
            it(`responsed with 404`, () => {
                const bookmarkId = 123456
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: `Bookmark Not Found`}})
            })

        })

        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks_table')
                    .insert(testBookmarks)
            })

            it('responds with 200 and the specified bookmark', () =>{
                const bookmarkId = 2
                const expectedBookmark = testBookmarks[bookmarkId - 1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })

    })
    
  
})