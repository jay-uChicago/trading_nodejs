var express = require('express');
var router = express.Router();
const path = require('path');
const querystring = require('querystring');
const _ = require('lodash');
const restClient = require('superagent-bluebird-promise');
const colors = require('colors');
const dateFormat = require('dateformat');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ####################
// Setup Configuration
// ####################

//your client_id provided to you during registration
var _clientId = process.env.DEMO_APP_CLIENT_ID;
//your x_api_key provided to you during registration
var _x_api_key = process.env.DEMO_APP_X_API_KEY;
//your clientSecret provided to you during registration
var _clientSecret = process.env.DEMO_APP_CLIENT_SECRET;
// redirect URL for your web application
var _redirectUrl = process.env.DEMO_APP_REDIRECT_URL;
// URLs for POEMS APIs
var _authApiUrl = process.env.DEMO_APP_AUTH_API_URL;
var _tokenApiUrl = process.env.DEMO_APP_TOKEN_API_URL;
var _todayOrderApiUrl = process.env.DEMO_APP_ORDER_API_URL;

/* GET home page. */
router.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname + '/../views/html/index.html'));
});

/* GET callback. recieve access code from authorize api after login */
router.get('/callback', function (req, res, next) {

  if (!_.isUndefined(req.query.code) && !_.isEmpty(req.query.code)) {

    console.log("access code: ".yellow + req.query.code.green);

    //Step 2. Call the Token API (with the authorization code). 
    //Step 2A. Uncomment the below lines
    
      callTokenAPI(req.query.code, false,
      function (data) {
        //token received successfully and store token in session cookie.
        var authenticated = setCookieSessionToken(req, data);

        JSDOM.fromFile(path.join(__dirname + '/../views/html/index.html'), {}).then(dom => {
          dom.window.document.getElementById('authenticated').value = (authenticated ? "true" : "false");
          req.originalUrl.split("?").shift()
          return res.send(dom.serialize());
          next
        });
      });
      

    //Step 2B. Comment out below line.
    //res.sendFile(path.join(__dirname + '/../views/html/index.html'));

  } else {
    res.send("You are not authorize to see this page.");
  }

});

// function for getting environment variables to the frontend
router.get('/getEnv', function (req, res, next) {

  if (_clientId == undefined || _clientId == null)
    res.jsonp({
      status: "ERROR",
      msg: "client_id not found"
    });
  else {
    res.jsonp({
      status: "OK",
      clientId: _clientId,
      redirectUrl: _redirectUrl,
      authApiUrl: _authApiUrl
    });
  }

});

//to prepare request for access TOKEN API
function prepareRequestForAccessToken(code) {
  var cacheCtl = "no-cache";
  var contentType = "application/x-www-form-urlencoded";
  var result;
  // assemble params for Token API
  var strParams = "grant_type=authorization_code" +
    "&code=" + code +
    "&redirect_uri=" + _redirectUrl +
    "&client_id=" + _clientId +
    "&client_secret=" + _clientSecret;

  var params = querystring.parse(strParams);

  // assemble headers for Token API
  var strHeaders = "Content-Type=" + contentType + "&Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  console.log("Request Header for Token API:".yellow);
  console.log(JSON.stringify(headers));
  result = {
    params: params,
    headers: headers
  }
  return result;
}

//to prepare request for refresh TOKEN API
function prepareRequestForRefreshToken(refreshToken) {
  var cacheCtl = "no-cache";
  var contentType = "application/x-www-form-urlencoded";
  var result;
  // assemble params for Token API
  var strParams = "grant_type=refresh_token" +
    "&client_id=" + _clientId +
    "&refresh_token=" + refreshToken;

  var params = querystring.parse(strParams);

  // assemble headers for Token API
  var strHeaders = "Content-Type=" + contentType + "&Cache-Control=" + cacheCtl;
  var headers = querystring.parse(strHeaders);

  console.log("Request Header for Token API:".yellow);
  console.log(JSON.stringify(headers));

  result = {
    params: params,
    headers: headers
  }
  return result;
}

// function to set cookie session token
function setCookieSessionToken(req, tokenResult) {
  var authenticated = false;
  if (tokenResult.jwtToken == undefined || tokenResult.jwtToken == null) {
    req.session.token = null;
  } else {
    req.session.token = tokenResult;
    authenticated = true;
  }
  return authenticated;
}

