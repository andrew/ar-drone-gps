var arDrone  = require('ar-drone');
var PID      = require('./PID');
var vincenty = require('node-vincenty');

var yawPID = new PID(1.0, 0, 0.30);
var client = arDrone.createClient();

client.config('general:navdata_demo', 'FALSE');

function within(x, min, max) {
  if (x < min) {
      return min;
  } else if (x > max) {
      return max;
  } else {
      return x;
  }
}

// client.takeoff()

function gpsNavigator(client){
  this.targetLat = null;
  this.targetLon = null;
  this.targetYaw = null;
  this.callback = null;

  this.client = client;

  this.waypoint = function(lat, lon, cb){
    this.targetLat = lat
    this.targetLon = lon
    this.callback = cb
  }

  this.handleNavData = function(data){
    if (data.demo == null) return;

    var currentLat = data.gps.latitude
    var currentLon = data.gps.longitude
    console.log('lat/lon:', currentLat, currentLon);

    var currentYaw = data.demo.rotation.yaw;

    if (targetLat == null || targetLon == null || currentYaw ==  null || currentLat == null || currentLon == null) return;

    var bearing = vincenty.distVincenty(currentLat, currentLon, targetLat, targetLon)

    if(bearing.distance > 0.5){
      console.log('distance', bearing.distance)
      console.log('bearing:', bearing.initialBearing)
      this.targetYaw = bearing.initialBearing

      console.log('currentYaw:', currentYaw);
      var eyaw = targetYaw - currentYaw;
      console.log('eyaw:', eyaw);

      var uyaw = yawPID.getCommand(eyaw);
      console.log('uyaw:', uyaw);

      var cyaw = within(uyaw, -1, 1);
      console.log('cyaw:', cyaw);

      this.client.clockwise(cyaw)
      this.client.front(0.2)
    } else {
      this.targetYaw = null
      this.targetLat = null;
      this.targetLon = null;
      this.client.stop()
      this.callback()
      console.log('Reached ', targetLat, targetLon)
    }
  }
  this.client.on('navdata', this.handleNavData);
}

var gps = new gpsNavigator(client)

gps.waypoint(51.392059, -2.3224394, function(){
  console.log('done!')
})



client.on('navdata', handleNavData);

