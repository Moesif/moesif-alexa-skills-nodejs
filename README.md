# Moesif AWS Alexa Skills Middleware

[![NPM](https://nodei.co/npm/moesif-alexa-skills-nodejs.png?compact=true&stars=true)](https://nodei.co/npm/moesif-alexa-skills/)

[![Built][ico-built-for]][link-built-for]
[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

Alexa Skills Middleware (NodeJS) to automatically log _incoming_ requests/responses from AWS Lambda functions
and send to Moesif for debugging and API analytics. Designed for AWS Lambda functions that use the Alexa Skills Kit as a trigger.


This middleware expects the
[Alexa skills format.](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/alexa-skills-kit-interface-reference)

[Source Code on GitHub](https://github.com/moesif/moesif-alexa-skills-nodejs)

[Package on NPMJS](https://www.npmjs.com/package/moesif-alexa-skills)


## How to install

```shell
npm install --save moesif-alexa-skills
```

## How to use

The following shows how import Moesif and use:

### 1. Import the module:


```javascript
// Import Modules
'use strict'
const moesif = require('moesif-alexa-skills');

const moesifOptions = {
    applicationId: 'Your Moesif application_id',
};

exports.handler = function (event, context, callback) {
    callback(null, {
        statusCode: '200',
        body: JSON.stringify({key: 'hello world'}),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

exports.handler = moesif(moesifOptions, exports.handler);


```

### 2. Enter Moesif Application Id.
You can find your Application Id from [_Moesif Dashboard_](https://www.moesif.com/) -> _Top Right Menu_ -> _App Setup_

## Repo file structure

- `lib/index.js` the middleware lib
- `index.js` sample AWS Lambda function using the middleware


## Configuration options


#### __`identifyUser`__

Type: `(event, context) => String`
identifyUser is a function that takes AWS lambda `event` and `context` objects as arguments
and returns a userId. This helps us attribute requests to unique users.
By default, Moesif will use `event.session.user.userId`


```javascript
options.identifyUser = function (event, context) {
  // your code here, must return a string
  return event.requestContext.identity.cognitoIdentityId
}
```

#### __`getSessionToken`__

Type: `(event, context) => String`
getSessionToken a function that takes AWS lambda `event` and `context` objects as arguments and returns a
session token (i.e. such as an API key). By default, Moesif will use `event.session.sessionId`


```javascript
options.getSessionToken = function (event, context) {
  // your code here, must return a string.
  return event.headers['Authorization'];
}
```

#### __`getTags`__

Type: `(event, context) => String`
getTags is a function that takes AWS lambda `event` and `context` objects as arguments and returns a comma-separated string containing a list of tags.
See Moesif documentation for full list of tags.


```javascript
options.getTags = function (event, context) {
  // your code here. must return a comma-separated string.
  if (event.path.startsWith('/users') && event.httpMethod == 'GET'){
    return 'user'
  }
  return 'random_tag_1, random_tag2'
}
```

#### __`getApiVersion`__

Type: `(event, context) => String`
getApiVersion is a function that takes AWS lambda `event` and `context` objects as arguments and
returns a string to tag requests with a specific version of your API.
By default, Moesif will use `event.version`


```javascript
options.getApiVersion = function (event, context) {
  // your code here. must return a string.
  return '1.0.5'
}
```

#### __`skip`__

Type: `(event, context) => Boolean`
skip is a function that takes AWS lambda `event` and `context` objects as arguments and returns true
if the event should be skipped (i.e. not logged)
<br/>_The default is shown below and skips requests to the root path "/"._


```javascript
options.skip = function (event, context) {
  // your code here. must return a boolean.
  if (event.path === '/') {
    // Skip probes to home page.
    return true;
  }
  return false
}
```

#### __`maskContent`__

Type: `MoesifEventModel => MoesifEventModel`
maskContent is a function that takes the final Moesif event model (rather than the AWS lambda event/context objects) as an
argument before being sent to Moesif. With maskContent, you can make modifications to headers or body such as
removing certain header or body fields.


```javascript
options.maskContent = function(moesifEvent) {
  // remove any field that you don't want to be sent to Moesif.
  return moesifEvent;
}
 ```


### updateUser method

A method is attached to the moesif middleware object to update the users profile or metadata.


```javascript
'use strict'
const moesif = require('moesif-alexa-skills');

const moesifOptions = {
    applicationId: 'Your Moesif application_id',

};
var moesifMiddleware = moesif(options);
var user = {
  userId: 'your user id',  // required.
  metadata: {
    email: 'user@email.com',
    name: 'George'
  }
}

moesifMiddleware.updateUser(user, callback);

```

The metadata field can be any custom data you want to set on the user.
The userId field is required.


## Other integrations

To view more more documentation on integration options, please visit __[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).__

[ico-built-for]: https://img.shields.io/badge/built%20for-aws%20alexa%20skills-blue.svg
[ico-license]: https://img.shields.io/badge/License-Apache%202.0-green.svg
[ico-source]: https://img.shields.io/github/last-commit/moesif/moesif-alexa-skills-nodejs.svg?style=social

[link-built-for]: https://aws.amazon.com/lambda/
[link-license]: https://raw.githubusercontent.com/Moesif/moesif-alexa-skills-nodejs/master/LICENSE
[link-source]: https://github.com/moesif/moesif-alexa-skills-nodejs
