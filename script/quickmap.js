// mapbox access token
const mboxToken = 'pk.eyJ1IjoiY2FubmliYWxmbGVhIiwiYSI6ImNrb2kxdTJ4YTBpczgyd3E0NTZ6dWFlNGUifQ.9bZYJMGVe5RAunckJmTeQg';

// dictionary used to compact geoJSON output for URL encoding
const geoJSONDict = [
    ['"geometry":'                  , '_g'],
    ['"coordinates":'               , '_c'],
    ['"title":'                     , '_n'],
    ['"properties"'                 , '_r'],
    ['"tooltip":'                   , '_i'],
    ['"features":'                  , '_s'],
    ['"permanentTooltip":'          , '_m'],
    ['"type":"FeatureCollection"'   , '_e'],
    ['"type":"Feature"'             , '_f'],
    ['"type":"Polygon"'             , '_o'],
    ['"type":"LineString"'          , '_l'],
    ['"type":"Point"'               , '_p']
];

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

// setup default style
defaultStyle = {
    stroke: true,
    color: '#3388ff',
    weight: 3.0,
    opacity: 1.0,
    fill: true,
    fillColor: '#3388ff',
    fillOpacity: 0.2
}

// check to see if basemap parameter (bm) was provided
var basemapLayer;
var basemapNum;
if(urlParams.has('bm')) {
    setBasemap(parseInt(urlParams.get('bm')));
} else {
    setBasemap(1);
}

