@ECHO off
rem your client_id provided to you during registration
set DEMO_APP_CLIENT_ID=POEMS-DEMO
rem your clientSecret provided to you during registration
set DEMO_APP_CLIENT_SECRET=87F8D5C4-5CE9-4C12-A0CD-0A876CDF3ACE
rem your x_api_key provided to you during registration
set DEMO_APP_X_API_KEY=B8A6F3CF-93FA-4116-8424-31E4DFEC10EB

rem Gateway login URL
set DEMO_APP_AUTH_API_URL=https://sandboxapi.poems.com.sg/api-gateway/pspl/auth/1.0/oauth/authorize
rem your callback URL, Gateway server will send authorization code from URL
set DEMO_APP_REDIRECT_URL=http://localhost:3000/callback
rem Gateway TOKEN URL
set DEMO_APP_TOKEN_API_URL=https://sandboxapi.poems.com.sg/api-gateway/pspl/auth/1.0/oauth/token
rem Gateway POEMS API URL
set DEMO_APP_ORDER_API_URL=https://sandboxapi.poems.com.sg/api-gateway/pspl/mobile2/1.0/global/order/today

npm start
