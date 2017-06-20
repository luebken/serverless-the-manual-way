'use strict';

module.exports.handler = (event, context, callback) => {
  console.log('Event: ', event)
  console.log('Context: ', context)
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'helloworld again and again',
      input: event,
    }),
  };

  callback(null, response);
};
