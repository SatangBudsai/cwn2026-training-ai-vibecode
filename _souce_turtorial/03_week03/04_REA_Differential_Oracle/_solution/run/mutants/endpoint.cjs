// Harness configuration only: override the differential runner's fixed v3 baseURL.
const {chromium}=require('playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=async (...args)=>{
 const browser=await launch(...args);
 const newContext=browser.newContext.bind(browser);
 browser.newContext=(options={})=>newContext({...options,...(options.baseURL==='http://localhost:5083'?{baseURL:'http://localhost:5090'}:{})});
 return browser;
};
