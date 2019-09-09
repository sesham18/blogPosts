const chai = require("chai");
const chaiHttp = require("chai-http");

const { app, runServer, closeServer } = require("../server");

// this lets us use *expect* style syntax in our tests
// so we can do things like `expect(1 + 1).to.equal(2);`
// http://chaijs.com/api/bdd/
const expect = chai.expect;

// This let's us make HTTP requests
// in our tests.
// see: https://github.com/chaijs/chai-http
chai.use(chaiHttp);

describe("BlogPosts", function() {
  // Before our tests run, we activate the server. Our `runServer`
  // function returns a promise, and we return the that promise by
  // doing `return runServer`. If we didn't return a promise here,
  // there's a possibility of a race condition where our tests start
  // running before our server has started.
  before(function() {
    return runServer();
  });

  // although we only have one test module at the moment, we'll
  // close our server at the end of these tests. Otherwise,
  // if we add another test module that also has a `before` block
  // that starts our server, it will cause an error because the
  // server would still be running from the previous tests.
  after(function() {
    return closeServer();
  });

  it("should list items on GET", function() {
    return chai
      .request(app)
      .get("/blog-posts")
      .then(function(res) {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a("array");
        expect(res.body.length).to.be.above(0);
        // each item should be an object with key/value pairs
        // for `id`, `name` and `checked`.
        const expectedKeys = ["id", "title", "author", "content", "publishDate"];
        res.body.forEach(function(item) {
          expect(item).to.be.a("object");
          expect(item).to.include.keys(expectedKeys);
        });
      });
  });

  it("should add an item on POST", function() {
    const newItem = { 
        title: "coffee", 
        content: "life is good",
        author: "po",
        publishDate: "10/10/2010"
     };
    return chai
      .request(app)
      .post("/blog-posts")
      .send(newItem)
      .then(function(res) {
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(res.body).to.be.a("object");
        expect(res.body).to.include.keys("id", "title", "author", "content", "publishDate");
      });
  });

  it("should update items on PUT", function() {
    // we initialize our updateData here and then after the initial
    // request to the app, we update it with an `id` property so
    // we can make a second, PUT call to the app.
    const updateData = {
      title: "foo",
      author: "poo", 
      content: "living there", 
      publishDate: "10/10/2001"
    };

    return (
      chai
        .request(app)
        // first have to get so we have an idea of object to update
        .get("/blog-posts")
        .then(function(res) {
          updateData.id = res.body[0].id;
          // this will return a promise whose value will be the response
          // object, which we can inspect in the next `then` block. Note
          // that we could have used a nested callback here instead of
          // returning a promise and chaining with `then`, but we find
          // this approach cleaner and easier to read and reason about.
          return chai
            .request(app)
            .put(`/blog-posts/${updateData.id}`)
            .send(updateData);
        })
        // prove that the PUT request has right status code
        // and returns updated item
        .then(function(res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.deep.equal(updateData);
        })
    );
  });

  // test strategy:
  //  1. GET shopping list items so we can get ID of one
  //  to delete.
  //  2. DELETE an item and ensure we get back a status 204
  it("should delete items on DELETE", function() {
    return (
      chai
        .request(app)
        // first have to get so we have an `id` of item
        // to delete
        .get("/blog-posts")
        .then(function(res) {
          return chai.request(app).delete(`/blog-posts/${res.body[0].id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(200);
        })
    );
  });
});
