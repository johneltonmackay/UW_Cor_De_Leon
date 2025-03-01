/**
 * Copyright (c) 1998-2018 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(
	[
		'N/search', 'N/runtime', 'N/format', 'N/email', 'N/error', 'N/record'
	],
	/**
	 * @param {search} search
	 * @param {runtime} runtime
	 * @param {format} format
	 * @param {error} error
	 */
	function(search, runtime, format, email, error, record) {
		var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;

		/**
		 * Evaluate if the given string or object value is empty, null or undefined.
		 * @param {String} stValue - string or object to evaluate
		 * @returns {Boolean} - true if empty/null/undefined, false if not
		 * @author mmeremilla
		 * @memberOf NSUtil
		 */
		NSUtil.isEmpty = function(stValue) {
			return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v) {
				for (var k in v)
					return false;
				return true;
			})(stValue)));
		};

		/**
		 * Evaluate if the given string is an element of the array, using reverse looping
		 * @param {String} stValue - String value to find in the array
		 * @param {String[]} arrValue - Array to be check for String value
		 * @returns {Boolean} - true if string is an element of the array, false if not
		 * @memberOf NSUtil
		 */
		NSUtil.inArray = function(stValue, arrValue) {
			for (var i = arrValue.length - 1; i >= 0; i--) {
				if (stValue == arrValue[i]) {
					break;
				}
			}
			return (i > -1);
		};

		/**
		 * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
		 * @param {String} stValue - any string
		 * @returns {Number} - an integer
		 * @author jsalcedo
		 * revision: gmanarang - added parameter on parseInt to ensure decimal as base for conversion 
		 */
		NSUtil.forceInt = function(stValue) {
			var intValue = parseInt(stValue, 10);

			if (isNaN(intValue) || (stValue == Infinity)) {
				return 0;
			}

			return intValue;
		};

		/**
		 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
		 * @param {String} stValue - any string
		 * @returns {Number} - a floating point number
		 * @author jsalcedo
		 */
		NSUtil.forceFloat = function(stValue) {
			var flValue = parseFloat(stValue);

			if (isNaN(flValue) || (stValue == Infinity)) {
				return 0.00;
			}

			return flValue;
		};

		/**
		 * Removes duplicate values from an array
		 * @param {Object[]} arrValue - any array
		 * @returns {Object[]} - array without duplicate values
		 */
		NSUtil.removeDuplicate = function(arrValue) {
			if ((arrValue === '') //Strict checking for this part to properly evaluate integer value.
				||
				(arrValue == null) || (arrValue == undefined)) {
				return arrValue;
			}

			var arrNewValue = new Array();

			o: for (var i = 0, n = arrValue.length; i < n; i++) {
				for (var x = 0, y = arrNewValue.length; x < y; x++) {
					if (arrNewValue[x] == arrValue[i]) {
						continue o;
					}
				}

				arrNewValue[arrNewValue.length] = arrValue[i];
			}

			return arrNewValue;
		};

		/**
		 * Replaces the character based on the position defined (0-based index)
		 * @param {String} stValue - any string
		 * @param {Number} intPos - index/position of the character to be replaced
		 * @param {String} stReplacement - any string to replace the character in the intPos
		 * @returns {String} - new value
		 * @author jsalcedo
		 *
		 * Example: replaceCharAt('hello', 0, 'X'); //"Xello"
		 */
		NSUtil.replaceCharAt = function(stValue, intPos, stReplacement) {
			return stValue.substr(0, intPos) + stReplacement + stValue.substr(intPos + 1);
		};

		/**
		 * Inserts string to the position defined (0-based index)
		 * @param {String} stValue - any string
		 * @param {Number} intPos - index of the character to be replaced
		 * @param {String} stInsert - any string to insert
		 * @returns {String} - new value
		 * @author jsalcedo
		 *
		 * Example: insertCharAt('hello', 0, 'X'); //"Xhello"
		 */
		NSUtil.insertStringAt = function(stValue, intPos, stInsert) {
			return (
				[
					stValue.slice(0, intPos), stInsert, stValue.slice(intPos)
				].join(''));
		};

		/**
		 * Round off floating number and appends it with currency symbol
		 * @param {Number} flValue - a floating number
		 * @param {String} stCurrencySymbol - currency symbol
		 * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
		 * @returns {String} - formatted value
		 * @author redelacruz
		 */
		NSUtil.formatCurrency = function(flValue, stCurrencySymbol, intDecimalPrecision) {
			var flAmount = flValue;

			if (typeof(flValue) != 'number') {
				flAmount = parseFloat(flValue);
			}

			var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
			arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

			return stCurrencySymbol + arrDigits.join(".");
		};

		/**
		 * Round off floating number and appends it with percent symbol
		 * @param {Number} flValue - a floating number
		 * @param {String} stPercentSymbol - percent symbol
		 * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
		 * @returns {String} - formatted value
		 * @author redelacruz
		 */
		NSUtil.formatPercent = function(flValue, stPercentSymbol, intDecimalPrecision) {
			var flAmount = flValue;

			if (typeof(flValue) != 'number') {
				flAmount = parseFloat(flValue);
			}

			var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
			arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

			return arrDigits.join(".") + stPercentSymbol;
		};

		/**
		 * Round decimal number
		 * @param {Number} flDecimalNumber - decimal number value
		 * @param {Number} intDecimalPlace - decimal places
		 *
		 * @returns {Number} - a floating point number value
		 * @author memeremilla and lochengco
		 */
		NSUtil.roundDecimalAmount = function(flDecimalNumber, intDecimalPlace) {
			//this is to make sure the rounding off is correct even if the decimal is equal to -0.995
			var bNegate = false;
			if (flDecimalNumber < 0) {
				flDecimalNumber = Math.abs(flDecimalNumber);
				bNegate = true;
			}

			var flReturn = 0.00;
			intDecimalPlace = (intDecimalPlace == null || intDecimalPlace == '') ? 0 : intDecimalPlace;

			var intMultiplierDivisor = Math.pow(10, intDecimalPlace);
			flReturn = Math.round((parseFloat(flDecimalNumber) * intMultiplierDivisor)) / intMultiplierDivisor;
			flReturn = (bNegate) ? (flReturn * -1) : flReturn;

			return flReturn.toFixed(intDecimalPlace);
		};

		/**
		 * Returns the difference between 2 dates based on time type
		 * @param {Date} stStartDate - Start Date
		 * @param {Date} stEndDate - End Date
		 * @param {String} stTime - 'D' = Days, 'HR' = Hours, 'MI' = Minutes, 'SS' = Seconds
		 * @returns {Number} - (floating point number) difference in days, hours, minutes, or seconds
		 * @author jsalcedo
		 */
		NSUtil.getTimeBetween = function(dtStartDate, dtEndDate, stTime) {
			// The number of milliseconds in one time unit
			var intOneTimeUnit = 1;

			switch (stTime) {
				case 'D':
					intOneTimeUnit *= 24;
				case 'HR':
					intOneTimeUnit *= 60;
				case 'MI':
					intOneTimeUnit *= 60;
				case 'SS':
					intOneTimeUnit *= 1000;
			}

			// Convert both dates to milliseconds
			var intStartDate = dtStartDate.getTime();
			var intEndDate = dtEndDate.getTime();

			// Calculate the difference in milliseconds
			var intDifference = intEndDate - intStartDate;

			// Convert back to time units and return
			return Math.round(intDifference / intOneTimeUnit);
		};

		/**
		 * Return a valid filename
		 *
		 * @param {String} stFileName
		 * @returns {String} sanitized filename
		 */
		NSUtil.sanitizeFilename = function(stFileName) {
			var fname = stFileName || 'SampleFileName-' + (new Date()).getTime();
			return fname.replace(/[^a-z0-9]/gi, '_');
		};

		/**
		 * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
		 * @param {String} stRecordType - record type of the item
		 * @return {String} stRecordTypeInLowerCase - record type internal id
		 * @memberOf NSUtil
		 */
		NSUtil.toItemInternalId = function(stRecordType) {
			if (!stRecordType) {
				var objError = error.create({
					name: '10003',
					message: 'Item record type should not be empty.',
					notifyOff: false
				});
				throw objError;
			}

			var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();

			switch (stRecordTypeInLowerCase) {
				case 'invtpart':
					return record.Type.INVENTORY_ITEM;
				case 'description':
					return record.Type.DESCRIPTION_ITEM;
				case 'assembly':
					return record.Type.ASSEMBLY_ITEM;
				case 'discount':
					return record.Type.DISCOUNT_ITEM;
				case 'group':
					return record.Type.ITEM_GROUP;
				case 'markup':
					return record.Type.MARKUP_ITEM;
				case 'noninvtpart':
					return record.Type.NON_INVENTORY_ITEM;
				case 'othcharge':
					return record.Type.OTHER_CHARGE_ITEM;
				case 'payment':
					return record.Type.PAYMENT_ITEM;
				case 'service':
					return record.Type.SERVICE_ITEM;
				case 'subtotal':
					return record.Type.SUBTOTAL_ITEM;
				case 'giftcert':
					return record.Type.GIFT_CERTIFICATE_ITEM;
				case 'dwnlditem':
					return record.Type.DOWNLOAD_ITEM;
				case 'kit':
					return record.Type.KIT_ITEM;
				default:
					return stRecordTypeInLowerCase;
			}
		};


		/**
		 * Determine whether the posting period for a given date is closed or not
		 * @param {String} stDate - date to search for posting period
		 * @returns {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
		 * @author redelacruz
		 */
		NSUtil.isClosedDatePostingPeriod = function(stDate) {
			var bIsClosed = true;

			var objPdSearch = search.create({
				type: 'accountingperiod',
				filters: [
					[
						'startdate', 'onorbefore', stDate
					], 'AND', [
						'enddate', 'onorafter', stDate
					], 'AND', [
						'isyear', 'is', 'F'
					], 'AND', [
						'isquarter', 'is', 'F'
					], 'AND', [
						'closed', 'is', 'F'
					], 'AND', [
						'alllocked', 'is', 'F'
					]
				],
				columns: [
					'periodname'
				]
			});

			objPdSearch.run().each(function(objResult) {
				bIsClosed = false;
				return false;
			});

			return bIsClosed;
		};

		/**
		 * Determine whether the posting period is closed or not
		 * @param {String} stPeriodName - name of posting period to search
		 * @returns {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
		 * @author redelacruz
		 */
		NSUtil.isClosedPostingPeriod = function(stPeriodName) {
			var bIsClosed = true;

			var objPdSearch = search.create({
				type: 'accountingperiod',
				filters: [
					[
						'periodname', 'is', stPeriodName
					], 'AND', [
						'isyear', 'is', 'F'
					], 'AND', [
						'isquarter', 'is', 'F'
					], 'AND', [
						'closed', 'is', 'F'
					], 'AND', [
						'alllocked', 'is', 'F'
					]
				],
				columns: [
					'periodname'
				]
			});

			objPdSearch.run().each(function(objResult) {
				bIsClosed = false;
				return false;
			});

			return bIsClosed;
		};

		/**
		 * Get the item price using the price level
		 * @param {String} stItemId - item internal id
		 * @param {String} stPriceLevel - price level internal id
		 * @returns {Object} the price of the item at the given price level
		 */
		NSUtil.getItemPrice = function(stItemId, stPriceLevel) {
			if (stPriceLevel == '1') {
				return search.lookupFields({
					type: 'item',
					id: stItemId,
					columns: 'baseprice'
				});
			} else {
				var objItemSearch = search.create({
					type: 'employee',
					filters: [
						[
							'isinactive', 'is', 'F'
						], 'AND', [
							'internalid', 'is', stItemId
						]
					],
					columns: [
						'otherprices'
					]
				});

				var stId = null;
				objItemSearch.run().each(function(objResult) {
					stId = objResult.getValue('price' + stPriceLevel);
					return false;
				});
				return stId;
			}
		};

		/**
		 * Get all of the results from the search even if the results are more than 1000.
		 * @param {String} stRecordType - the record type where the search will be executed.
		 * @param {String} stSearchId - the search id of the saved search that will be used.
		 * @param {nlobjSearchFilter[]} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
		 * @param {nlobjSearchColumn[]} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
		 * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
		 * @author memeremilla - initial version
		 * @author gmanarang - used concat when combining the search result
		 */
		NSUtil.search = function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
			if (stRecordType == null && stSearchId == null) {
				error.create({
					name: 'SSS_MISSING_REQD_ARGUMENT',
					message: 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.',
					notifyOff: false
				});
			}

			var arrReturnSearchResults = new Array();
			var objSavedSearch;

			var maxResults = 1000;

			if (stSearchId != null) {
				objSavedSearch = search.load({
					id: stSearchId
				});

				// add search filter if one is passed
				if (arrSearchFilter != null) {
					if (arrSearchFilter[0] instanceof Array || (typeof arrSearchFilter[0] == 'string')) {
						objSavedSearch.filterExpression = objSavedSearch.filterExpression.concat(arrSearchFilter);
					} else {
						objSavedSearch.filters = objSavedSearch.filters.concat(arrSearchFilter);
					}
				}

				// add search column if one is passed
				if (arrSearchColumn != null) {
					objSavedSearch.columns = objSavedSearch.columns.concat(arrSearchColumn);
				}
			} else {
				objSavedSearch = search.create({
					type: stRecordType
				});

				// add search filter if one is passed
				if (arrSearchFilter != null) {
					if (arrSearchFilter[0] instanceof Array || (typeof arrSearchFilter[0] == 'string')) {
						objSavedSearch.filterExpression = arrSearchFilter;
					} else {
						objSavedSearch.filters = arrSearchFilter;
					}
				}

				// add search column if one is passed
				if (arrSearchColumn != null) {
					objSavedSearch.columns = arrSearchColumn;
				}
			}

			var objResultset = objSavedSearch.run();
			var intSearchIndex = 0;
			var arrResultSlice = null;
			do {
				arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + maxResults);
				if (arrResultSlice == null) {
					break;
				}

				arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
				intSearchIndex = arrReturnSearchResults.length;
			}
			while (arrResultSlice.length >= maxResults);

			return arrReturnSearchResults;
		};

		/**
		 * Send email based on role.
		 * 
		 * Prerequisite:
		 * 		- NSUtil.search
		 * 
		 * @param {String} stRoleId - Role Id
		 * @param {String} stAuthor - Author
		 * @param {String} stCc - Cc
		 * @param {String} stBcc - Bcc
		 * @param {String} stSubject - Subject
		 * @param {String} stBody - Body
		 * @param {Object} objFileAttachmentsstRecordId - File object to be attached
		 * @param {Object} objRelatedRecords - Object that contains key/value pairs to associate 
		 * the Message record with related records (including custom records).
		 * See the relatedRecords table for more information
		 * @param {Boolean} bIsPromise - Use email.send or email.send.promise
		 * @author memeremilla
		 * @memberOf NSUtil
		 */
		NSUtil.sendEmailBasedOnRole = function(stRoleId, stAuthor, stCc, stBcc, stSubject, stBody, objFileAttachments, objRelatedRecords, bIsPromise) {
			var arrFilters = [];
			//just to limit the number of search, only filter using zip code
			arrFilters.push(search.createFilter({
				name: 'role',
				operator: search.Operator.ANYOF,
				values: stRoleId
			}));

			var arrColumns = [];
			arrColumns.push(search.createColumn({
				name: 'entityid'
			}));

			var arrSearchResults = NSUtil.search('employee', null, arrFilters, arrColumns);
			if (arrSearchResults) {
				var arrEmpIds = []
				for (var i = 0; i < arrSearchResults.length; i++) {
					arrEmpIds.push(arrSearchResults[i].id);
				}

				if (bIsPromise)
					email.send.promise({
						author: stAuthor,
						recipients: arrEmpIds,
						subject: stSubject,
						body: stBody,
						attachments: objFileAttachments,
						relatedRecords: objRelatedRecords
					});
				else email.send({
					author: stAuthor,
					recipients: arrEmpIds,
					subject: stSubject,
					body: stBody,
					attachments: objFileAttachments,
					relatedRecords: objRelatedRecords
				});
			}
		}
		/**
		 * Search Array and return an object
		 * @param {Object} option - search options similar to
		 * @author memeremilla
		 * @memberOf NSUtil
		 */
		NSUtil.searchArray = function(nameKey, value, myArray) {
			for (var i = 0; i < myArray.length; i++) {
				if (myArray[i][nameKey] === value) {
					return myArray[i];
				}
			}
			return null;
		};

		/**
		 * Add Trailing Characters - FILE FORMATTING
		 * @param text
		 * @param size
		 * @param char
		 * @author mjpascual
		 * @memberOf NSUtil
		 */
		NSUtil.addTrailingChar = function(text, size, char) {
			var s = '' + text + '';
			while (s.length < size)
				s = s + char;
			return s;
		};

		/**
		 * Add Leading Characters - FILE FORMATTING
		 * @param text
		 * @param size
		 * @param char
		 * @author mjpascual
		 * @memberOf NSUtil
		 */
		NSUtil.addLeadingChar = function(text, size, char) {
			var s = '' + text + '';
			while (s.length < size)
				s = char + s;
			return s;
		};

		/**
		 * Overlay error object to a friendly display format
		 * @param error.UserEventError
		 * 	var errorObj = error.create({
		 *		name: 'MY_CODE',
		 *		message: 'my error details',
		 *		notifyOff: false
		 *	});
		 * @author krgeron
		 * @memberOf NSUtil
		 * 
		 */
		NSUtil.overlayErrorMsg = function(errorObj) {
			if (errorObj) {
				if (errorObj.name && errorObj.message) {
					return ' <b>' + errorObj.name + ':</b>' + '<p>' + errorObj.message + '</p>';
				}
			} else {
				return errorObj;
			}
		};

		/**
		 * Function to load environment settings.
		 * Config name (which is the record name) can be optionally passed if there is specific setting to be retrieved.
		 * If no config name, the first record that is retrieved will be used.
		 * 
		 * @param stConfigName - just in case there is specific setting to be retrieved. This is the name of the record.
		 * 
		 * @return objEnum - Enum Object
		 * 
		 * @author memeremilla
		 * @memberOf NSUtil
		 * 
		 */
		NSUtil.loadEnvironmentSettings = function(stConfigName) {
			return NSUtil.loadEnvironmentSettings_('customrecord_p_envi_settings', 'custrecord_p_envi_settings_config', stConfigName);
		}

		/**
		 * Function to load environment settings.
		 * Custom record type and its field id where the config value will be retrieved are mandatory.
		 * Config name (which is the record name) can be optionally passed if there is specific setting to be retrieved.
		 * If no config name, the first record that is retrieved will be used.
		 * 
		 * @param stEnviSettingRecordType - record type of the custom record for environment setting.
		 * @param stEnviSettingRecordFieldId - field id in the custom record where the config value will be retrieved.
		 * @param stConfigName - just in case there is specific setting to be retrieved. This is the name of the record.
		 * 
		 * @return objEnum - Enum Object
		 * 
		 * @author memeremilla
		 * @memberOf NSUtil
		 * 
		 */
		NSUtil.loadEnvironmentSettings_ = function(stEnviSettingRecordType, stEnviSettingRecordFieldId, stConfigName) {
			if (stEnviSettingRecordType == null && stEnviSettingRecordFieldId == null) {
				error.create({
					name: 'SSS_MISSING_REQD_ARGUMENT',
					message: 'search: Missing a required argument. The stEnviSettingRecordType and stEnviSettingRecordFieldId should be provided.',
					notifyOff: false
				});
			}

			var objFileSearch = null;
			if (stConfigName) {
				objFileSearch = search.create({
					type: stEnviSettingRecordType,
					filters: [
						[
							'name', 'is', stConfigName
						]
					],
					columns: [
						search.createColumn({
							name: 'internalid',
							sort: search.Sort.ASC
						}), search.createColumn({
							name: stEnviSettingRecordFieldId
						})
					]
				});
			} else {
				objFileSearch = search.create({
					type: stEnviSettingRecordType,
					columns: [
						search.createColumn({
							name: stEnviSettingRecordFieldId
						})
					]
				});
			}

			if (!objFileSearch) return null;

			var objEnum = {};
			objFileSearch.run().each(function(result) {
				var stSettings = result.getValue({
					name: stEnviSettingRecordFieldId
				});

				if (!stSettings) return false;

				stSettings = stSettings.replace(new RegExp('<BR>', 'g'), '<br>');

				var arrLines = stSettings.split('<br>');
				for (var i = 0; i < arrLines.length; i++) {
					var stLine = arrLines[i];
					if (!stLine) continue;

					var arrProp = stLine.split('=');
					//Check if length is equal to zero
					if (arrProp.length == 0) return true;
					var stProp = arrProp[0].trim();
					var stValue = '';

					if (arrProp[1]) stValue = arrProp[1].trim()

					stProp = stProp.replace(new RegExp('\'', 'g'), '');
					stProp = stProp.replace(new RegExp(']', 'g'), '');
					stProp = stProp.replace(new RegExp('\\[', 'g'), '.');

					NSUtil.defineEnumVariables(objEnum, stProp, stValue);
				}
				return true;
			});
			return objEnum;
		};

		/**
		 * Define or construct the Enum object based on propery and value.
		 * 
		 * @param objEnum - should be an object without any property and value.
		 * @param stProp - property name.
		 * @param stValue - property value.
		 * 
		 * @author memeremilla
		 * @memberOf NSUtil
		 * 
		 */
		NSUtil.defineEnumVariables = function(objEnum, stProp, stValue) {
			if (objEnum == null && stProp == null) {
				error.create({
					name: 'SSS_MISSING_REQD_ARGUMENT',
					message: 'search: Missing a required argument. The objEnum, and stProp should be provided.',
					notifyOff: false
				});
			}

			var arrNamespaces = stProp.split('.');
			var objTemp = null;
			for (var intIndex = 0; intIndex < arrNamespaces.length; intIndex++) {
				var stElement = arrNamespaces[intIndex];
				if (intIndex == 0) {
					if (!objEnum[stElement]) objEnum[stElement] = {};
					objTemp = objEnum[stElement];
				} else {
					if (intIndex + 1 != arrNamespaces.length) {
						if (!objTemp[stElement]) {
							objTemp[stElement] = {};
						}
						objTemp = objTemp[stElement];
					} else {
						var arrTemp = stValue.split(',');
						if (arrTemp.length > 1) {
							var arrValue = [];
							for (var k = 0; k < arrTemp.length; k++) {
								var stTemp = arrTemp[k];
								if (stTemp == 'null') {
									stTemp = null;
									arrTemp[k] = stTemp;
								} else if (stTemp.indexOf('.') != -1) {
									if (!isNaN(parseFloat(stTemp))) {
										stTemp = parseFloat(stTemp);
										arrTemp[k] = stTemp;
									}
								} else {
									if (!isNaN(parseInt(stTemp))) {
										stTemp = parseInt(stTemp);
										arrTemp[k] = stTemp;
									}
								}

								if (stTemp) arrValue.push(stTemp);
							}
							objTemp[stElement] = arrValue;
						} else {
							if (stValue == 'null') {
								stValue = null;
							} else if (stValue == 'true') {
								stValue = true;
							} else if (stValue == 'false') {
								stValue = false;
							} else if (stValue.indexOf('.') != -1) {
								if (!isNaN(parseFloat(stValue))) {
									stValue = parseFloat(stValue);
								}
							} else {
								if (!isNaN(parseInt(stValue))) {
									stValue = parseInt(stValue);
								}
							}
							objTemp[stElement] = stValue;
						}
					}
				}
			}
		};

		return NSUtil;
	});