// check to see if geoJSON parameter (gj) was provided 
if(urlParams.has('gj')) {
    // decompress the JSON object
    var objGeoJSON = JSON.parse(expandGeoJSON(JSONUncrush(decodeURIComponent(urlParams.get('gj')))));

    // load the geoJSON data onto the map
    importGeoJSON(objGeoJSON);
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

// event listener for after layers are created
map.on('pm:create', e => {  
    var layer = e.layer;

    // setup geoJSON feature class
    var feature = layer.feature = layer.feature || {};
    feature.type = feature.type || "Feature";
    feature.properties = feature.properties || {};

    // special parameter for circle features (unsupported by geoJSON)
    if (layer instanceof L.Circle) {
        feature.properties.radius = layer.getRadius();
    }
});

// ************************************
// GEOJSON PROCESSING & MAPPING
// ************************************

function importGeoJSON(objGeoJSON) {
    // load the GeoJSON data onto the map
    var ftrGroup = L.geoJSON(objGeoJSON, {
        pointToLayer: (feature, latlng) => {
            // hack to be able to render circle features (not supported by geoJSON)
            if (feature.properties.radius) {
                return new L.Circle(latlng, feature.properties.radius);
            } else {
                return new L.Marker(latlng);
            }
        },
        onEachFeature: function (feature, layer) {
            // style layer (if available)
            if (feature.properties.style) {
                layer.setStyle(feature.properties.style);
            }

            // create popup windows (if available)
            var content = createPopupContent(layer);
            if(content != '') { 
                layer.bindPopup(content);
            }
            
            // create tooltips (if required)
            if (feature.properties.tooltip) {
                layer.bindTooltip(feature.properties.title, {
                    permanent: feature.properties.permanentTooltip,
                    direction: 'top'
                }).openTooltip();
            }
        }
    }).addTo(map);

    // if geometry was loaded, then fit map to bounds
    map.fitBounds(ftrGroup.getBounds().pad(0.2));
}

// compact geoJSON based on a predefined dictionary
function compactGeoJSON(strJSON) {
    var compactedString = strJSON;
    geoJSONDict.forEach((pair) => {
        compactedString = compactedString.replaceAll(pair[0], pair[1]);
    });
    return compactedString;
}

// expand geoJSON based on a predefined dictionary
function expandGeoJSON(strJSON) {
    var expandedString = strJSON;
    geoJSONDict.forEach((pair) => {
        expandedString = expandedString.replaceAll(pair[1], pair[0])
    });
    return expandedString;
}

// ************************************
// EDIT & STYLE CONTROL
// ************************************

// add custom contorl to edit feature data and style
map.pm.Toolbar.createCustomControl({   
    name: 'Style',  
    block: 'edit', 
    className: 'leaflet-pm-icon-pen',
    title: 'Edit & Style Feature',
    onClick: () => { },  
    afterClick: (e, obj) => {
        // get all the map features
        if (obj.button._button.toggleStatus) {
            // add click listener to set tooltip text
            map.pm.getGeomanLayers().forEach( (layer) => {
                layer.on('click', addEditPopup);
            });
        } else {
            map.pm.getGeomanLayers().forEach( (layer) => {
                // remove click listener to set tooltip text
                layer.off('click', addEditPopup);

                // unbind the popups and reconstruct
                layer.closePopup().unbindPopup();

                // add information popup
                var content = createPopupContent(layer);
                if(content != '') { 
                    layer.bindPopup(content);
                }
            });
        }
    }
}); 

// function to create the popup UI for viewing layer data
function createPopupContent(layer){
    var props = layer.feature.properties;
    var content = '';

    // display title
    if (props.title) {
        content += '<div class="popup-title">' + props.title + '</div>';
    }

    // display description
    if (props.description) {
        content += '<div class="popup-description">' + props.description + '</div>';
    }

    // display data table
    if (props.data && props.data.length > 0) {
        if (props.description) {
            content += '<div class="popup-line"></div><div class="popup-data-title">ITEM DATA</div>';
        }
        content += '<table class="popup-view-table">';
        var fieldIndex = 1;
        props.data.forEach(element => {
            content += '<tr><td class="popup-view-table-keys"><strong>'+ element[0] + '</strong></td><td>' + element[1] + '</td></tr>';
            fieldIndex++;
        });
        content += "</table>";
    }

    // return the popup content
    return content;
}

// event listener function for adding tooltips
function addEditPopup(e) {
    var layer = e.target;

    // build the popup tabbed menu
    var content = '<div class="tab-container">';
    content += '<input class="tab-button" type="radio" id="tab1" name="tab" checked><label for="tab1" class="tab-label"><i class="fas fa-paint-roller"></i> Style</label>';
    content += '<input class="tab-button" type="radio" id="tab2" name="tab"><label for="tab2" class="tab-label"><i class="fas fa-tag"></i> Label</label>';
    content += '<input class="tab-button" type="radio" id="tab3" name="tab"><label for="tab3" class="tab-label"><i class="fas fa-table"></i> Data</label>';
    content += '<div class="line"></div>';
    content += '<div class="content-container">';

    // build the styling parameters
    var featureStyle = layer.feature.properties.style;
    if (featureStyle) {
        var layStyle = {
            stroke: (featureStyle.hasOwnProperty('stroke') ? featureStyle.stroke : defaultStyle.stroke),
            color: featureStyle.color || defaultStyle.color,
            weight: featureStyle.weight || defaultStyle.weight,
            opacity: featureStyle.opacity || defaultStyle.opacity,
            fill: (featureStyle.hasOwnProperty('fill') ? featureStyle.fill : defaultStyle.fill),
            fillColor: featureStyle.fillColor || defaultStyle.fillColor,
            fillOpacity: featureStyle.fillOpacity || defaultStyle.fillOpacity
        }
    } else {
        var layStyle = defaultStyle;
    }

    // build the styling tab
    console.log(layStyle);
    content += '<div class="content" id="c1">';
    content += '<div class="popup-title">CHANGE STYLE</div>';
    content += '<table id="popup_style_table" class="popup-edit-table" data-layer="'+ layer._leaflet_id +'">';
    content += '<tr><td>Stroke:</td><td><input type="checkbox"' + (layStyle.stroke ? ' checked ' : ' ') + 'id="stroke" onchange="updateStyle(event)"></td></tr>';
    content += '<tr><td>Stroke colour:</td><td><input class="popup-edit-colour" type="color" id="color" value="' + layStyle.color + '" onchange="updateStyle(event)"></td></tr>';
    content += '<tr><td>Stroke weight:</td><td><input class="popup-edit-number" type="number" min="0" max="10" id="weight" value="' + layStyle.weight + '" onchange="updateStyle(event)"> px</td></tr>';
    content += '<tr><td>Stroke opacity:</td><td><input class="popup-edit-number" type="number" min="0" max="1" step="0.1" id="opacity" value="' + layStyle.opacity + '" onchange="updateStyle(event)"></td></tr>';
    content += '<tr><td>Fill:</td><td><input type="checkbox"' + (layStyle.fill ? ' checked ' : ' ') + 'id="fill" onchange="updateStyle(event)"></td></tr>';
    content += '<tr><td>Fill colour:</td><td><input class="popup-edit-colour" type="color" id="fillColor" value="' + layStyle.fillColor + '" onchange="updateStyle(event)"></td></tr>';
    content += '<tr><td>Fill opacity:</td><td><input class="popup-edit-number" type="number" min="0" max="1" step="0.1" id="fillOpacity" value="' + layStyle.fillOpacity + '" onchange="updateStyle(event)"></td></tr>';
    content += '</tr></table>';
    content += '</div>';

    // build the tooltip/label tab
    var title = layer.feature.properties.title || '';
    var description = layer.feature.properties.description || '';
    var tooltip = layer.feature.properties.tooltip || false;
    var permanentTooltip = layer.feature.properties.permanentTooltip || false;
    content += '<div class="content" id="c2">';
    content += '<div class="popup-title">ADD LABELS</div>';
    content += '<table id="popup_label_table" class="popup-edit-table" data-layer="'+ layer._leaflet_id +'">';
    content += '<tr><td>Title:</td></tr>'
    content += '<tr><td><input class="popup-edit-text" type="text" id="title" value="' + title + '" onchange="updateLabel(event)"></td></tr>'
    content += '<tr><td>Description:</td></tr>';
    content += '<tr><td><textarea class="popup-edit-text" id="description" rows="3" onchange="updateLabel(event)">' + description + '</textarea></td></tr>'
    content += '<tr><td><input type="checkbox"' + (tooltip ? ' checked ' : ' ') + ((title === '') ? ' disabled ' : ' ') + 'id="tooltip" style="width: unset;" onchange="updateLabel(event)"> <label for="tooltip">Show tooltip</label></td></tr>';
    content += '<tr><td><input type="checkbox"' + (permanentTooltip ? ' checked ' : ' ') + (tooltip ? ' ' : ' disabled ') + 'id="permanentTooltip" style="width: unset;" onchange="updateLabel(event)"> <label for="permanentTooltip">Make tooltip permanent</label></td></tr>';
    content += '</tr></table>';
    content += '</div>';

    // build the data tab
    var props = layer.feature.properties;
    content += '<div class="content" id="c3">';
    content += '<div class="popup-title">ADD DATA</div>';
    content += '<table id="popup_data_table" class="popup-edit-table" data-layer="'+ layer._leaflet_id +'">';
    if (props.data) {
        var fieldIndex = 0;
        props.data.forEach(element => {
            content += '<tr>';
            content += '<td><input class="popup-edit-text" type="text" value="' + element[0] + '" data-type="key" onchange="updateData(event)"></td>';
            content += '<td><input class="popup-edit-text" type="text" value="' + element[1] + '" data-type="value" onchange="updateData(event)"></td>';
            content += '<td class="popup-edit-button-column"><i class="fas fa-minus-square popup-edit-button-delete" onClick="removeData(event)"></i></td>';
            content += '</tr>';
            fieldIndex++;
        });
    }
    content += '<tr>';
    content += '<td><input class="popup-edit-text" type="text" id="data_add_key"></td>';
    content += '<td><input class="popup-edit-text" type="text" id="data_add_value"></td>';
    content += '<td class="popup-edit-button-column"><i class="fas fa-plus-square popup-edit-button-add" onClick="addData(event)"></i></td>';
    content += '</tr></table>';
    content += '</div>';

    // add closing tags
    content += '</div></div>';

    // popup options
    const popupOpts = {
        maxWidth: 500
    }

    // attach the popup to the layer
    layer.bindPopup(content, popupOpts).openPopup();
}

// function to update style settings
function updateStyle(event) {
    // get the style option that was changed
    var styleInput = event.target;
    switch (styleInput.type) {
        case 'checkbox':
            var styleValue = styleInput.checked;
            break;
        case 'number':
            var styleValue = parseFloat(styleInput.value);
            break;
        case 'text':
            var styleValue = styleInput.value;
            break;
        case 'color':
            var styleValue = styleInput.value;
            break;
    }

    // get the layer stylilng option
    var layStyle = {}
    layStyle[styleInput.id] = styleValue;

    // get the layer ID
    var styleTable = document.getElementById('popup_style_table');
    var layerID = styleTable.dataset.layer;

    // get the layer to style
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);

    // set layer styles
    layer.setStyle(layStyle);
    if (styleValue === defaultStyle[styleInput.id]) {
        delete layer.feature.properties.style[styleInput.id];
        if (Object.keys(layer.feature.properties.style).length == 0) {
            delete layer.feature.properties['style'];
        }
    } else {
        layer.feature.properties.style = layer.feature.properties.style || {};
        layer.feature.properties.style[styleInput.id] = styleValue;
    }
    console.log(layer.feature.properties);
}

