'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('mongoose');
const notify = require('../mailer');
 
const Schema = mongoose.Schema;

const getTags = tags => tags.join(',');
const setTags = tags => tags.split(',');

/**
 * Article Schema
 */

const ArticleSchema = new Schema({
  title: { type : String, default : '', trim : true },
  body: { type : String, default : '', trim : true },
  user: { type : Schema.ObjectId, ref : 'User' },
  comments: [{
    body: { type : String, default : '' },
    user: { type : Schema.ObjectId, ref : 'User' },
    createdAt: { type : Date, default : Date.now }
  }],
  tags: { type: [], get: getTags, set: setTags }, 
  createdAt  : { type : Date, default : Date.now }
});

/**
 * Validations
 */

ArticleSchema.path('title').required(true, 'Article title cannot be blank');
ArticleSchema.path('body').required(true, 'Article body cannot be blank');

/**
 * Pre-remove hook
 */

ArticleSchema.pre('remove', function (next) { 
  next();
});

/**
 * Methods
 */

ArticleSchema.methods = {

  /**
   * Save article and upload image
   *
   * @param {Object} images
   * @api private
   */

  uploadAndSave: function () {
    const err = this.validateSync();
    if (err && err.toString()) throw new Error(err.toString());
    return this.save(); 
  },

  /**
   * Add comment
   *
   * @param {User} user
   * @param {Object} comment
   * @api private
   */

  addComment: function (user, comment) {
    this.comments.push({
      body: comment.body,
      user: user._id
    });

    if (!this.user.email) this.user.email = 'email@product.com';

    notify.comment({
      article: this,
      currentUser: user,
      comment: comment.body
    });

    return this.save();
  },

  /**
   * Remove comment
   *
   * @param {commentId} String
   * @api private
   */

  removeComment: function (commentId) {
    const index = this.comments
      .map(comment => comment.id)
      .indexOf(commentId);

    if (~index) this.comments.splice(index, 1);
    else throw new Error('Comment not found');
    return this.save();
  }
};

/**
 * Statics
 */

ArticleSchema.statics = {

  /**
   * Find article by id
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function (_id) {
    return this.findOne({ _id })
      .populate('user', 'name email username')
      .populate('comments.user')
      .exec();
  },

  /**
   * List articles
   *
   * @param {Object} options
   * @api private
   */

  list: function (options) {
    const criteria = options.criteria || {};
    const page = options.page || 0;
    const limit = options.limit || 30;
    return this.find(criteria)
      .populate('user', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * page)
      .exec();
  }
};

mongoose.model('Article', ArticleSchema);
