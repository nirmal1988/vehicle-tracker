/*eslint-env node */
// ==================================
// incoming messages, look for type
// ==================================
var ibc = {};
var chaincode = {};
var ibc_parts = {};
var chaincode_parts = {};
var broadcast = null;
var marbles_lib = null;
var known_height = 0;
var checkPeriodically = null;
var enrollInterval = null;

var winston = require('winston');								//logger module
var path = require('path');
var async = require("async");
var logger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.Console)({ colorize: true }),
	]
});

var helper = require(path.join(__dirname, './helper.js'))(process.env.creds_filename, logger);
var fcw = require('./fc_wrangler/index.js')({ block_delay: helper.getBlockDelay() }, logger);		//fabric client wrangler wraps the SDK

module.exports.setup = function(l_broadcast, l_marbles_lib){
	// ibc = sdk;
	// chaincode = cc;

	broadcast = l_broadcast;
	marbles_lib = l_marbles_lib;

	// --- Keep Alive  --- //
	clearInterval(enrollInterval);
	enrollInterval = setInterval(function () {					//to avoid REQUEST_TIMEOUT errors we periodically re-enroll
		let enroll_options = helper.makeEnrollmentOptions(0);
		fcw.enroll(enroll_options, function (err, enrollObj2) {
			if (err == null) {
				//marbles_lib = require(path.join(__dirname, './app_cc_lib.js'))(enrollObj2, opts, fcw, logger);
			}
		});														//this seems to be safe 3/27/2017
	}, helper.getKeepAliveMs());
};

module.exports.setupParts = function(sdk, cc){
	ibc_parts = sdk;
	chaincode_parts = cc;
};

