/**
 * Created by derric on 8/24/17.
 */
'use strict'
var _ = require('lodash');
var moesifapi = require('moesifapi');
var EventModel = moesifapi.EventModel;
var logData = {};
logData.request = {};
logData.response = {};
logData.request.time = Date.now();

//
// ### function moesifExpress(options)
// #### @options {Object} options to initialize the middleware.
//

var logMessage = function(debug, functionName, message) {
  if (debug) {
    console.log('MOESIF: [' + functionName + '] ' + message);
  }
};

module.exports = function (options, handler) {

  logMessage(options.debug, 'moesifInitiator', 'start');

  options.applicationId = options.applicationId || process.env.MOESIF_APPLICATION_ID;

  options.identifyUser = options.identifyUser || function (event, context) {
      return (event.session && event.session.user && event.session.user.userId) ||
          (event.context && event.context.system && event.context.system.user && event.context.system.user.userId);
    };
  options.getSessionToken = options.getSessionToken || function (event, context) {
      return event.session && event.session.sessionId;
    };
  options.getTags = options.getTags || function () {
      return undefined;
    };
  options.getApiVersion = options.getApiVersion || function (event, context) {
      return event.version;
    };
  options.maskContent = options.maskContent || function (eventData) {
      return eventData;
    };
  options.ignoreRoute = options.ignoreRoute || function () {
      return false;
    };
  options.skip = options.skip || function () {
      return false;
    };

  ensureValidOptions(options);

  // config moesifapi
  var config = moesifapi.configuration;
  config.ApplicationId = options.applicationId || process.env.MOESIF_APPLICATION_ID;
  var moesifController = moesifapi.ApiController;

  var moesifMiddleware = function (event, context, callback) {
    logMessage(options.debug, 'moesifMiddleware', 'start');

      var next = function (err, result) {
          logEvent(event, context, err, result, options, moesifController);
          callback(err, result)
      };

      handler(event, context, next);
  };

  moesifMiddleware.updateUser = function (userModel, cb) {
    logMessage(options.debug, 'updateUser', 'userModel=' + JSON.stringify(userModel));
    ensureValidUserModel(userModel);
    logMessage(options.debug, 'updateUser', 'userModel valid');
    moesifController.updateUser(userModel, cb);
  };

  logMessage(options.debug, 'moesifInitiator', 'returning moesifMiddleware Function');
  return moesifMiddleware;
};

function mapResponseHeaders(event, context, result) {
    const headers = result.headers || {}; // NOTE: Mutating event.headers; prefer deep clone of event.headers

    headers['x-amzn-trace-id'] = context.awsRequestId;
    headers['x-amzn-function-name'] = context.functionName;
    return headers;
}

function logEvent(event, context, err, result, options, moesifController) {

  logData.request.uri = context.invokedFunctionArn || '/';
  logData.request.verb = 'POST';
  logData.request.apiVerion = options.getApiVersion(event, context);
  logData.request.headers = event.header || {};
  logData.request.body = event;

  logMessage(options.debug, 'logEvent', 'created request: \n' + JSON.stringify(logData.request));
  var safeRes = result || {};
  logData.response.time = Date.now();
  logData.response.status = 200;
  logData.response.headers = mapResponseHeaders(event, context, safeRes);
  logData.response.body = safeRes;

  logMessage(options.debug, 'logEvent', 'created data: \n' + JSON.stringify(logData));

  logData = options.maskContent(logData);

  logData.userId = options.identifyUser(event, context);
  logData.sessionToken = options.getSessionToken(event, context);
  logData.tags = options.getTags(event, context);

  logMessage(options.debug, 'logEvent', 'applied options to data: \n' + JSON.stringify(logData));

  ensureValidLogData(logData);

  // This is fire and forget, we don't want logging to hold up the request so don't wait for the callback
  if (!options.skip(event, context)) {
    logMessage(options.debug, 'logEvent', 'sending data invoking moesifAPI');

    moesifController.createEvent(new EventModel(logData), function(err) {
      if (err) {
        logMessage(options.debug, 'logEvent', 'Moesif API failed with err=' + JSON.stringify(err));
        if (options.callback) {
          options.callback(err, logData);
        }
      } else {
        logMessage(options.debug, 'logEvent', 'Moesif API succeeded');
        if(options.callback) {
          options.callback(null, logData);
        }
      }
    });
  }
}

function bodyToBase64(body) {
  if(!body) {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString('base64');
  } else if (typeof body === 'string') {
    return Buffer.from(body).toString('base64');
  } else if (typeof body.toString === 'function') {
    return Buffer.from(body.toString()).toString('base64');
  } else {
    return '';
  }
}

function ensureValidOptions(options) {
  if (!options) throw new Error('options are required by moesif-express middleware');
  if (!options.applicationId) throw new Error('A Moesif application id is required. Please obtain it through your settings at www.moesif.com');
  if (options.identifyUser && !_.isFunction(options.identifyUser)) {
    throw new Error('identifyUser should be a function');
  }
  if (options.getSessionToken && !_.isFunction(options.getSessionToken)) {
    throw new Error('getSessionToken should be a function');
  }
  if (options.getTags && !_.isFunction(options.getTags)) {
    throw new Error('getTags should be a function');
  }
  if (options.getApiVersion && !_.isFunction(options.getApiVersion)) {
    throw new Error('identifyUser should be a function');
  }
  if (options.maskContent && !_.isFunction(options.maskContent)) {
    throw new Error('maskContent should be a function');
  }
  if (options.skip && !_.isFunction(options.skip)) {
    throw new Error('skip should be a function');
  }
}

function ensureValidLogData(logData) {
  if (!logData.request) {
    throw new Error('For Moesif events, request and response objects are required. Please check your maskContent function do not remove this');
  }
  else {
    if (!logData.request.time) {
      throw new Error('For Moesif events, request time is required. Please check your maskContent function do not remove this');
    }
    if (!logData.request.verb) {
      throw new Error('For Moesif events, request verb is required. Please check your maskContent function do not remove this');
    }
    if (!logData.request.uri) {
      throw new Error('For Moesif events, request uri is required. Please check your maskContent function do not remove this');
    }
  }
  if (!logData.response) {
    throw new Error('For Moesif events, request and response objects are required. Please check your maskContent function do not remove this');
  }
  else {
    // if (!logData.response.body) {
    //   throw new Error('for log events, response body objects is required but can be empty object');
    // }
    if (!logData.request.time) {
      throw new Error('For Moesif events, response time is required. The middleware should populate it automatically. Please check your maskContent function do not remove this');
    }
  }
}

function ensureValidUserModel(userModel) {
  if (!userModel.userId) {
    throw new Error('To update user, a userId field is required');
  }
}
