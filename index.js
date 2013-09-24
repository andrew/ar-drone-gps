var arDrone  = require('ar-drone');
var PID      = require('./PID');
var vincenty = require('node-vincenty');

var yawPID = new PID(1.0, 0, 0.30);
var client = arDrone.createClient();

client.config('general:navdata_demo', 'FALSE');

client.takeoff()

var targetLat, targetLon, targetYaw, cyaw;

setTimeout(function(){
  // end of garden: 51.392059 -2.3224394
  targetLat = 51.392059
  targetLon = -2.3224394
}, 6000)

var handleNavData = function(data){
  if ( data.demo == null) return;

  var currentLat = data.gps.latitude
  var currentLon = data.gps.longitude
  console.log('lat/lon:', currentLat, currentLon);

  var currentYaw = data.demo.rotation.yaw;

  if (targetLat == null || targetLon == null || currentYaw ==  null || currentLat == null || currentLon == null) return;

  var bearing = vincenty.distVincenty(currentLat, currentLon, targetLat, targetLon)

  if(bearing.distance > 1){
    console.log('distance', bearing.distance)
    console.log('bearing:', bearing.initialBearing)
    targetYaw = bearing.initialBearing

    console.log('currentYaw:', currentYaw);
    var eyaw = targetYaw - currentYaw;
    console.log('eyaw:', eyaw);

    var uyaw = yawPID.getCommand(eyaw);
    console.log('uyaw:', uyaw);

    var cyaw = within(uyaw, -1, 1);
    console.log('cyaw:', cyaw);

    client.clockwise(cyaw)
    client.front(0.05)
  } else {
    targetYaw = null
    client.stop()
    console.log('Reached ', targetLat, targetLon)
  }
}

client.on('navdata', handleNavData);

function within(x, min, max) {
  if (x < min) {
      return min;
  } else if (x > max) {
      return max;
  } else {
      return x;
  }
}

