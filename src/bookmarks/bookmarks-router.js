const express = require('express')
const store = require('../store')
const { v4: uuid } = require('uuid');
const { isWebUri } = require('valid-url')
const logger = require('../logger')

const bookmarkRouter = express.Router()
const bodyParser = express.json()


bookmarkRouter
  .route('/bookmarks')
  .get((req, res) => {
    // move implementation logic into here
    res.json(store.bookmarks)
  })
  .post(bodyParser, (req, res) => {
    // move implementation logic into here
    const { title, description, url, rating} = req.body;


    if (!title) {
      logger.error(`Title is required`)
      return res
        .status(400)
        .send('Need a Title');
    }
  
  
    if(!description){
      logger.error(`Description Required`);
      return res
        .status(400)
        .send('Need a Description')
    }
  
    if(!isWebUri(url)){
      logger.error(`Url Required`)
      return res
      .status(400)
        .send('Invalid Url')
    }
  
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
        logger.error(`Invalid rating '${rating}' supplied`)
           return res
          .status(400)
          .send(`'rating' must be a number between 0 and 5`)
    }
  
      // get an id
    const id = uuid();
  
    const bookmark = {
      id,
      title,
      description,
      url,
      rating,
    };
  
    store.bookmarks.push(bookmark);
  
    logger.info(`Bookmark with id ${id} created`)
    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${id}`)
      .json(bookmark)
  
  })

bookmarkRouter
  .route('/bookmarks/:id')
  .get((req, res) => {
    // move implementation logic into here
    const { id }= req.params;

    const bookmark = store.bookmarks.find(b => b.id === id);
  
    if(!bookmark){
      logger.error(`Bookmark with id ${id} not found`);
      return res  
        .status(404)
        .send('Bookmark Not Found')
    }
    
    res.json(bookmark);
  })

  .delete((req, res) => {
    // move implementation logic into here
    const { id } = req.params

    const bookmarkIndex = store.bookmarks.findIndex(b => b.id === id)

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found.`)
      return res
        .status(404)
        .send('Bookmark Not Found')
    }

    store.bookmarks.splice(bookmarkIndex, 1)

    logger.info(`Bookmark with id ${id} deleted.`)
    res
      .status(204)
      .end()
  })

module.exports = bookmarkRouter