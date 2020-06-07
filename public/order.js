const socket = io.connect();

let map, datasource, client, popup, searchInput, resultsPanel, searchInputLength, centerMapOnResults, routeURL;

let minSearchInputLength = 3;

let keyStrokeDelay = 150;

let places = [];
const placeList = document.querySelector("#placeList");
const submitButton = document.querySelector('#submit');
const estPriceButton = document.querySelector('#estPrice');
const distS = document.querySelector('#distS');
const esTimeS = document.querySelector('#esTimeS');
const estPriceS = document.querySelector('#estPriceS')
createMap();

function createMap() {
    map = new atlas.Map('myMap', {
        center: [-118.270293, 34.039737],
        zoom: 14,
        view: 'Auto',

        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: 'JaUXlUCKJRUn7x0r3vg2wBL71ObmwyWkPb8e1ZIYqio'
        }
    });
    map.map._canvas.style.position = "relative"

    resultsPanel = document.getElementById("results-panel");

    searchInput = document.getElementById("search-input");
    searchInput.addEventListener("keyup", searchInputKeyup);

    popup = new atlas.Popup();

    map.events.add('ready', function () {

        map.controls.add(new atlas.control.ZoomControl(), {
            position: 'top-right'
        });

        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        let searchLayer = new atlas.layer.SymbolLayer(datasource, null, {
            iconOptions: {
                image: 'pin-round-darkblue',
                anchor: 'center',
                allowOverlap: true
            }
        });
        map.layers.add(searchLayer);

        map.events.add("click", searchLayer, function (e) {
            if (e.shapes && e.shapes.length > 0) {
                showPopup(e.shapes[0]);
            }
        });
    });
    let subscriptionKeyCredential = new atlas.service.SubscriptionKeyCredential(atlas.getSubscriptionKey());
    let pipeline = atlas.service.MapsURL.newPipeline(subscriptionKeyCredential);
    routeURL = new atlas.service.RouteURL(pipeline);

}
function searchInputKeyup(e) {
    centerMapOnResults = false;
    if (searchInput.value.length >= minSearchInputLength) {
        if (e.keyCode === 13) {
            centerMapOnResults = true;
        }
        setTimeout(function () {
            if (searchInputLength == searchInput.value.length) {
                search();
            }
        }, keyStrokeDelay);
    } else {
        resultsPanel.innerHTML = '';
    }
    searchInputLength = searchInput.value.length;
}
function search() {
    datasource.clear();
    popup.close();
    resultsPanel.innerHTML = '';

    let subscriptionKeyCredential = new atlas.service.SubscriptionKeyCredential(atlas.getSubscriptionKey());

    let pipeline = atlas.service.MapsURL.newPipeline(subscriptionKeyCredential);

    let searchURL = new atlas.service.SearchURL(pipeline);

    let query = document.getElementById("search-input").value;
    searchURL.searchPOI(atlas.service.Aborter.timeout(10000), query, {
        lon: map.getCamera().center[0],
        lat: map.getCamera().center[1],
        maxFuzzyLevel: 4,
        view: 'Auto'
    }).then((results) => {
        let data = results.geojson.getFeatures();
        datasource.add(data);

        if (centerMapOnResults) {
            map.setCamera({
                bounds: data.bbox
            });
        }
        console.log(data);
        let html = [];
        for (let i = 0; i < data.features.length; i++) {
            let r = data.features[i];
            html.push('<li onclick="itemClicked(\'', r.id, '\')" onmouseover="itemHovered(\'', r.id, '\')">')
            html.push('<div class="title">');
            if (r.properties.poi && r.properties.poi.name) {
                html.push(r.properties.poi.name);
            } else {
                html.push(r.properties.address.freeformAddress);
            }
            html.push('</div><div class="info">', r.properties.type, ': ', r.properties.address.freeformAddress, '</div>');
            if (r.properties.poi) {
                if (r.properties.phone) {
                    html.push('<div class="info">phone: ', r.properties.poi.phone, '</div>');
                }
                if (r.properties.poi.url) {
                    html.push('<div class="info"><a href="http://', r.properties.poi.url, '">http://', r.properties.poi.url, '</a></div>');
                }
            }
            html.push('</li>');
            resultsPanel.innerHTML = html.join('');
        }

    });
}
function itemHovered(id) {
    let shape = datasource.getShapeById(id);
    showPopup(shape);
}
function itemClicked(id) {
    let shape = datasource.getShapeById(id);
    console.log(shape);
    let tempLi = document.createElement("li");
    tempLi.textContent = shape.data.properties.address.freeformAddress;
    placeList.appendChild(tempLi);
    places.push({
        id: shape.data.id,
        coordinates: shape.data.geometry.coordinates,
        address: shape.data.properties.address,
        name: shape.data.properties.poi.name
    })
    map.setCamera({
        center: shape.getCoordinates(),
        zoom: 17
    });
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
            })
            esTimeS.textContent = `${Math.round(totalEta / 60)} minutes`
            distS.textContent = `${Math.round(totalLength / 1609.34 * 100) / 100} miles`
            estPriceS.textContent = `$${2 + totalLength / 1609.34 * 2.5}`
            time = totalEta / 60;
            dist = totalLength / 1609.34;
            price = 2 + totalLength / 1609.34 * 2.5
        } else {
            return false;
        }
    });


}
let time;
let dist;
let price;


estPriceButton.addEventListener('click', () => { createRoute(places) });
submitButton.addEventListener('click', () => { socket.emit('clientRequest', { places: places, travelInfo: { time: time, dist: dist, price: price }, uniVal: Math.round(Math.random() * 100000) }) });
