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

    // load the geojson data onto the map
    var ftrGroup = L.geoJSON(objGeoJson, {
        style: function (feature) {
            //return {color: feature.properties.colour};
        }
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
        text: '<i class="fas fa-map-marked-alt leaflet-pm-cust-button"></i>',
        onClick: () => { setBasemap(1) }
    }, 
    {
        text: '<i class="fas fa-satellite leaflet-pm-cust-button"></i>',
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


// hide the map controls at startup
map.pm.toggleControls();
if(urlParams.has('gj')) {
    map.pm.toggleControls();
}

// setup the popup window views based on the data properties passed in
map.pm.getGeomanLayers(true).eachLayer( function (layer){
    var content = createPopupContent(layer,'view');
    var test = layer.bindPopup(content);
});

// event listener for after layers are created
map.on('pm:create', e => {  
    var layer = e.layer;
    var feature = layer.feature = layer.feature || {};

    feature.type = feature.type || "Feature";
    var props = feature.properties = feature.properties || {};
    props.data = [];
    
    var content = createPopupContent(layer,'edit');
    layer.bindPopup(content);
});


function createPopupContent(layer, type){
    var props = layer.feature.properties;
    switch(type){
        case 'edit':
            var fieldIndex = 0;
            var content = '<div class="popup-title">FEATURE DATA  <i class="fas fa-save popup-title-button" onClick="saveData('+ layer._leaflet_id +')"></i></div>';
            props.data.forEach(element => {
                content += '<div class="popup-data-row" id="popup_data_row_'+ fieldIndex +'"><input type="text" id="data_name_' + fieldIndex + '" value="' + element[0] + '" onchange="updateData('+ fieldIndex +', '+ layer._leaflet_id +')"> <input type="text" id="data_value_' + fieldIndex + '" value="' + element[1] + '" onchange="updateData('+ fieldIndex +', '+ layer._leaflet_id +')"> <i class="fas fa-minus-square popup-row-button" style="color: red;" onClick="removeData('+ fieldIndex +', '+ layer._leaflet_id +')"></i></div>';
                fieldIndex++;
            });
            content += '<div class="popup-data-row" id="popup_data_add"><input type="text" id="data_add_name"> <input type="text" id="data_add_value">  <i class="fas fa-plus-square popup-row-button" style="color: green;" onClick="addData('+ layer._leaflet_id +')"></i></div>';
            break;
        case 'view':
            var content = '<div class="popup-title">FEATURE DATA <i class="fas fa-edit popup-title-button" onClick="editData('+ layer._leaflet_id +')"></i></div><div class="popup-data-table">';
            var fieldIndex = 1;
            props.data.forEach(element => {
                content += '<div class="popup-data-row-view'+ ((fieldIndex % 2 === 0) ? ' popup-data-row-highlight': '') +'"><div class="popup-data-cell"><strong>'+ element[0] + '</strong></div> <div class="popup-data-cell" style="width:100%;">' + element[1] + '</div></div>';
                fieldIndex++;
            });
            content += "</div>";
    }
    return content;
}

function editData(layerID){
    // set the popup into edit mode
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
    var content = createPopupContent(layer,'edit');
    layer.setPopupContent(content);
}

function saveData(layerID){
    // set the popup into view mode
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
    var content = createPopupContent(layer,'view');
    layer.setPopupContent(content);
}

function addData(layerID) {
    // get data to be added
    var newName = document.querySelector('#data_add_name').value;
    var newValue = document.querySelector('#data_add_value').value;

    // add the new key/value pair to the layer data
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
    layer.feature.properties.data.push([newName , newValue]);

    // reset the popup content
    var content = createPopupContent(layer,'edit');
    layer.setPopupContent(content);
}

function removeData(index, layerID) {
    // remove the data row from the map element
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
    layer.feature.properties.data.splice(index, 1);

    // reset the popup content
    var content = createPopupContent(layer,'edit');
    layer.setPopupContent(content);
}

function updateData(index, layerID){
    // get updated values
    var newName = document.querySelector('#data_name_'+index).value;
    var newValue = document.querySelector('#data_value_'+index).value;
    var updatedData = [newName, newValue];
    
    // remove the data row from the map element
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
    layer.feature.properties.data.splice(index, 1, updatedData);

    // reset the popup content
    var content = createPopupContent(layer,'edit');
    layer.setPopupContent(content);
}