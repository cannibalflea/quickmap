// mapbox access token
//const mboxToken = 'pk.eyJ1IjoiY2FubmliYWxmbGVhIiwiYSI6ImNrb2kxdTJ4YTBpczgyd3E0NTZ6dWFlNGUifQ.9bZYJMGVe5RAunckJmTeQg';
const mboxToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

// create map and set starting point for the map (Vancouver)
var map = L.map('maparea', {
    center: [49.2566742, -123.1740253],
    zoom: 13,
    zoomControl: false

});


// get the url parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

// get the base URL to use for future reconstruction
const baseURL = window.location.protocol + '//' + window.location.host + window.location.pathname;

// check to see if basemap parameter (bm) was provided
var basemapLayer;
var basemapNum;
if(urlParams.has('bm')) {
    setBasemap(parseInt(urlParams.get('bm')));
} else {
    setBasemap(1);
}

function setBasemap(basemapID) {
    if(basemapLayer){
        map.removeLayer(basemapLayer);
    }

    switch(basemapID){
        case 1:
            var mapboxID = 'mapbox/streets-v11';
            basemapNum = 1;
            break;
        case 2:
            var mapboxID = 'mapbox/satellite-v9';
            basemapNum = 2;
            break;
        default:
            var mapboxID = 'mapbox/streets-v11';
            basemapNum = 1;
    }

    basemapLayer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 22,
        id: mapboxID,
        tileSize: 512,
        zoomOffset: -1,
        accessToken: mboxToken
    }).addTo(map)
}

// check to see if geojson parameter (gj) was provided 
if(urlParams.has('gj')) {
    // decompress the json object
    var objGeoJson = JSON.parse(JSONUncrush(decodeURIComponent(urlParams.get('gj'))));
    console.log(objGeoJson);

    // load the geojson data onto the map
    var ftrGroup = L.geoJSON(objGeoJson, {
        style: function (feature) {
            //return {color: feature.properties.colour};
        }
    }).bindPopup(function (layer) {
        return layer.feature.properties.name;
    }).addTo(map);

    // if geometry was loaded, then fit map to bounds
    map.fitBounds(ftrGroup.getBounds().pad(0.2));
}

// add control to toggle toolbar buttons
L.easyButton('fa-cog', function(btn, map){
    map.pm.toggleControls();
}).addTo(map);


// add leaflet-geoman controls
map.pm.addControls({  
    position: 'topleft',  
    drawCircleMarker: false,  
}); 

// add custom control to generate and copy encoded map url
map.pm.Toolbar.createCustomControl({   
    name: 'Create URL',  
    block: 'custom', 
    className: 'leaflet-pm-icon-url',
    title: 'URL encode features',  
    onClick: function () {
        // get all the map features
        var mapLayers = map.pm.getGeomanLayers(true).toGeoJSON();
        
        // encode and compress the URL
        var encodedGJSON = JSONCrush(JSON.stringify(mapLayers));
        
        // copy the encoded url into the clipboard
        const el = document.createElement('textarea');
        el.value = baseURL + "?bm=" + basemapNum + "&gj=" + encodedGJSON;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
}); 

// add custom control to choose basemap
const bmapActions = [
    { 
        text: '<i class="fas fa-map-marked-alt"></i>',
        onClick: () => { setBasemap(1) }
    }, 
    {
        text: '<i class="fas fa-satellite"></i>',
        onClick: () => { setBasemap(2) }
    }
];
map.pm.Toolbar.createCustomControl({   
    name: 'Change Basemap',  
    block: 'custom', 
    className: 'leaflet-pm-icon-basemap',
    title: 'Change basemap',
    actions: bmapActions
}); 

// add custom control to add properties to the features
const propActions = ['cancel'];
map.pm.Toolbar.createCustomControl({   
    name: 'Add property',  
    block: 'custom', 
    className: 'leaflet-pm-icon-prop',
    title: 'Add property',
    actions: propActions
});

// hide the map controls at startup
map.pm.toggleControls();
if(urlParams.has('gj')) {
    map.pm.toggleControls();
}