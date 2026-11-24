/* Field schema derived from "Marta Reefer Ship Particulars" (2 pages).
   Names and section order follow the supplied reference. All values start empty.
   Keep duplicate headings as distinct keys: Outreach / Max Power. */
(function(){
'use strict';
const F=(id,label)=>({id,label});
const sections=[
 {id:'identification',title:'Identification / Registration',ru:'Идентификация и регистрация',fields:[
  F('shipName',"Ship's Name"),F('shipType',"Ship's Type"),F('imo','IMO No.'),F('mmsi','MMSI'),
  F('callSign','Call Sign'),F('flag','Flag'),F('portRegistry','Port of Registry'),F('yearBuilt','Year Built'),
  F('shipyard','Shipyard'),F('hullNo','Hull No.'),F('classSociety','Class Society'),F('classNotation','Class Notation'),
  F('insurance','P&I / H&M Cover'),F('formerName','Former Name')
 ]},
 {id:'dimensions',title:'Principal Dimensions / Tonnage',ru:'Размеры и тоннаж',fields:[
  F('loa','LOA'),F('lbp','LBP'),F('breadth','Breadth'),F('depthMoulded','Depth Moulded'),
  F('grossTonnage','Gross Tonnage'),F('netTonnage','Net Tonnage'),F('displacement','Displacement'),F('lightship','Lightship'),
  F('summerDwt','Summer DWT'),F('summerDraft','Summer Draft'),F('minFreeboard','Min. Freeboard'),F('airDraft','Air Draft'),
  F('panamaTonnage','Panama Tonnage'),F('suezTonnage','Suez Tonnage')
 ]},
 {id:'cargo',title:'Cargo / Reefer',ru:'Грузовые и рефрижераторные характеристики',fields:[
  F('totalCargoVolume','Total Cargo Volume'),F('totalFloorArea','Total Floor Area'),
  F('dwccFrozen','DWCC - Frozen Fish / Meat'),F('dwccCitrus','DWCC – Citrus Fruit'),
  F('dwccBananas','DWCC - Bananas'),F('containerCapacity','Container Capacity'),
  F('coolingSystem','Cooling System'),F('refrigerant','Refrigerant'),
  F('temperatureRange','Temperature Range'),F('temperatureZones','Temperature Zones'),
  F('airChanges','Air Changes'),F('allowableLoad','Allowable Load')
 ]},
 {id:'holds',title:'Compartments Capacity and Dimensions',ru:'Трюмы и грузовые помещения',kind:'holds'},
 {id:'machinery',title:'Cargo Gear / Machinery',ru:'Грузовые механизмы и оборудование',fields:[
  F('cargoWinches','Cargo Winches'),F('cargoWinchesOutreach','Outreach (cargo winches)'),
  F('provisionalCrane','Provisional Crane (Stbd)'),F('provisionalCraneOutreach','Outreach (provisional crane)'),
  F('mainEngine','Main Engine'),F('mainEngineMaxPower','Max Power (main engine)'),
  F('auxiliaryEngines','Auxiliary Engines'),F('aeOutput','AE Output'),
  F('bowThruster','Bow Thruster'),F('emergencyGenerator','Emergency Generator'),
  F('propeller','Propeller'),F('steeringGear','Steering Gear'),
  F('shaftGenerator','Shaft Generator'),F('shaftGeneratorMaxPower','Max Power (shaft generator)')
 ]},
 {id:'speed',title:'Speed / Performance',ru:'Скорость и эксплуатационные показатели',fields:[
  F('ecoSpeed','Eco Speed'),F('maxSeaSpeed','Max Sea Speed'),
  F('continuousMaxSpeed','Continuous Max. Speed'),F('consumption','Consumption')
 ]},
 {id:'tanks',title:'Tank Capacities / Added Fields',ru:'Вместимость танков',fields:[
  F('fuelOilCapacity','Fuel Oil Capacity'),F('freshWaterCapacity','Fresh Water Capacity'),
  F('permanentBallast','Permanent Ballast'),F('mgoDoCapacity','MGO / DO Capacity'),
  F('lubricatingOilCapacity','Lubricating Oil Capacity'),F('sludgeBilgeCapacity','Sludge / Bilge tank Capacity'),
  F('reeferPlantPower','Reefer Plant Power'),F('ventilationCapacity','Ventilation Capacity')
 ]},
 {id:'owners',title:'Owner / Manager / Operator',ru:'Владелец, менеджер, оператор',fields:[
  F('shipOwner','Ship Owner'),F('manager','Manager'),F('ownerAddress','Owner Address'),F('managerAddress','Manager Address'),
  F('managerPhone','Manager Phone'),F('managerEmail','Manager E-mail'),F('operator','Operator'),
  F('operatorAddress','Operator Address'),F('operatorContact','Operator Contact'),F('operatorEmail','Operator E-mail')
 ]},
 {id:'communications',title:'Vessel Communications',ru:'Связь с судном',fields:[
  F('satPhone','Sat Phone'),F('mobilePhone','Mobile Phone'),F('starlink','Starlink'),F('iridiumLt','Iridium LT'),
  F('mainEmail','Main E-mail'),F('reserveEmail','Reserve E-mail'),F('aaic','AAIC'),F('master','Master')
 ]},
 {id:'chartering',title:'Additional Fields Recommended for Chartering',ru:'Дополнительные чартерные сведения',fields:[
  F('openPortPosition','Open Port / Position'),F('openDate','Open Date'),F('lastPort','Last Port'),
  F('nextDestinationEta','Next Destination / ETA'),F('fuelConsumptionSea','Fuel Consumption - Sea'),
  F('fuelConsumptionPort','Fuel Consumption - Port'),F('iceClass','Ice Class'),
  F('grainBaleCapacity','Grain / Bale Capacity'),F('deckHatchStrength','Deck / Hatch Strength'),
  F('maxCargoPieceDimensions','Max Cargo Piece Dimensions'),F('co2FirefightingHolds','CO2 / Fire-fighting for Holds'),
  F('foodGradeCertificates','USDA / SPS / Food Grade Certificates')
 ]}
];
const holdFields=[
 F('holdDeck','Hold / Deck'),F('cbm','CBM'),F('cbft','CBFT'),F('sqm','SQM'),
 F('height','Height'),F('length','Length'),F('width','Width'),F('hatch','Hatch')
];
window.MP_SHIP_SCHEMA={sections,holdFields};
})();