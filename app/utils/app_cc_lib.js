//-------------------------------------------------------------------
// Marbles Chaincode Library
//-------------------------------------------------------------------

module.exports = function (enrollObj, g_options, fcw, logger) {
	var marbles_chaincode = {};

	// Chaincode -------------------------------------------------------------------------------

	//check if chaincode exists
	marbles_chaincode.check_if_already_instantiated = function (options, cb) {
		console.log('');
		logger.info('Checking for chaincode...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: ['selftest']
		};
		fcw.query_chaincode(enrollObj, opts, function (err, resp) {
			if (err != null) {
				if (cb) return cb(err, resp);
			}
			else {
				if (resp.parsed == null || isNaN(resp.parsed)) {	 //if nothing is here, no chaincode
					if (cb) return cb({ error: 'chaincode not found' }, resp);
				}
				else {
					if (cb) return cb(null, resp);
				}
			}
		});
	};

	//check chaincode version
	marbles_chaincode.check_version = function (options, cb) {
		console.log('');
		logger.info('Checking chaincode and ui compatibility...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: ['marbles_ui']
		};
		fcw.query_chaincode(enrollObj, opts, function (err, resp) {
			if (err != null) {
				if (cb) return cb(err, resp);
			}
			else {
				if (resp.parsed == null) {							//if nothing is here, no chaincode
					if (cb) return cb({ error: 'chaincode not found' }, resp);
				}
				else {
					if (cb) return cb(null, resp);
				}
			}
		});
	};


	// Marbles -------------------------------------------------------------------------------

	//create a marble
	marbles_chaincode.create_a_marble = function (options, cb) {
		console.log('');
		logger.info('Creating a marble...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'init_marble',
			cc_args: [
				'm' + leftPad(Date.now() + randStr(5), 19),
				options.args.color,
				options.args.size,
				options.args.owner_id,
				options.args.auth_company
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
			if (cb) {
				if (!resp) resp = {};
				resp.id = opts.cc_args[0];			//pass marble id back
				cb(err, resp);
			}
		});
	};

	//get list of marbles
	marbles_chaincode.get_marble_list = function (options, cb) {
		console.log('');
		logger.info('Fetching marble index list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'compelte_marble_index',
			cc_args: [' ']
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get marble
	marbles_chaincode.get_marble = function (options, cb) {
		logger.info('fetching marble ' + options.marble_id + ' list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'read',
			cc_args: [options.args.marble_id]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//set marble owner
	marbles_chaincode.set_marble_owner = function (options, cb) {
		console.log('');
		logger.info('Setting marble owner...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'set_owner',
			cc_args: [
				options.args.marble_id,
				options.args.owner_id,
				options.args.auth_company
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

	//create part
	marbles_chaincode.createPart = function (options, cb) {
		console.log('');
		logger.info('Creating Vehicle...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'createPart',
			cc_args: [
				options.args.partId,
				options.args.productCode,
				options.args.dateOfManufacture,
				options.args.user
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

	//update part
	marbles_chaincode.updatePart = function (options, cb) {
		console.log('');
		logger.info('Creating Vehicle...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'updatePart',
			cc_args: [
				options.args.partId,
				options.args.vehicleId,
				options.args.dateOfDelivery,
				options.args.dateOfInstallation,
				options.args.user,
				options.args.warrantyStartDate,
				options.args.warrantyEndDate,
				options.args.ttype
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

	//create vehicle
	marbles_chaincode.createVehicle = function (options, cb) {
		console.log('');
		logger.info('Creating Vehicle...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'createVehicle',
			cc_args: [
				options.args.make,
				options.args.chassisNumber,
				options.args.vin,
				options.args.owner,
				options.args.variant,
				options.args.engine,
				options.args.gearBox,
				options.args.color,
				options.args.image
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

	//create vehicle
	marbles_chaincode.updateVehicle = function (options, cb) {
		console.log('');
		logger.info('Updating Vehicle...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'updateVehicle',
			cc_args: [
				options.args.vehicleId, 
				options.args.ttype, 
				options.args.vehicleOwner.name, options.args.vehicleOwner.phoneNumber, options.args.vehicleOwner.email, 
				options.args.dealer.name, options.args.dealer.phoneNumber, options.args.dealer.email, 
				options.args.licensePlateNumber, 
				options.args.dateofDelivery, 
				options.args.warrantyStartDate, 
				options.args.warrantyEndDate, 
				options.args.owner, 
				options.args.parts,
				options.args.serviceDone,
				options.args.serviceDescription
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};


	//get vehicle
	marbles_chaincode.getAllVehicles = function (options, cb) {
		logger.info('fetching all vehicles');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'getAllVehicles',
			cc_args: [options.args.owner]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get vehicle
	marbles_chaincode.getVehicle = function (options, cb) {
		logger.info('fetching vehicle');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'getVehicle',
			cc_args: [options.args.vehicleId]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get vehicle by vin
	marbles_chaincode.getVehicleByVIN = function (options, cb) {
		logger.info('fetching vehicle');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'getVehicleByVIN',
			cc_args: [options.args.vin]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get vehicle by chassis number
	marbles_chaincode.getVehicleByChassisNumber = function (options, cb) {
		logger.info('fetching vehicle');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'getVehicleByChassisNumber',
			cc_args: [options.args.chassisNumber]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get part
	marbles_chaincode.getPart = function (options, cb) {
		logger.info('fetching part');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'getPart',
			cc_args: [options.args.partId]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get all parts
	marbles_chaincode.getAllParts = function (options, cb) {
		logger.info('fetching all parts');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'getAllParts',
			cc_args: [""]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//delete marble
	marbles_chaincode.delete_marble = function (options, cb) {
		console.log('');
		logger.info('Deleting a marble...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'delete_marble',
			cc_args: [options.args.marble_id, options.args.auth_company],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

	//get history for key
	marbles_chaincode.get_history = function (options, cb) {
		logger.info('Getting history for...', options.args);

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'getHistory',
			cc_args: [options.args.id]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get multiple marbles/owners by start and stop ids
	marbles_chaincode.get_multiple_keys = function (options, cb) {
		logger.info('Getting marbles between ids', options.args);

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'getMarblesByRange',
			cc_args: [options.args.start_id, options.args.stop_id]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};


	// Owners -------------------------------------------------------------------------------

	//register a owner/user
	marbles_chaincode.register_owner = function (options, cb) {
		console.log('');
		logger.info('Creating a marble owner...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'init_owner',
			cc_args: [
				'o' + leftPad(Date.now() + randStr(5), 19),
				options.args.marble_owner,
				options.args.owners_company
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
			if (cb) {
				if (!resp) resp = {};
				resp.id = opts.cc_args[0];				//pass owner id back
				cb(err, resp);
			}
		});
	};

	//get a owner/user
	marbles_chaincode.get_owner = function (options, cb) {
		var full_username = build_owner_name(options.args.marble_owner, options.args.owners_company);
		console.log('');
		logger.info('Fetching owner ' + full_username + ' list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: [full_username]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get the owner list
	marbles_chaincode.get_owner_list = function (options, cb) {
		console.log('');
		logger.info('Fetching owner index list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: ['_ownerindex']
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	// disable a marble owner
	marbles_chaincode.disable_owner = function (options, cb) {
		console.log('');
		logger.info('Disabling a marble owner...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'disable_owner',
			cc_args: [
				options.args.owner_id,
				options.args.auth_company
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
			if (cb) {
				if (!resp) resp = {};
				resp.id = opts.cc_args[0];				//pass owner id back
				cb(err, resp);
			}
		});
	};

	//build full name
	marbles_chaincode.build_owner_name = function (username, company) {
		return build_owner_name(username, company);
	};


	// All ---------------------------------------------------------------------------------

	//build full name
	marbles_chaincode.read_everything = function (options, cb) {
		console.log('');
		logger.info('Fetching EVERYTHING...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'read_everything',
			cc_args: ['']
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	// get block height of the channel
	marbles_chaincode.channel_stats = function (options, cb) {
		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts
		};
		fcw.query_channel(enrollObj, opts, cb);
	};


	// Other -------------------------------------------------------------------------------

	// Format Owner's Actual Key Name
	function build_owner_name(username, company) {
		return username.toLowerCase() + '.' + company;
	}

	// random string of x length
	function randStr(length) {
		var text = '';
		var possible = 'abcdefghijkmnpqrstuvwxyz0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
		for (var i = 0; i < length; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	}

	// left pad string with "0"s
	function leftPad(str, length) {
		for (var i = str.length; i < length; i++) str = '0' + String(str);
		return str;
	}

	return marbles_chaincode;
};

