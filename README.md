# Event Editor Table Panel 
#### Custom Plugin that enables users to split the event and assign equipment, category and reasons to the event.

------

### Influxdb Query example: 

SELECT "Site", "Area", "Line", "status","duration", "execute", "held", "idle", "stopped", "complete", "category", "reason", "equipment", "comment" FROM "Availability"  WHERE $timeFilter and ("Site" = '$Site') and ("Area" = '$Area')  and ("Line" = '$Line') 

-------

### Data format
Data MUST be formatted as a TABLE !

### Time format
Time format should be 'YYYY-MM-DD HH:mm:ss.SSS' to avoid unwanted results.