// function for adding, deleting and updating title, description and tooltip
function updateLabel(event) {
    // get the layer ID
    var styleTable = document.getElementById('popup_style_table');
    var layerID = styleTable.dataset.layer;

    // get the layer to style
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);

    // get the label input that was changed
    var labelInput = event.target;
    switch (labelInput.id) {
        case 'tooltip':
            if (labelInput.checked) {
                // create a new tooltip
                layer.bindTooltip(layer.feature.properties.title, {
                    permanent: false,
                    direction: 'top'
                }).openTooltip();
                
                // set the tooltip
                layer.feature.properties.tooltip = true;

                // enable the permanent tooltip checkbox
                document.getElementById('permanentTooltip').disabled = false;
            } else {
                // remove the tooltip
                layer.unbindTooltip().closeTooltip();
                
                // reset the permanent tootlip checkbox
                document.getElementById('permanentTooltip').checked = false;
                document.getElementById('permanentTooltip').disabled = true;
                
                // rermove the properties (for space)
                delete layer.feature.properties.tooltip;
                delete layer.feature.properties.permanentTooltip;
            }

            break;
        case 'permanentTooltip':
            // set layer tooltip property
            if (labelInput.checked) {
                layer.feature.properties.permanentTooltip = true;
            } else {
                delete layer.feature.properties.permanentTooltip;
            }

            // unbinde and reconstruct the tooltip
            layer.unbindTooltip().closeTooltip();
            layer.bindTooltip(layer.feature.properties.title, {
                permanent: labelInput.checked,
                direction: 'top'
            }).openTooltip();

            break;
        case 'title':
            var labelValue = labelInput.value;

            if (labelValue != '') {
                // update existing tooltip (if exists)
                if (layer.getTooltip()) {
                    layer.setTooltipContent(labelValue).openTooltip();
                }

                // set the layer title value
                layer.feature.properties.title = labelValue;

                // enable the tooltip checkbox
                document.getElementById('tooltip').disabled = false;
            } else {
                // unbind existing tooltip (if exists)
                layer.unbindTooltip().closeTooltip();

                // disable the tooltip checkboxes
                document.getElementById('tooltip').checked = false;
                document.getElementById('tooltip').disabled = true;
                document.getElementById('permanentTooltip').checked = false;
                document.getElementById('permanentTooltip').disabled = true;
                delete layer.feature.properties.tooltip;
                delete layer.feature.properties.permanentTooltip;
                
                // rermove the properties (for space)
                delete layer.feature.properties.title;
            }
            
            break;
        case 'description':
            var labelValue = labelInput.value;
            
            if (labelValue != '') {
                layer.feature.properties.description = labelInput.value;
            } else {
                // rermove the properties (for space)
                delete layer.feature.properties.description;
            }
            break;
    }
}

