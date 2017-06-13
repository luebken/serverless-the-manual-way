'use strict';

module.exports.helloWorld = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'helloworld',
      input: event,
    }),
  };

  callback(null, response);
};
