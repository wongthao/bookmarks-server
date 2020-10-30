

const BookmarksService = {
    //like the 3 option we are passing the knex instance as an argument
    getAllBookmarks(knex) {
          return knex.select('*').from('bookmarks_table')
    },
    insertArticle(knex, newArticle) {
         return knex
           .insert(newArticle)
           .into('bookmarks_table')
           .returning('*')
           .then(rows => {
                return rows[0]
           })
    },
    getById(knex, id) {
          return knex.from('bookmarks_table').select('*').where('id', id).first()
     },

     
     // the delete method uses the knex instance to access the blogful_articles database.(which has the 3 articles) Then it finds where the id is located and deletes it. 
    deleteArticle(knex, id) {
       return knex('bookmarks_table')
         .where({ id })
         .delete()
    }, 


    updateArticle(knex, id, newArticleFields) {
            return knex('bookmarks_table')
              .where({ id })
              .update(newArticleFields)
    },
}

module.exports = BookmarksService