// functions for Adding, deleting and updating data
function addData(event) {
    // get data to be added
    var newKey = document.getElementById('data_add_key').value;
    var newValue = document.getElementById('data_add_value').value;

    if (newKey != '') {
        // get the layer ID
        var dataTable = document.getElementById('popup_data_table');
        var layerID = dataTable.dataset.layer;

        // add the new key/value pair to the layer data
        var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
        layer.feature.properties.data = layer.feature.properties.data || [];
        layer.feature.properties.data.push([newKey , newValue]);

        // add the data row to the popup table
        var addButton = event.target;
        var addRowIndex = addButton.parentNode.parentNode.rowIndex;
        var newDataRow = dataTable.insertRow(addRowIndex);
        var newCellKey = newDataRow.insertCell(0);
        var newCellValue = newDataRow.insertCell(1);
        var newCellButton = newDataRow.insertCell(2);
        newCellButton.className = 'popup-edit-button-column';
        newCellKey.innerHTML = '<input class="popup-edit-text" type="text" value="' + newKey + '" data-type="key" onchange="updateData(event)">';
        newCellValue.innerHTML = '<input class="popup-edit-text" type="text" value="' + newValue + '" data-type="value" onchange="updateData(event)">';
        newCellButton.innerHTML = '<i class="fas fa-minus-square popup-edit-button-delete" onClick="removeData(event)"></i>';

        // clear the data input fields
        document.getElementById('data_add_key').value = '';
        document.getElementById('data_add_value').value = '';
    }
    console.log(layer.feature.properties);
}