module.exports.process_msg = function(ws, data, owner){
	const channel = helper.getChannelId();
	const first_peer = helper.getFirstPeerName(channel);
	
	var options = {
		peer_urls: [helper.getPeersUrl(first_peer)],
		ws: ws,
		endorsed_hook: endorse_hook,
		ordered_hook: orderer_hook
	};

	if(data.type == "chainstats"){
		console.log("Chainstats msg");
		//ibc.chain_stats(cb_chainstats);		
	}
	else if(data.type == "getVehicle"){
		console.log("Get vehicle", data.vehicleId);
		//chaincode.invoke.getVehicle([data.vehicleId], cb_got_vehicle);
	}
	else if(data.type == "getVehicleByChassisNumber"){
		console.log("Get vehicle", data.chassisNumber);
		//chaincode.invoke.getVehicleByChassisNumber([data.chassisNumber], cb_got_vehicleByChassisNumber);
	}
	else if(data.type == "getAllVehicles"){
		console.log("Get All Vehicles", owner);
		//chaincode.invoke.getAllVehicles([""], cb_got_allvehicles);
		marbles_lib.getAllVehicles(options, function (err, resp) {
			if (err != null) send_err(err, data);
			else {
				options.ws.send(JSON.stringify({ msg: 'allVehicles', 
				vehicles: resp.parsed.vehicles,
				state: 'finished' 
				}));
				//sendMsg({msg: "allVehicles", vehicles: JSON.parse(resp.parsed).vehicles});
			}
		});
	}
	else if(data.type == "createVehicle"){
		console.log("Create Vehicle ", data, owner);
		if(data.vehicle){			
			//chaincode.invoke.createVehicle([data.vehicle.make, data.vehicle.chassisNumber, data.vehicle.vin, owner], cb_invoked_createVehicle);				//create a new Vehicle
			options.args = {
				make: data.vehicle.make,
				chassisNumber: data.vehicle.chassisNumber,
				vin: data.vehicle.vin,
				owner: owner
			};
			marbles_lib.createVehicle(options, cb_invoked_createVehicle);	
		}
	}
	else if(data.type == "customerVehicle"){
		console.log("Get Customer Vehicle", owner);
		//chaincode.invoke.getAllVehicles([owner], cb_got_customerVehicle);
	}
	else if(data.type == "getCustomerVehicleDetails"){
		console.log("------ Get Customer Vehicle Details", data.vehicleId);
		//chaincode.invoke.getVehicle([data.vehicleId], cb_got_customerVehicleDetails);
	}
	else if(data.type == "updateVehicle"){
		console.log("Update Vehicle ", data, owner);
		if(data.vehicle){			
			// chaincode.invoke.updateVehicle([data.vehicle.vehicleId, 
			// 	data.vehicle.ttype, 
			// 	data.vehicle.owner.name, data.vehicle.owner.phoneNumber, data.vehicle.owner.email, 
			// 	data.vehicle.dealer.name, data.vehicle.dealer.phoneNumber, data.vehicle.dealer.email, 
			// 	data.vehicle.licensePlateNumber, 
			// 	data.vehicle.dateofDelivery, 
			// 	data.vehicle.warrantyStartDate, 
			// 	data.vehicle.warrantyEndDate, 
			// 	owner, 
			// 	data.vehicle.parts,
			// 	data.vehicle.serviceDone,
			// 	data.vehicle.serviceDescription
			// 	], cb_invoked_updateVehicle);				
				//update vehicle
		}
	}
	else if(data.type == "createPart"){
		console.log("Create Part ", data, owner);
		if(data.part){
			console.log('Part manufacture date:'+data.part.dateOfManufacture);
			//chaincode.invoke.createPart([data.part.partId, data.part.productCode, data.part.dateOfManufacture, owner], cb_invoked_createpart);				//create a new paper
		}
	}
	else if(data.type == "updatePart"){
		console.log("Update Part ", data, owner);
		if(data.part){
			//chaincode.invoke.updatePart([data.part.partId, data.part.vehicleId, data.part.dateOfDelivery, data.part.dateOfInstallation, owner, data.part.warrantyStartDate, data.part.warrantyEndDate, data.part.tranType], cb_invoked_updatepart);	//update part details
		}		
	}
	else if(data.type == "getPart"){
		console.log("Get Part", data.partId);
		//chaincode.invoke.getPart([data.partId], cb_got_part);
	}
	else if(data.type == "getAllParts"){
		console.log("Get All Parts", owner);
		//chaincode.invoke.getAllParts([""], cb_got_allparts);
	}
	else if(data.type == "getAllPartsForUpdateVehicle"){
		console.log("Get All Parts", owner);
		//chaincode.invoke.getAllParts([""], cb_got_allpartsForUpdateVehicle);
	}
	
	function cb_got_part(e, part){
		if(e != null){
			console.log("Get Part error", e);
		}
		else{
			sendMsg({msg: "part", part: JSON.parse(part)});
		}
	}
	
	function cb_got_allparts(e, allParts){
		if(e != null){
			console.log("Get All Parts error", e);
		}
		else{
			sendMsg({msg: "allParts", parts: JSON.parse(allParts).parts});
		}
	}

	function cb_got_allpartsForUpdateVehicle(e, allParts){
		if(e != null){
			console.log("Get All Parts error", e);
		}
		else{
			sendMsg({msg: "allPartsForUpdateVehicle", parts: JSON.parse(allParts).parts});
		}
	}
	
	function cb_got_vehicle(e, vehicle){
		if(e != null){
			console.log("Get Vehicle error", e);
		}
		else{
			sendMsg({msg: "vehicle", vehicle: JSON.parse(vehicle)});
		}
	}

	function cb_got_vehicleByChassisNumber(e, vehicle){
		if(e != null){
			console.log("Get Vehicle error", e);
		}
		else{
			sendMsg({msg: "vehicle", vehicle: JSON.parse(vehicle)});
		}
	}

	function cb_got_customerVehicleDetails(e, vehicle){
		console.log("--------------- cb_got_customerVehicleDetails");
		if(e != null){
			console.log("Get Vehicle error", e);
		}
		else{
			sendMsg({msg: "customerVehicleDetails", vehicle: JSON.parse(vehicle)});
		}
	}	

	function cb_got_allvehicles(e, resp){
		if(e != null){
			console.log("Get All Vehicles error", e);
		}
		else{
			if(resp)
				sendMsg({msg: "allVehicles", vehicles: JSON.parse(resp.parsed).vehicles});
		}
	}

	function cb_invoked_createVehicle(e, a){
		console.log("response: ", e, a);
		if(e != null){
			console.log("Invoked create vehicle error", e);
		}
		else{
			console.log("Vehicle ID #" + data.vehicle.chassisNumber)
			sendMsg({msg: "vehicleCreated", chassisNumber: data.vehicle.chassisNumber});
		}
	}

	function cb_got_customerVehicle(e, customerVehicle){
		console.log("---------------- cb_got_customerVehicle");
		if(e != null){
			console.log("Get Customer Vehicle error", e);
		}
		else{
			console.log(JSON.parse(customerVehicle).vehicles);
			sendMsg({msg: "customerVehicle", vehicles: JSON.parse(customerVehicle).vehicles});
		}
	}

	function cb_invoked_updateVehicle(e, a){
		console.log("response: ", e, a);
		if(e != null){
			console.log("Invoked update vehicle error ", e);
		}
		else{
			console.log("Vehicle ID #" + data.vehicle.chassisNumber)
			sendMsg({msg: "vehicleUpdated", chassisNumber: data.vehicle.chassisNumber});
		}
	}

	function cb_invoked_createpart(e, a){
		console.log("response: ", e, a);
		if(e != null){
			console.log("Invoked create part error", e);
		}
		else{
			console.log("part ID #" + data.part.id)
			sendMsg({msg: "partCreated", partId: data.part.id});
		}
		

	}
	function cb_invoked_updatepart(e, a){
		console.log("response: ", e, a);
		if(e != null){
			console.log("Invoked update part error", e);
		}
		else{
			console.log("part ID #" + data.part.id)
			sendMsg({msg: "partUpdated", partId: data.part.id});
		}
	}
	
	//call back for getting the blockchain stats, lets get the block height now
	var chain_stats = {};
	function cb_chainstats(e, stats){
		chain_stats = stats;
		if(stats && stats.height){
			var list = [];
			for(var i = stats.height - 1; i >= 1; i--){										//create a list of heights we need
				list.push(i);
				if(list.length >= 8) break;
			}
			list.reverse();																//flip it so order is correct in UI
			console.log(list);
			async.eachLimit(list, 1, function(key, cb) {								//iter through each one, and send it
				ibc.block_stats(key, function(e, stats){
					if(e == null){
						stats.height = key;
						sendMsg({msg: "chainstats", e: e, chainstats: chain_stats, blockstats: stats});
					}
					cb(null);
				});
			}, function() {
			});
		}
	}

	//call back for getting a block's stats, lets send the chain/block stats
	function cb_blockstats(e, stats){
		if(chain_stats.height) stats.height = chain_stats.height - 1;
		sendMsg({msg: "chainstats", e: e, chainstats: chain_stats, blockstats: stats});
	}

	//send a message, socket might be closed...
	function sendMsg(json){
		if(ws){
			try{
				ws.send(JSON.stringify(json));
			}
			catch(e){
				console.log("error ws", e);
			}
		}
	}

	// endorsement stage callback
	function endorse_hook(err) {
		if (err) sendMsg({ msg: 'tx_step', state: 'endorsing_failed' });
		else sendMsg({ msg: 'tx_step', state: 'ordering' });
	}

	// ordering stage callback
	function orderer_hook(err) {
		if (err) sendMsg({ msg: 'tx_step', state: 'ordering_failed' });
		else sendMsg({ msg: 'tx_step', state: 'committing' });
	}
};