// function to request for TOKEN API
function callTokenAPI(tokenParam, isRefresh, callback) {

  var headers;
  var params;
  var requestHeadersAndParams;

  if (isRefresh) {
    requestHeadersAndParams = prepareRequestForRefreshToken(tokenParam);
  } else {
    requestHeadersAndParams = prepareRequestForAccessToken(tokenParam);
  }

  headers = requestHeadersAndParams.headers;
  params = requestHeadersAndParams.params;

  var request = restClient.post(_tokenApiUrl);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers))
    request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params))
    request.send(params);
  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers))
    request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params))
    request.send(params);

  request
    .buffer(true)
    .end(function (callErr, callRes) {
      if (callErr) {
        // ERROR
        result = {
          status: "ERROR",
          msg: callErr
        };
      } else {
        // SUCCESSFUL
        var data = {
          body: callRes.body,
          text: callRes.text
        };
        console.log("Response from Token API:".yellow);
        console.log(JSON.stringify(data.body));
        var jwtToken = data.body;
        if (jwtToken == undefined || jwtToken == null) {
          result = {
            status: "ERROR",
            msg: "JWT TOKEN NOT FOUND"
          };
        }
        else if (jwtToken.error) {
          result = {
            status: jwtToken.error,
            msg: jwtToken.error_description
          };
        }
        else {
          //SET JWT TOKEN EXPIRES TIME
          var dt = new Date();
          dt = new Date(dt.getTime() + (1000 * (jwtToken.expires_in - 5)));

          result = {
            jwtToken: jwtToken,
            expires_time: dt
          };
        }

      }
      callback(result);
    });

}

// function for frontend to call today orders api
router.get('/getTodayOrders', function (req, res, next) {

  if (_.isUndefined(req.session.token) || _.isEmpty(req.session.token)) {

    return res.jsonp({
      status: "UNAUTHORIZED",
      msg: "You do not have permission to access the function!"
    });

  }
  var sessionToken = req.session.token;
  console.log("access_token:".yellow);
  console.log(sessionToken.jwtToken.access_token);
  console.log("refresh_token:".yellow);
  console.log(sessionToken.jwtToken.refresh_token);
  console.log("expires_time:".yellow);
  console.log(dateFormat(sessionToken.expires_time, "yyyy-mm-dd h:MM:ss"));
  console.log("sessionId:".yellow);
  console.log(sessionToken.jwtToken.sessionId);
  //CHECK TOKEN EXPIRE 
  if (new Date().getTime() < new Date(sessionToken.expires_time).getTime()) {

    //Step 3. Call the POEMS API (with the access token). Remove the commentted line below    

    
    callTodayOrdersAPI(sessionToken.jwtToken.access_token,
      function (data) {
        if (data.code == 1) {
          return res.jsonp({
            status: "OK",
            msg: data
          });
        } else {
          return res.jsonp({
            status: "UNAUTHORIZED",
            msg: data.msg
          });
        }
      }
    );
    

  }

  //token expired and request for new token
  else {

    callTokenAPI(sessionToken.jwtToken.refresh_token, true,
      function (data) {
        //token received successfully and store token in session cookie.
        var authenticated = setCookieSessionToken(req, data);
        if (authenticated) {
          callTodayOrdersAPI(sessionToken.jwtToken.access_token,
            function (data) {
              if (data.code == 1) {
                return res.jsonp({
                  status: "OK",
                  msg: data
                });
              } else {
                return res.jsonp({
                  status: "UNAUTHORIZED",
                  msg: data.msg
                });
              }
            }
          );
        } else {
          return res.jsonp({
            status: "UNAUTHORIZED",
            msg: "You do not have permission to access the function!"
          });
        }
      });
  }

});

//function to call orders api
function callTodayOrdersAPI(accessToken, callback) {

  var result;
  // assemble params for orders API
  var strParams = "osVersion=1" +
    "&language=1";
  var params = querystring.parse(strParams);

  // assemble headers for orders API
  var strHeaders = "x-api-key=" + _x_api_key;
  var headers = querystring.parse(strHeaders);
  _.set(headers, "Authorization", "Bearer " + accessToken);

  console.log("Request Header for Order API:".yellow);
  console.log(JSON.stringify(headers));

  var request = restClient.get(_todayOrderApiUrl);

  // Set headers
  if (!_.isUndefined(headers) && !_.isEmpty(headers))
    request.set(headers);

  // Set Params
  if (!_.isUndefined(params) && !_.isEmpty(params))
    request.query(params);

  request
    .buffer(true)
    .end(function (callErr, callRes) {
      if (callErr) {
        // ERROR
        result = {
          status: "ERROR",
          msg: callErr
        };
      } else {
        // SUCCESSFUL
        var data = {
          body: callRes.body,
          text: callRes.text
        };
        console.log("Response from Order API:".yellow);
        console.log(JSON.stringify(data.body));
        var orders = data.body;
        if (orders == undefined || orders == null) {
          result = {
            status: "ERROR",
            msg: "ERROR CALLING ORDERS API"
          };
        }

        result = orders;
      }
      callback(result);
    });
}

module.exports = router;