function removeData(event) {
    // get the layer ID
    var dataTable = document.getElementById('popup_data_table');
    var layerID = dataTable.dataset.layer;
    
    // remove the data row from the popup
    var delButton = event.target;
    var delRowIndex = delButton.parentNode.parentNode.rowIndex;
    dataTable.deleteRow(delRowIndex);

    // remove the data row from the map element
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);
    layer.feature.properties.data.splice(delRowIndex, 1);

    if (Object.keys(layer.feature.properties.data).length == 0) {
        delete layer.feature.properties['data'];
    }

    console.log(layer.feature.properties);
}

function updateData(event) {
    // get the layer ID
    var dataTable = document.getElementById('popup_data_table');
    var layerID = dataTable.dataset.layer;

    // remove the data row from the popup
    var dataField = event.target;
    var dataFieldType = dataField.dataset.type;
    var dataIndex = dataField.parentNode.parentNode.rowIndex;

    // remove the data row from the map element
    var layer = map.pm.getGeomanLayers(true).getLayer(layerID);

    // update the layer data
    switch (dataFieldType) {
        case 'key':
            layer.feature.properties.data[dataIndex][0] = dataField.value;
            break;
        case 'value':
            layer.feature.properties.data[dataIndex][1] = dataField.value;
            break;
    }
    
    console.log(layer.feature.properties);
}

// ************************************
// BASEMAP CONTROL
// ************************************

