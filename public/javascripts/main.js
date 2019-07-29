ws = new WebSocket("ws://" + location.host + "/ws");

ws.onopen = function(event) {
  var query = {start: "2017-04-01 00:00:00", end: "2017-04-02 00:00:00"};
  query["x0"] = -119.179454;
  query["y0"] = 33.696668;
  query["x1"] = -117.363078;
  query["y1"] = 34.814300;
  ws.send(JSON.stringify(query));
};

ws.onmessage = function(event) {
  console.log("Response from server:");
  console.log(event.data);
};
