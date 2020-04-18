const request = require('request');
const FeedParser = require('feedparser');
const Site = require('../data/Site');
const Article = require('../data/Article');
const Util = require('../util');

module.exports = function (feedUrl) {
    return new Promise((resolve, reject) => {
        Util.log('start feed: ', feedUrl);
        const req = request(feedUrl);
        const parser = new FeedParser({});
        req.on('error', reject);
        req.on('response', function (res) {
            // `this` is `req`, which is a stream
            const stream = this;
            if (res.statusCode !== 200) {
                this.emit('error', new Error('Bad status code'));
            } else {
                stream.pipe(parser);
            }
        });
        parser.on('error', reject);
        parser.on('readable', function () {
            const stream = this;
            if (!this.items) {
                this.items = [];
            }
            let article;
            while (article = stream.read()) {
                Util.log('read one feed article');
                this.items.push(new Article({
                    feedUrl: feedUrl,
                    guid: article.guid,
                    title: Util.htmlDeCode(article.title),
                    author: article.author,
                    summary: Util.htmlDeCode(article.summary),
                    image: Util.getImgUrl(article.description),
                    content: Util.htmlDeCode(article.description),
                    link: article.link,
                    commentLink: article.comments,
                    pubDate: article.pubDate,
                }));
            }
        });
        parser.on('finish', function () {
            Util.log('feed finish');
            resolve({
                site: new Site({
                    feedUrl: feedUrl,
                    siteName: this.meta.title,
                    siteUrl: this.meta.link,
                    description: this.meta.description,
                    pubDate: this.meta.date,
                }),
                articles: this.items,
            });
        });
    });
}
