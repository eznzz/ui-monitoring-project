module.exports = {
 use: {browserName:'chromium',headless:true,viewport:{width:1440,height:900},trace:'retain-on-failure',screenshot:'only-on-failure'},
 timeout:30000,
 retries:0,
 workers:1
};