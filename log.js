var arDrone  = require('ar-drone');
var client = arDrone.createClient();

client.config('general:navdata_demo', 'FALSE');

setInterval(function(){
  client.once('navdata', function(data){
    var currentLat = data.gps.latitude
    var currentLon = data.gps.longitude
    console.log('lat/lon:', currentLat, currentLon);
    console.log('battery', data.demo.batteryPercentage)
  });
}, 1000)

