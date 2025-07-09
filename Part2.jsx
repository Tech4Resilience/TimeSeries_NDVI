// 1. Load and display the study area (Dhaka)
// -----------------------------------------
var StudyArea = table.filter(ee.Filter.eq("ADM3_EN", "Lama"));
Map.centerObject(StudyArea, 9);
Map.addLayer(StudyArea, {color: 'red'}, 'Study Area');


// -----------------------------------------
// 2. Visualize NDVI Map for last quarter 2022
// -----------------------------------------
var image2022 = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
  .filterBounds(StudyArea)
  .filterDate('2022-11-01', '2022-12-31')
  .median();

var ndvi2022 = image2022.normalizedDifference(['B5', 'B4']).rename('NDVI');

Map.addLayer(ndvi2022.clip(StudyArea), {
  min: 0,
  max: 1,
  palette: ['FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
    '74A901', '66A000', '529400', '3E8601', '207401', '056201',
    '004C00', '023B01', '012E01', '011D01', '011301']
}, 'NDVI - January 2020');



// -----------------------------------------
// 3. Load Landsat 8 TOA Collection (2022–2023)
// -----------------------------------------
var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterBounds(StudyArea)
    .filterDate('2022-01-01', '2023-12-31');

// -----------------------------------------
// 4. Function to calculate NDVI and retain date
// -----------------------------------------
var NDVI = function(image) {
  var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');
  return image.addBands(ndvi)
              .set('system:time_start', image.get('system:time_start'));
};

// -----------------------------------------
// 5. Apply NDVI function to all images
// -----------------------------------------
var ndviCollection = collection.map(NDVI).select('NDVI');

// -----------------------------------------
// 6. Create NDVI time series as FeatureCollection
// -----------------------------------------
var ndviTimeSeries = ndviCollection.map(function(image) {
  var meanNDVI = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: StudyArea.geometry(),
    scale: 1000,
    maxPixels: 1e13
  });
  
  return ee.Feature(null, {
    'date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd'),
    'NDVI': meanNDVI.get('NDVI')
  });
});

// -----------------------------------------
// 7. Display NDVI Time Series Chart
// -----------------------------------------
var chart = ui.Chart.image.series({
  imageCollection: ndviCollection,
  region: StudyArea,
  reducer: ee.Reducer.mean(),
  scale: 1000,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'NDVI Time Series (2022–2023) - Dhaka',
  vAxis: {title: 'NDVI'},
  hAxis: {title: 'Date'},
  lineWidth: 2,
  pointSize: 3
});

print(chart);

// -----------------------------------------
// 8. Export NDVI time series as CSV
// -----------------------------------------
Export.table.toDrive({
  collection: ndviTimeSeries,
  description: 'NDVI_TimeSeries_Dhaka',
  fileFormat: 'CSV'
});

