require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const winston = require('winston');
const { v4: uuid } = require('uuid');
const { isWebUri } = require('valid-url')



const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use(express.json());



app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN
  const authToken = req.get('Authorization')

  if (!authToken || authToken.split(' ')[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized request' })
  }
  // move to the next middleware
  next()
})


const bookmarks = [
  { id: uuid(),
    title: 'Thinkful',
    url: 'https://www.thinkful.com',
    description: 'Think outside the classroom',
    rating: 5 },
  { id: uuid(),
    title: 'Google',
    url: 'https://www.google.com',
    description: 'Where we find everything else',
    rating: 4 },
  { id: uuid(),
    title: 'MDN',
    url: 'https://developer.mozilla.org',
    description: 'The only place to find web documentation',
    rating: 5 },
]

app.get('/bookmarks', (req, res) => {
  res.json(bookmarks)
})


app.get('/bookmarks/:id', (req,res) => {
  const { id }= req.params;

  const bookmark = bookmarks.find(b => b.id== id);

  if(!bookmark){
    logger.error(`Bookmark with id ${id} not found`);
    return res  
      .status(404)
      .send('Bookmark Not Found')
  }
  
  res.json(bookmark);
})



app.post('/bookmarks', (req,res) => {
  const { title, description, URL, rating} = req.body;


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

  if(!isWebUri(URL)){
    logger.error(`URL Required`)
    return res
    .status(400)
      .send('Invalid URL')
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
    URL,
    rating,
  };

  bookmarks.push(bookmark);

  logger.info(`Bookmark with id ${id} created`)
  res
    .status(201)
    .location(`http://localhost:8000/bookmarks/${id}`)
    .json(bookmark)

})



app.delete('/bookmarks/:id', (req,res) => {
  const { id } = req.params

  const bookmarkIndex = bookmarks.findIndex(b => b.id === id)

  if (bookmarkIndex === -1) {
    logger.error(`Bookmark with id ${id} not found.`)
    return res
      .status(404)
      .send('Bookmark Not Found')
  }

  bookmarks.splice(bookmarkIndex, 1)

  logger.info(`Bookmark with id ${id} deleted.`)
  res
    .status(204)
    .end()

})

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'info.log' })
  ]
});

if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}



app.use(function errorHandler(error, req, res, next) {
   let response
   if (NODE_ENV === 'production') {
     response = { error: { message: 'server error' } }
   } else {
     console.error(error)
     response = { message: error.message, error }
   }
   res.status(500).json(response)
})

module.exports = app