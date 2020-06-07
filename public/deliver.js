const socket = io.connect();
let map, datasource, client, popup, resultsPanel, centerMapOnResults, routeURL;


createMap();

//Lines taken and edited from Azure Maps API Documentation, function createMap, popup, and map ready event.
function createMap() {
    map = new atlas.Map('myMap', {
        center: [-118.270293, 34.039737],
        zoom: 8,
        view: 'Auto',
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: 'JaUXlUCKJRUn7x0r3vg2wBL71ObmwyWkPb8e1ZIYqio'
        }
    });
    map.map._canvas.style.position = "relative"
    popup = new atlas.Popup();
    map.events.add('ready', function () {
        map.controls.add(new atlas.control.ZoomControl(), {
            position: 'top-right'
        });
        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);
    });
    let subscriptionKeyCredential = new atlas.service.SubscriptionKeyCredential(atlas.getSubscriptionKey());
    let pipeline = atlas.service.MapsURL.newPipeline(subscriptionKeyCredential);
    routeURL = new atlas.service.RouteURL(pipeline);
}

function showPopup(shape) {
    let properties = shape.getProperties();
    let html = ['<div class="poi-box">'];
    html.push('<div class="poi-title-box"><b>');
    if (properties.poi && properties.poi.name) {
        html.push(properties.poi.name);
    } else {
        html.push(properties.address.freeformAddress);
    }
    html.push('</b></div>');
    html.push('<div class="poi-content-box">');
    html.push('<div class="info location">', properties.address.freeformAddress, '</div>');
    if (properties.poi) {
        if (properties.poi.phone) {
            html.push('<div class="info phone">', properties.phone, '</div>');
        }
        if (properties.poi.url) {
            html.push('<div><a class="info website" href="http://', properties.poi.url, '">http://', properties.poi.url, '</a></div>');
        }
    }
    html.push('</div></div>');
    popup.setOptions({
        position: shape.getCoordinates(),
        content: html.join('')
    });
    popup.open(map);
}

map.events.add('ready', function () {
    map.setTraffic({
        flow: "relative"
    });
    map.layers.add(new atlas.layer.LineLayer(datasource, null, {
        strokeColor: '#2272B9',
        strokeWidth: 5,
        lineJoin: 'round',
        lineCap: 'round'
    }), 'labels');

    map.layers.add(new atlas.layer.SymbolLayer(datasource, null, {
        iconOptions: {
            image: ['get', 'icon'],
            allowOverlap: true
        },
        textOptions: {
            textField: ['get', 'title'],
            offset: [0, 1.2]
        },
        filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']] //Only render Point or MultiPoints in this layer.
    }));


});

function createRoute(plc) {
    let points = [];
    let coordinates = [];
    for (let i = 0; i < plc.length; i++) {
        coordinates.push([plc[i].coordinates[0], plc[i].coordinates[1]]);
        points.push(new atlas.data.Feature(new atlas.data.Point([plc[i].coordinates[0], plc[i].coordinates[1]]), {
            title: plc[i].name,
            icon: "pin-blue"
        }))
    }

    //Add the data to the data source.
    datasource.add(points);

    map.setCamera({
        bounds: atlas.data.BoundingBox.fromData(points),
        padding: 80
    });
    //Make a search route request
    routeURL.calculateRouteDirections(atlas.service.Aborter.timeout(10000), coordinates).then((directions) => {
        //Get data features from response

        let data = directions.geojson.getFeatures();
        datasource.add(data);
        if (directions.geojson.response != null) {
            let totalLength = 0;
            let totalEta = 0;
            directions.geojson.response.routes[0].legs.forEach(x => {
                totalLength += x.summary.lengthInMeters;
                totalEta += x.summary.travelTimeInSeconds;
            });

        } else {
            return false;
        }
    });


}

const reqList = document.querySelector('#reqList');
let loop = setInterval(() => {
    socket.emit('deliverRequest');
}, 3000);

socket.on('deliverResponse', (data) => {
    while (reqList.hasChildNodes()) {
        reqList.removeChild(reqList.firstChild);
    }
    console.log(data);
    data.forEach(x => {
        let { places, travelInfo, uniVal } = x;
        let tempLi = document.createElement('li');
        tempLi.textContent = `Final Destination: ${places[places.length - 1].freeformAddress} Time: ${travelInfo.time}, Distance: ${travelInfo.dist}, PRice: ${travelInfo.price}`;
        reqList.appendChild(tempLi)
        tempLi.addEventListener('click', () => { createRoute(places) });
    })
});