// add custom control to choose basemap
const bmapActions = [
    { 
        text: '<i class="fas fa-map-marked-alt leaflet-pm-cust-button"></i>',
        onClick: () => { 
            setBasemap(1);
            map.pm.Toolbar.toggleButton('Basemap', false);
         }
    }, 
    {
        text: '<i class="fas fa-satellite leaflet-pm-cust-button"></i>',
        onClick: () => { 
            setBasemap(2);
            map.pm.Toolbar.toggleButton('Basemap', false);
        }
    }
];
map.pm.Toolbar.createCustomControl({   
    name: 'Basemap',  
    block: 'custom', 
    className: 'leaflet-pm-icon-basemap',
    title: 'Change Basemap',
    actions: bmapActions
}); 

// function to set the basemap based on an id number
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

// ************************************
// DATA EXPORT CONTROL
// ************************************

// add custom control to generate and copy encoded map url
const exportActions = [
    { 
        text: '<i class="fas fa-external-link-alt leaflet-pm-cust-button"></i>',
        onClick: () => { 
            // get all the map features
            var mapLayers = map.pm.getGeomanLayers(true).toGeoJSON();
            
            // encode and compress the URL
            var encodedGJSON = JSONCrush(compactGeoJSON(JSON.stringify(mapLayers)));
            
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

            // toggle button off
            map.pm.Toolbar.toggleButton('Export', false);
        }
    },
    {
        text: '<i class="fas fa-clipboard leaflet-pm-cust-button"></i>',
        onClick: () => { 
            // get all the map features
            var mapLayers = map.pm.getGeomanLayers(true).toGeoJSON();
            
            // convert to string
            var geoJSONString = JSON.stringify(mapLayers);
            
            // copy the geojson into the clipboard
            const el = document.createElement('textarea');
            el.value = geoJSONString;
            el.setAttribute('readonly', '');
            el.style.position = 'absolute';
            el.style.left = '-9999px';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);

            // toggle button off
            map.pm.Toolbar.toggleButton('Export', false);
        }
    },
    {
        text: '<i class="fas fa-download leaflet-pm-cust-button"></i>',
        onClick: () => { 
            // get all the map features
            var mapLayers = map.pm.getGeomanLayers(true).toGeoJSON();
            
            // convert to string and prepare download file
            var dataString = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mapLayers));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute('href', dataString);
            downloadAnchorNode.setAttribute('download', 'map.json');
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            // toggle button off
            map.pm.Toolbar.toggleButton('Export', false);
        }
    }
];
map.pm.Toolbar.createCustomControl({   
    name: 'Export',  
    block: 'custom', 
    className: 'leaflet-pm-icon-export',
    title: 'Export Data',
    actions: exportActions
}); 

// ************************************
// IMPORT DATA CONTROL
// ************************************

// add custom control to import GeoJSON file/text to add to map
const importActions = [
    { 
        text: '<i class="fas fa-clipboard leaflet-pm-cust-button"></i>',
        onClick: () => { 
            var contentHTML = '<div class="popup-title">Import GeoJSON</div>';
            contentHTML += '<textarea id="geojson_data" rows="15" cols="70" style="width: 100%;"></textarea><button type="button" onClick="importData()">Import</button>';
            var importJSON = map.openModal({ 
                content: contentHTML
            });
        }
    }, 
    {
        text: '<i class="fas fa-upload leaflet-pm-cust-button"></i>',
        onClick: () => { 
            // TODO: see if there is a way to import files
            map.pm.Toolbar.toggleButton('Import', false);
        }
    }
];
map.pm.Toolbar.createCustomControl({   
    name: 'Import',  
    block: 'custom', 
    className: 'leaflet-pm-icon-import',
    title: 'Import Data',
    actions: importActions
});

function importData(){
    // get data to be added
    var objGeoJSON = JSON.parse(document.getElementById('geojson_data').value);

    // load the geojson data onto the map
    importGeoJSON(objGeoJSON);

    // close the modal window
    map.closeModal();
    map.pm.Toolbar.toggleButton('Import', false);
}

// hide the map controls at startup if there is already content (passed through URL)
if(urlParams.has('gj')) {
    map.pm.toggleControls();
}